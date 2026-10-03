#!/usr/bin/env bash
# Run ON the VPS as s20230204056, from the copied deploy/ folder:  bash deploy/server-setup.sh [--https]
# Idempotent: safe to re-run.
set -euo pipefail

USER_NAME=s20230204056
DOMAIN=mosqueconnect.austattendance.online
SOCK=/run/php/php8.4-fpm-s20230204056.sock
APP=$HOME/laravel
DB_NAME=mosqueconnect_db
DB_USER=mosqueconnect
HERE=$(cd "$(dirname "$0")" && pwd)

HTTPS=0
[ "${1:-}" = "--https" ] && HTTPS=1
[ "$HTTPS" = 1 ] && SCHEME=https || SCHEME=http
CONF=nginx-mosqueconnect.conf
[ "$HTTPS" = 1 ] && CONF=nginx-mosqueconnect-https.conf

echo "== dirs + ACLs"
mkdir -p "$APP/public"
# let nginx (www-data) traverse the home dir and read static files; PHP-FPM runs as us
setfacl -m u:www-data:x "$HOME" || echo "WARN: setfacl on ~ failed"
setfacl -m u:www-data:x "$APP" || echo "WARN: setfacl on app failed"
setfacl -R -m u:www-data:rx "$APP/public" || echo "WARN: setfacl on public failed"
setfacl -d -m u:www-data:rx "$APP/public" || true

echo "== PHP-FPM socket"
ls "$SOCK"

echo "== DB password"
DB_PASS=
if [ -f "$APP/.env" ]; then
  DB_PASS=$(grep -E '^DB_PASSWORD=' "$APP/.env" | head -1 | cut -d= -f2- || true)
fi
[ -n "$DB_PASS" ] || DB_PASS=$(openssl rand -hex 16)

echo "== database ($DB_NAME / $DB_USER)"
read -r -p "MySQL port of cse3100-db published on this host (DB_PORT): " DB_PORT
read -r -s -p "MySQL root password for cse3100-db (blank = skip, print SQL instead): " ROOT_PW; echo
SQL="CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'%' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'%';
FLUSH PRIVILEGES;"
if [ -n "$ROOT_PW" ] && printf '%s\n' "$SQL" | docker exec -i -e MYSQL_PWD="$ROOT_PW" cse3100-db mysql -uroot; then
  echo "DB ready."
else
  echo "Could not run SQL via docker. Ask the instructor to run this as MySQL root:"
  echo "-----"; printf '%s\n' "$SQL"; echo "-----"
fi
unset ROOT_PW

echo "== .env"
if [ ! -f "$APP/.env" ]; then
  cp "$HERE/env.production.example" "$APP/.env"
  KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
  sed -i "s|^APP_KEY=.*|APP_KEY=$KEY|; s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASS|; s|^DB_PORT=.*|DB_PORT=$DB_PORT|" "$APP/.env"
  chmod 600 "$APP/.env"
  echo "created $APP/.env"
else
  echo ".env exists, kept (not overwritten)"
fi
sed -i "s|^APP_URL=.*|APP_URL=$SCHEME://$DOMAIN|; s|^FRONTEND_URL=.*|FRONTEND_URL=$SCHEME://$DOMAIN|" "$APP/.env"

if [ "$HTTPS" = 1 ]; then
  echo "== certs"
  mkdir -p ~/ssl_certs
  sudo /usr/bin/cp ~/ssl/live/$DOMAIN/{fullchain,privkey}.pem ~/ssl_certs/
  sudo /usr/bin/chown -R $USER_NAME:$(id -gn) ~/ssl_certs
  sudo /usr/bin/chmod 600 ~/ssl_certs/privkey.pem
  sudo /usr/bin/chmod 644 ~/ssl_certs/fullchain.pem
fi

echo "== nginx ($CONF)"
cp "$HERE/$CONF" ~/"$DOMAIN.conf"
sudo /usr/bin/cp ~/"$DOMAIN.conf" /etc/nginx/sites-available/$DOMAIN
sudo /usr/bin/ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
if sudo /usr/sbin/nginx -t; then
  sudo /usr/bin/systemctl reload nginx
  echo "nginx reloaded: $SCHEME://$DOMAIN"
else
  echo "nginx -t FAILED, not reloading" >&2
  exit 1
fi
