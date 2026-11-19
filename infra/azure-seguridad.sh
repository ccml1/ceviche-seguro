#!/usr/bin/env bash
# Capa de seguridad y monitoreo SIN costo fijo (ejecutar después de azure-setup.sh, en Azure Cloud Shell):
#
#   RG=practica-pfc APP=ceviche-seguro-cm [ALERT_EMAIL=tu@correo] bash infra/azure-seguridad.sh
#
# Qué agrega (concepto del curso → servicio de Azure):
#   1. Firewall de red / segmentación  → NSG en la subred de la BD: solo la subred de la app entra al 5432.
#   2. Gestor de secretos               → Azure Key Vault con las cadenas de conexión y el secreto JWT.
#   3. IAM (control de acceso)          → Identidad administrada de la app con el rol mínimo "Key Vault Secrets User".
#   4. Firewall del almacenamiento      → Blob Storage solo acepta tráfico desde la subred de la app (service endpoint).
#   5. Monitor                          → Application Insights conectado (autoinstrumentación) + alerta de errores 5xx.
# El WAF va en azure-frontdoor.sh porque Front Door tiene costo fijo mensual.
set -euo pipefail
: "${RG:?Define RG}"
: "${APP:?Define APP}"
VNET="vnet-${APP}"
STORAGE="st$(echo "${APP}" | tr -cd 'a-z0-9' | cut -c1-18)"
KV="${KV:-kv-$(echo "${APP}" | tr -cd 'a-z0-9-' | cut -c1-21)}"
az config set extension.use_dynamic_install=yes_without_prompt >/dev/null 2>&1 || true
REGION=$(az group show -n "$RG" --query location -o tsv)

echo ">> 1. NSG (firewall de red) en la subred de la base de datos"
az network nsg create -g "$RG" -n nsg-db -l "$REGION" -o none
az network nsg rule create -g "$RG" --nsg-name nsg-db -n permitir-app-a-postgres --priority 100 \
  --direction Inbound --access Allow --protocol Tcp --source-address-prefixes 10.10.1.0/24 \
  --destination-address-prefixes 10.10.2.0/24 --destination-port-ranges 5432 -o none
az network nsg rule create -g "$RG" --nsg-name nsg-db -n permitir-misma-subred --priority 110 \
  --direction Inbound --access Allow --protocol '*' --source-address-prefixes 10.10.2.0/24 \
  --destination-address-prefixes 10.10.2.0/24 --destination-port-ranges '*' -o none
az network nsg rule create -g "$RG" --nsg-name nsg-db -n denegar-resto-de-la-red --priority 4000 \
  --direction Inbound --access Deny --protocol '*' --source-address-prefixes VirtualNetwork \
  --destination-address-prefixes '*' --destination-port-ranges '*' -o none
az network vnet subnet update -g "$RG" --vnet-name "$VNET" -n snet-db --network-security-group nsg-db -o none

echo ">> 2 y 3. Key Vault + identidad administrada de la app (IAM con privilegio mínimo)"
az keyvault show -g "$RG" -n "$KV" -o none 2>/dev/null || \
  az keyvault create -g "$RG" -n "$KV" -l "$REGION" --enable-rbac-authorization true -o none
KV_ID=$(az keyvault show -g "$RG" -n "$KV" --query id -o tsv)
YO=$(az ad signed-in-user show --query id -o tsv)
az role assignment create --assignee-object-id "$YO" --assignee-principal-type User \
  --role "Key Vault Secrets Officer" --scope "$KV_ID" -o none 2>/dev/null || true
APP_PID=$(az webapp identity assign -g "$RG" -n "$APP" --query principalId -o tsv)
az role assignment create --assignee-object-id "$APP_PID" --assignee-principal-type ServicePrincipal \
  --role "Key Vault Secrets User" --scope "$KV_ID" -o none 2>/dev/null || true

valor() { az webapp config appsettings list -g "$RG" -n "$APP" --query "[?name=='$1'].value | [0]" -o tsv; }
guardar() { # el permiso RBAC tarda unos minutos en propagarse: se reintenta
  for i in $(seq 1 12); do
    az keyvault secret set --vault-name "$KV" -n "$1" --value "$2" -o none 2>/dev/null && return 0
    echo "   esperando permisos en Key Vault ($i/12)..."; sleep 15
  done
  echo "No se pudo guardar $1 en Key Vault"; return 1
}
declare -A SECRETOS=( [DATABASE_URL]=database-url [JWT_SECRET]=jwt-secret [AZURE_STORAGE_CONNECTION_STRING]=storage-connection )
AJUSTES=()
for AJUSTE in "${!SECRETOS[@]}"; do
  ACTUAL=$(valor "$AJUSTE")
  NOMBRE=${SECRETOS[$AJUSTE]}
  if [[ "$ACTUAL" == @Microsoft.KeyVault* ]]; then echo "   $AJUSTE ya apunta a Key Vault"; continue; fi
  guardar "$NOMBRE" "$ACTUAL"
  AJUSTES+=("$AJUSTE=@Microsoft.KeyVault(VaultName=${KV};SecretName=${NOMBRE})")
done
if [ ${#AJUSTES[@]} -gt 0 ]; then
  az webapp config appsettings set -g "$RG" -n "$APP" --settings "${AJUSTES[@]}" -o none
fi

echo ">> 4. Firewall del Blob Storage: solo la subred de la app"
az network vnet subnet update -g "$RG" --vnet-name "$VNET" -n snet-app --service-endpoints Microsoft.Storage -o none
WEB_ID=$(az webapp show -g "$RG" -n "$APP" --query id -o tsv)
az resource update --ids "${WEB_ID}/config/web" --set properties.vnetRouteAllEnabled=true -o none
az storage account network-rule add -g "$RG" --account-name "$STORAGE" --vnet-name "$VNET" --subnet snet-app -o none
az storage account update -g "$RG" -n "$STORAGE" --default-action Deny --bypass AzureServices -o none

echo ">> 5. Monitor: Application Insights conectado y alerta de errores 5xx"
az webapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
  ApplicationInsightsAgent_EXTENSION_VERSION='~3' XDT_MicrosoftApplicationInsights_Mode=recommended
ACCION=()
if [ -n "${ALERT_EMAIL:-}" ]; then
  az monitor action-group create -g "$RG" -n ag-${APP} --short-name alertas \
    --action email equipo "$ALERT_EMAIL" -o none
  ACCION=(--action ag-${APP})
fi
az monitor metrics alert create -g "$RG" -n "errores-5xx-${APP}" --scopes "$WEB_ID" \
  --condition "total Http5xx > 5" --window-size 5m --evaluation-frequency 1m --severity 2 \
  --description "Más de 5 errores de servidor en 5 minutos" "${ACCION[@]}" -o none

echo ">> Reiniciando la app para que tome Key Vault y la autoinstrumentación"
az webapp restart -g "$RG" -n "$APP" -o none

cat <<FIN

Listo. Verifica en 1–2 minutos:
  curl https://${APP}.azurewebsites.net/health        -> db: ok (la cadena ya viene de Key Vault)
  Portal > ${APP} > Configuración > Variables de entorno: DATABASE_URL muestra "Referencia de Key Vault" con check verde.
  Portal > appi-${APP} > Mapa de aplicación / Solicitudes: aparecen peticiones tras navegar la página.
Nota: con el firewall del Storage, el "Explorador de almacenamiento" del portal ya no lista blobs desde tu PC (es lo esperado).
FIN
