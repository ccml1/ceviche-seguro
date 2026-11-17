#!/usr/bin/env bash
# OPCIONAL: Azure Front Door Standard delante del App Service (CDN global + punto de entrada con TLS).
# Ojo con el costo: Microsoft publica una tarifa base de 35 USD al mes para el nivel Standard.
# Créalo cerca de la presentación y bórralo después:  az afd profile delete -g $RG --profile-name afd-$APP
#
#   APP=<nombre-del-webapp> RG=rg-<APP> bash infra/azure-frontdoor.sh
set -euo pipefail
: "${APP:?Define APP}"
RG="${RG:-rg-${APP}}"
PERFIL="afd-${APP}"

az provider register --namespace Microsoft.Cdn --wait >/dev/null
az afd profile create -g "$RG" --profile-name "$PERFIL" --sku Standard_AzureFrontDoor -o none
az afd endpoint create -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --enabled-state Enabled -o none
az afd origin-group create -g "$RG" --profile-name "$PERFIL" --origin-group-name og-app \
  --probe-request-type GET --probe-protocol Https --probe-interval-in-seconds 60 --probe-path /health \
  --sample-size 4 --successful-samples-required 3 --additional-latency-in-milliseconds 50 -o none
az afd origin create -g "$RG" --profile-name "$PERFIL" --origin-group-name og-app --origin-name app-service \
  --host-name "${APP}.azurewebsites.net" --origin-host-header "${APP}.azurewebsites.net" \
  --priority 1 --weight 1000 --enabled-state Enabled --http-port 80 --https-port 443 -o none
az afd route create -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --route-name ruta-app \
  --origin-group og-app --supported-protocols Https --https-redirect Enabled \
  --link-to-default-domain Enabled --forwarding-protocol HttpsOnly -o none

HOST=$(az afd endpoint show -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --query hostName -o tsv)
echo "Front Door listo (puede tardar unos minutos en propagar): https://${HOST}"
