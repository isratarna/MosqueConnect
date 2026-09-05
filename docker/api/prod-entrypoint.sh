#!/bin/sh
# Production entrypoint. Configuration arrives entirely through Container Apps
# environment variables and secrets -- there is no .env file in the image -- so
# the config/route/view caches are built here, at boot, once those variables
# exist. Building them at image-build time would bake in empty values.
set -eu

mkdir -p storage/framework/cache/data \
         storage/framework/sessions \
         storage/framework/views \
         storage/logs
chown -R www-data:www-data storage bootstrap/cache

php artisan config:clear --no-interaction >/dev/null 2>&1 || true

# Optional one-shot schema setup. Container Apps can run several replicas, so
# this is opt-in via RUN_MIGRATIONS rather than unconditional.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force --no-interaction
fi

if [ "${RUN_SEEDERS:-false}" = "true" ]; then
    echo "Running database seeders..."
    php artisan db:seed --force --no-interaction
fi

php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

exec "$@"
