#!/usr/bin/env bash
# OPCIONAL (tiene costo): Azure Front Door Standard + WAF delante del App Service.
#   - CDN y punto de entrada global con TLS.
#   - WAF ("antes de entrar al servicio"): limita peticiones por IP (frena la sobrecarga que dispara costos)
#     y bloquea patrones típicos de inyección SQL y XSS (reglas personalizadas; las reglas administradas
#     de OWASP solo existen en el nivel Premium).
#   - La app deja de aceptar tráfico directo: solo el que viene de TU Front Door.
# Costo: Front Door Standard tiene una tarifa base de unos 35 USD al mes más el WAF.
# Créalo cerca de la presentación y bórralo después con infra/azure-frontdoor-borrar.sh
#
#   RG=practica-pfc APP=ceviche-seguro-cm bash infra/azure-frontdoor.sh
set -euo pipefail
: "${APP:?Define APP}"
RG="${RG:-rg-${APP}}"
PERFIL="afd-${APP}"
WAF="waf$(echo "${APP}" | tr -cd 'a-z0-9')"
az config set extension.use_dynamic_install=yes_without_prompt >/dev/null 2>&1 || true

az provider register --namespace Microsoft.Cdn --wait >/dev/null
echo ">> Perfil, endpoint, origen y ruta"
az afd profile create -g "$RG" --profile-name "$PERFIL" --sku Standard_AzureFrontDoor -o none
az afd endpoint create -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --enabled-state Enabled -o none
az afd origin-group create -g "$RG" --profile-name "$PERFIL" --origin-group-name og-app \
  --probe-request-type GET --probe-protocol Https --probe-interval-in-seconds 60 --probe-path /health \
  --sample-size 4 --successful-samples-required 3 --additional-latency-in-milliseconds 50 -o none
az afd origin create -g "$RG" --profile-name "$PERFIL" --origin-group-name og-app --origin-name app-service \
  --host-name "${APP}.azurewebsites.net" --origin-host-header "${APP}.azurewebsites.net" \
  --priority 1 --weight 1000 --enabled-state Enabled --http-port 80 --https-port 443 -o none
az afd route create -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --route-name ruta-app \
  --origin-group og-app --supported-protocols Http Https --https-redirect Enabled \
  --link-to-default-domain Enabled --forwarding-protocol HttpsOnly -o none

echo ">> WAF (modo Prevención) con reglas personalizadas"
az network front-door waf-policy create -g "$RG" -n "$WAF" --sku Standard_AzureFrontDoor --mode Prevention -o none
az network front-door waf-policy rule create -g "$RG" --policy-name "$WAF" -n LimitePorIP --priority 10 \
  --rule-type RateLimitRule --rate-limit-threshold 300 --rate-limit-duration 1 --action Block --defer -o none
az network front-door waf-policy rule match-condition add -g "$RG" --policy-name "$WAF" -n LimitePorIP \
  --match-variable RemoteAddr --operator IPMatch --values 0.0.0.0/0 ::/0 -o none
az network front-door waf-policy rule create -g "$RG" --policy-name "$WAF" -n BloquearInyeccion --priority 20 \
  --rule-type MatchRule --action Block --defer -o none
az network front-door waf-policy rule match-condition add -g "$RG" --policy-name "$WAF" -n BloquearInyeccion \
  --match-variable QueryString --operator Contains --transforms Lowercase UrlDecode \
  --values "union select" "<script" "' or 1=1" "drop table" -o none
WAF_ID=$(az network front-door waf-policy show -g "$RG" -n "$WAF" --query id -o tsv)
EP_ID=$(az afd endpoint show -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --query id -o tsv)
az afd security-policy create -g "$RG" --profile-name "$PERFIL" --security-policy-name politica-waf \
  --domains "$EP_ID" --waf-policy "$WAF_ID" -o none

echo ">> La app solo acepta tráfico de este Front Door"
FDID=$(az afd profile show -g "$RG" --profile-name "$PERFIL" --query frontDoorId -o tsv)
az webapp config access-restriction add -g "$RG" -n "$APP" --priority 100 --rule-name solo-front-door \
  --action Allow --service-tag AzureFrontDoor.Backend --http-header x-azure-fdid="$FDID" -o none

HOST=$(az afd endpoint show -g "$RG" --profile-name "$PERFIL" --endpoint-name "ep-${APP}" --query hostName -o tsv)
cat <<FIN

Front Door listo (tarda de 5 a 15 minutos en propagar): https://${HOST}
  - https://${APP}.azurewebsites.net ahora responde 403 (acceso directo bloqueado).
  - En GitHub crea la variable SMOKE_URL=https://${HOST}/health para que la prueba de humo del pipeline pase por Front Door.
  - Prueba el WAF:  curl -i "https://${HOST}/api/puestos?q=union%20select"   -> 403
Cuando termines la demo: RG=${RG} APP=${APP} bash infra/azure-frontdoor-borrar.sh
FIN
