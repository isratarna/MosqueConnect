#!/usr/bin/env bash
# Repairs the two things broken in the Azure deployment:
#
#   1. The database has a schema but no rows, because the API container has
#      only ever booted with RUN_SEEDERS=false. Every list endpoint therefore
#      returns {"data":[]} and the whole SPA looks empty.
#   2. The web image was built without VITE_GOOGLE_MAPS_API_KEY. Vite inlines
#      VITE_* at build time, so the shipped bundle carries an empty key and the
#      Google Maps loader can never authenticate.
#
# Run from the repository root. Requires `az login` to already have been done.
set -euo pipefail

RG=mosqueconnect-rg
ACR=mcacrt2fdli
API_APP=mc-api
WEB_APP=mc-web
WEB_TAG=v2

API_URL="https://mc-api.politedune-07ecd987.uaenorth.azurecontainerapps.io"

# The key lives only in apps/web/.env, which is untracked. Read it from there
# rather than taking it on the command line so it stays out of shell history.
MAPS_KEY="$(sed -n 's/^VITE_GOOGLE_MAPS_API_KEY=//p' apps/web/.env | tr -d '\r')"
if [ -z "$MAPS_KEY" ]; then
    echo "VITE_GOOGLE_MAPS_API_KEY is empty in apps/web/.env; aborting." >&2
    exit 1
fi

echo "==> 1/3 Seeding the production database"
# The prod entrypoint runs migrations/seeders at boot when these are "true", so
# flipping them provisions a new revision that seeds as it starts.
az containerapp update -n "$API_APP" -g "$RG" \
    --set-env-vars RUN_MIGRATIONS=true RUN_SEEDERS=true \
    --output none

echo "    waiting for the seeding revision to become healthy..."
for _ in $(seq 1 60); do
    if [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/api/events")" = "200" ] \
       && [ "$(curl -s "$API_URL/api/campaigns" | grep -c '"data":\[\]')" = "0" ]; then
        echo "    database now returns rows."
        break
    fi
    sleep 10
done

echo "==> 2/3 Disabling the one-shot seeders again"
# Left on, every future restart or scale-out re-runs the seeders and duplicates
# the demo rows, so turn them back off once they have run.
az containerapp update -n "$API_APP" -g "$RG" \
    --set-env-vars RUN_MIGRATIONS=false RUN_SEEDERS=false \
    --output none

echo "==> 3/3 Rebuilding the web image with the Google Maps key baked in"
# Built locally rather than with `az acr build`: ACR Tasks is not available on
# this Azure for Students subscription, which rejects server-side builds with
# TasksOperationsNotAllowed regardless of the registry SKU.
az acr login -n "$ACR"

docker build -f docker/web/Dockerfile.prod \
    -t "$ACR.azurecr.io/mosqueconnect-web:$WEB_TAG" \
    --build-arg VITE_API_URL="$API_URL" \
    --build-arg VITE_GOOGLE_MAPS_API_KEY="$MAPS_KEY" \
    --build-arg VITE_DISABLE_GOOGLE_MAPS=false \
    .

# Guard against silently shipping another keyless bundle: the whole point of
# this rebuild is that the key reaches the compiled assets.
if ! docker run --rm "$ACR.azurecr.io/mosqueconnect-web:$WEB_TAG" \
        grep -q "AIzaSy" /usr/share/nginx/html/assets/config-*.js; then
    echo "Built bundle still has no Maps key; refusing to push." >&2
    exit 1
fi

docker push "$ACR.azurecr.io/mosqueconnect-web:$WEB_TAG"

az containerapp update -n "$WEB_APP" -g "$RG" \
    --image "$ACR.azurecr.io/mosqueconnect-web:$WEB_TAG" \
    --output none

echo "Done. Web: https://$WEB_APP.politedune-07ecd987.uaenorth.azurecontainerapps.io"
