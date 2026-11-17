#!/usr/bin/env bash
# PRUEBA PEQUEÑA de Azure for Students (10 minutos, costo casi cero).
# Ejecutar en Azure Cloud Shell (portal.azure.com > icono >_ > Bash):
#
#   bash prueba-azure.sh                 # paso 1: muestra tu suscripción y tus regiones permitidas
#   REGION=<region> bash prueba-azure.sh # paso 2: despliega un "hola mundo" Node y revisa PostgreSQL
#
# Al final borra todo lo que creó.
set -uo pipefail

echo "== 1. Suscripción activa"
az account show --query "{suscripcion:name, id:id, estado:state}" -o table

echo
echo "== 2. Regiones permitidas por la política de Azure for Students"
az policy assignment list --query "[].{politica:displayName, parametros:parameters}" -o json \
  | python3 -c '
import json, sys
for a in json.load(sys.stdin):
    p = a.get("parametros") or {}
    for nombre, valor in p.items():
        v = valor.get("value") if isinstance(valor, dict) else valor
        if isinstance(v, list):
            print(f"{a[\"politica\"]} -> {nombre}: {v}")
'
if [ -z "${REGION:-}" ]; then
  echo
  echo "Elige una de esas regiones (la más cercana a Perú suele ser brazilsouth, si aparece) y vuelve a ejecutar:"
  echo "  REGION=<region> bash prueba-azure.sh"
  exit 0
fi

SUFIJO=$RANDOM
RG="rg-prueba-${SUFIJO}"
APP="prueba-pfc3-${SUFIJO}"

echo
echo "== 3. Registro de proveedores"
for ns in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.Storage Microsoft.Network; do
  printf "%-28s %s\n" "$ns" "$(az provider show -n "$ns" --query registrationState -o tsv)"
  az provider register --namespace "$ns" >/dev/null
done

echo
echo "== 4. Runtimes Node disponibles en App Service Linux"
az webapp list-runtimes --os linux -o tsv | grep -i node

echo
echo "== 5. Hola mundo en App Service (plan F1 gratuito) en ${REGION}"
mkdir -p "/tmp/${APP}" && cd "/tmp/${APP}"
cat > package.json <<'JSON'
{ "name": "prueba", "version": "1.0.0", "scripts": { "start": "node index.js" } }
JSON
cat > index.js <<'JS'
require('http').createServer((_q, r) => r.end('Hola desde Azure App Service - PFC III')).listen(process.env.PORT || 3000);
JS
az group create -n "$RG" -l "$REGION" -o none
if az webapp up -n "$APP" -g "$RG" -l "$REGION" --runtime "NODE:22-lts" --sku F1 -o none; then
  sleep 20
  echo "Respuesta de https://${APP}.azurewebsites.net :"
  curl -s --retry 6 --retry-delay 10 "https://${APP}.azurewebsites.net" ; echo
else
  echo "FALLÓ el despliegue de App Service en ${REGION}: copia el error y envíamelo."
fi

echo
echo "== 6. ¿Hay PostgreSQL Flexible Server Burstable en ${REGION}?"
az postgres flexible-server list-skus --location "$REGION" \
  --query "[].supportedServerEditions[?name=='Burstable'].supportedServerSkus[].name | [0]" -o tsv 2>&1 | head -5

echo
echo "== 7. Limpieza"
az group delete -n "$RG" --yes --no-wait
echo "Se está borrando ${RG}. Copia toda esta salida y compártela para revisar el resultado."
