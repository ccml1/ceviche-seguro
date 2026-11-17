#!/usr/bin/env bash
# Crea la infraestructura de Ceviche Seguro en Azure (pensado para Azure for Students).
# Ejecutar en Azure Cloud Shell (Bash) o en una terminal con `az login` hecho.
#
#   REGION=<una región permitida> APP=<nombre-unico> bash infra/azure-setup.sh
#
# Arquitectura que crea:
#   Resource Group
#   ├─ VNet 10.10.0.0/16
#   │   ├─ snet-app  10.10.1.0/24  (integración de App Service, delegada a Microsoft.Web/serverFarms)
#   │   └─ snet-db   10.10.2.0/24  (PostgreSQL Flexible Server con acceso privado)
#   ├─ App Service Plan Linux B1 (balanceador interno de App Service; admite escalar a más instancias)
#   ├─ Web App Node 22 LTS  ->  https://<APP>.azurewebsites.net
#   ├─ Azure Database for PostgreSQL Flexible Server (Burstable B1ms, PostgreSQL 16, sin IP pública)
#   ├─ Storage Account + contenedor privado "licencias" (Blob Storage)
#   └─ Application Insights (monitoreo)
# Front Door (CDN + WAF) va aparte en azure-frontdoor.sh porque tiene costo fijo mensual.
set -euo pipefail

: "${REGION:?Define REGION con una región permitida para tu suscripción}"
: "${APP:?Define APP con un nombre único en minúsculas, por ejemplo ceviche-seguro-cm}"
RG="${RG:-rg-${APP}}"
VNET="vnet-${APP}"
PLAN="plan-${APP}"
DB="pg-${APP}"
DB_ADMIN="${DB_ADMIN:-pgadmin}"
DB_NAME="cevicheseguro"
STORAGE="st$(echo "${APP}" | tr -cd 'a-z0-9' | cut -c1-18)"
DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-20)Aa1!}"
JWT_SECRET="$(openssl rand -hex 32)"

echo ">> Registrando proveedores (solo la primera vez tarda)"
for ns in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.Storage Microsoft.Network Microsoft.Insights Microsoft.OperationalInsights; do
  az provider register --namespace "$ns" --wait >/dev/null
done

echo ">> Grupo de recursos y red"
az group create -n "$RG" -l "$REGION" -o none
az network vnet create -g "$RG" -n "$VNET" --address-prefixes 10.10.0.0/16 \
  --subnet-name snet-app --subnet-prefixes 10.10.1.0/24 -o none
az network vnet subnet update -g "$RG" --vnet-name "$VNET" -n snet-app \
  --delegations Microsoft.Web/serverFarms -o none

echo ">> PostgreSQL Flexible Server con acceso privado (tarda 5 a 10 minutos)"
az postgres flexible-server create -g "$RG" -n "$DB" -l "$REGION" \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 16 \
  --admin-user "$DB_ADMIN" --admin-password "$DB_PASSWORD" \
  --vnet "$VNET" --subnet snet-db --address-prefixes 10.10.0.0/16 --subnet-prefixes 10.10.2.0/24 \
  --database-name "$DB_NAME" --yes -o none

echo ">> Almacenamiento de archivos (Blob Storage privado)"
az storage account create -g "$RG" -n "$STORAGE" -l "$REGION" --sku Standard_LRS \
  --kind StorageV2 --allow-blob-public-access false --min-tls-version TLS1_2 -o none
STORAGE_CS=$(az storage account show-connection-string -g "$RG" -n "$STORAGE" --query connectionString -o tsv)
az storage container create --name licencias --connection-string "$STORAGE_CS" -o none

echo ">> Monitoreo"
az monitor app-insights component create -g "$RG" -a "appi-${APP}" -l "$REGION" --kind web -o none
APPI_CS=$(az monitor app-insights component show -g "$RG" -a "appi-${APP}" --query connectionString -o tsv)

echo ">> App Service (plan B1 Linux + Web App Node 22)"
az appservice plan create -g "$RG" -n "$PLAN" -l "$REGION" --is-linux --sku B1 -o none
az webapp create -g "$RG" -p "$PLAN" -n "$APP" --runtime "NODE:22-lts" -o none
az webapp vnet-integration add -g "$RG" -n "$APP" --vnet "$VNET" --subnet snet-app -o none
az webapp update -g "$RG" -n "$APP" --https-only true -o none
az webapp config set -g "$RG" -n "$APP" --startup-file "npm start" --always-on true \
  --min-tls-version 1.2 --ftps-state Disabled -o none
az webapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
  DATABASE_URL="postgres://${DB_ADMIN}:${DB_PASSWORD}@${DB}.postgres.database.azure.com:5432/${DB_NAME}" \
  DB_SSL=true JWT_SECRET="$JWT_SECRET" SEED_DEMO=true RUN_MIGRATIONS=true \
  AZURE_STORAGE_CONNECTION_STRING="$STORAGE_CS" AZURE_STORAGE_CONTAINER=licencias \
  APPLICATIONINSIGHTS_CONNECTION_STRING="$APPI_CS" \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false WEBSITE_WEBDEPLOY_USE_SCM=true
az webapp config set -g "$RG" -n "$APP" --generic-configurations '{"healthCheckPath": "/health"}' -o none

echo ">> Habilitar credenciales de publicación (las usa el publish profile de GitHub Actions)"
az resource update -g "$RG" --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
  --parent "sites/${APP}" -n scm --set properties.allow=true -o none

echo ">> Publish profile para el secreto AZURE_WEBAPP_PUBLISH_PROFILE de GitHub"
az webapp deployment list-publishing-profiles -g "$RG" -n "$APP" --xml > "publish-profile-${APP}.xml"

cat <<RESUMEN

Listo.
  URL pública:        https://${APP}.azurewebsites.net
  Grupo de recursos:  ${RG}
  Base de datos:      ${DB}.postgres.database.azure.com (solo accesible desde la VNet)
  Publish profile:    publish-profile-${APP}.xml  -> pégalo en GitHub como secreto AZURE_WEBAPP_PUBLISH_PROFILE
                      y crea la variable de repositorio AZURE_WEBAPP_NAME=${APP}
  Guarda la contraseña de la BD en un gestor de contraseñas: ${DB_PASSWORD}
  Para ahorrar crédito cuando no lo uses:  az postgres flexible-server stop -g ${RG} -n ${DB}
  Para borrar todo al terminar:            az group delete -n ${RG} --yes
RESUMEN
