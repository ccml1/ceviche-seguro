#!/usr/bin/env bash
# Borra Front Door y su WAF (para dejar de pagar) y vuelve a abrir el acceso directo a la app.
#   RG=practica-pfc APP=ceviche-seguro-cm bash infra/azure-frontdoor-borrar.sh
set -uo pipefail
: "${APP:?Define APP}"
RG="${RG:-rg-${APP}}"
az webapp config access-restriction remove -g "$RG" -n "$APP" --rule-name solo-front-door -o none
az afd profile delete -g "$RG" --profile-name "afd-${APP}" --yes -o none
az network front-door waf-policy delete -g "$RG" -n "waf$(echo "${APP}" | tr -cd 'a-z0-9')" -o none
echo "Front Door y WAF borrados. Borra también la variable SMOKE_URL en GitHub."
