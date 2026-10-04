# MosqueConnect

MosqueConnect is a full-stack community platform for finding nearby mosques and keeping worshippers connected with verified mosque information. The current application combines a React single-page application with a Laravel REST API and a MySQL database. It supports public discovery as well as authenticated workflows for community members, mosque administrators, and platform super administrators.

## Live deployment

| | |
| --- | --- |
| Application | <https://mosqueconnect.austattendance.online/> |
| API health endpoint | <https://mosqueconnect.austattendance.online/api/health> |
| Server | Ubuntu VPS (Nginx + PHP-FPM 8.4 + MySQL) |
| Deployment | Automatic on every push to `main` through `.github/workflows/deploy.yml` |

The health endpoint returns the commit that is currently deployed, so it can be compared with the latest commit on `main`. Production deployment is documented in [Production deployment](#production-deployment) and in [`deploy/README.md`](deploy/README.md).

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 8, React Router 7, Bootstrap 5, Bootstrap Icons, Lucide React, Recharts |
| Localisation | English and Bangla through i18next, with light and dark themes |
| Maps and routing | Google Maps JavaScript API through `@react-google-maps/api`; browser geolocation with a Dhaka fallback; Geoapify for journey routing |
| Backend | PHP 8.3+ (8.4 in production), Laravel 13, Laravel Sanctum |
| Database | MySQL 8.4 for development; SQLite in-memory for backend tests |
| Tooling | npm workspaces, Composer, PHPUnit, Node's test runner, Playwright, Docker Compose, GitHub Actions |

## Implemented features

- Nearby mosque discovery, filters, map display, mosque profiles, facilities, prayer schedules, and Jumu'ah sessions
- Prayer times calculated from a mosque's location and marked as estimated when the mosque has not published its own times
- Date-based schedule periods and Ramadan timings
- Eid jamaat publishing, an Eid season banner, and a nearby Eid jamaat page with list and map views
- A prayer-aware journey planner, a Qibla compass, and global search across mosques and community content
- Phone OTP authentication, Sanctum API tokens, profiles, account status checks, and role-based authorization
- Mosque following and notifications with read/unread management and per-user preferences
- Announcements with urgency, scheduling, expiry, pinning, and images
- Community events with registration and repeating occurrences, campaign progress with transparency updates, and manual donation pledges
- Blood donation requests and responses, volunteer opportunities and applications, lost and found, goods donation pledges, and complaints
- Mosque ownership/verification claims and applicant status tracking
- Mosque administrator tools for profiles, prayer schedules, announcements, events, campaigns, donation confirmation, team members, and insights
- Super administrator tools for verification requests, users, mosques, moderation, reports, broadcasts, audit logs, statistics, and settings
- Seeded demo data and automated backend, frontend utility, and browser tests

Online payment processing is not integrated: campaign contributions are manual pledges that an administrator confirms. Some informational screens use static content.

## Project structure

```text
MosqueConnect/
├── apps/
│   ├── web/                 # React/Vite SPA
│   │   ├── public/          # Static images
│   │   ├── e2e/             # Playwright browser tests
│   │   └── src/             # Pages, components, contexts, hooks, utils, i18n, tests
│   └── api/                 # Laravel REST API
│       ├── app/             # Controllers, models, policies, services, middleware
│       ├── database/        # Migrations, factories, and seeders
│       ├── routes/api.php   # Public and authenticated API routes
│       └── tests/           # PHPUnit feature and unit tests
├── docker/                  # Container definitions for development and release images
├── deploy/                  # VPS Nginx configs, server-setup.sh, production env template
├── .github/workflows/       # deploy.yml: build and deploy to the VPS
├── docs/docker.md           # Additional Docker notes
├── docs/i18n.md             # English/Bangla translation guide
├── compose.yaml             # Web, API, and MySQL services
└── package.json             # npm workspace commands
```

## Prerequisites

Choose Docker or a local installation. Docker setup requires Docker Desktop with Linux containers and Docker Compose v2.

Local setup requires:

- Node.js 20 or newer and npm (the development container uses Node.js 22)
- PHP 8.3 or newer with Laravel's required extensions plus PDO MySQL, mbstring, intl, bcmath, and zip
- Composer 2
- MySQL 8.x

A Google Maps JavaScript API key is optional. Without it, map areas display a fallback while the rest of the application remains usable. A Geoapify key is required only by the journey planner's routing; without it journey planning reports that routing is unavailable while the rest of the application keeps working.

## Environment configuration

Templates are committed; real environment files are ignored. Never commit credentials or replace example values with production secrets.

| File | Purpose | Important variables |
| --- | --- | --- |
| `.env` | Docker Compose ports and MySQL container settings | `COMPOSE_PROJECT_NAME`, `WEB_PORT`, `API_PORT`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` |
| `apps/web/.env` | Browser application configuration | `VITE_API_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_DISABLE_GOOGLE_MAPS`, `VITE_CONTACT_EMAIL` |
| `apps/api/.env` | Laravel application configuration | `APP_KEY`, `APP_ENV`, `APP_DEBUG`, `APP_URL`, `FRONTEND_URL`, `DB_*`, `SESSION_*`, `CACHE_STORE`, `QUEUE_CONNECTION`, `MAIL_*`, `OTP_*`, `GEOAPIFY_API_KEY` |
| `deploy/env.production.example` | Template for the server's `~/laravel/.env` | Production values for the variables above |

Create local files from the templates:

```sh
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

On Windows PowerShell, `Copy-Item` can be used instead of `cp`. Generate `APP_KEY` with `php artisan key:generate`; do not invent or share a key. The sample database credentials are for local development only.

## Recommended setup: Docker

From the repository root:

```sh
cp .env.example .env
docker compose up --build -d
docker compose exec api php artisan migrate --seed
```

The API container creates `apps/api/.env` from its example and generates `APP_KEY` when necessary. Docker Compose passes the container database settings to Laravel.

- Frontend: <http://localhost:5173>
- API health endpoint: <http://localhost:8000/api/health>

Useful commands:

```sh
docker compose logs -f
docker compose exec web npm run test --workspace=apps/web
docker compose exec -e APP_ENV=testing -e DB_CONNECTION=sqlite -e DB_DATABASE=:memory: api php artisan test
docker compose down
```

Database data remains in the `mysql_data` Docker volume after `docker compose down`. Running `docker compose down --volumes` also deletes that local database volume.

## Local frontend setup

From the repository root:

```sh
npm install
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

Set `VITE_API_URL=http://localhost:8000`. Add `VITE_GOOGLE_MAPS_API_KEY` only if map rendering is required. The frontend runs at <http://localhost:5173>.

Frontend commands:

```sh
npm run dev:web
npm run build:web
npm run test --workspace=apps/web
npm run test:e2e --workspace=apps/web
npm run preview --workspace=apps/web
```

`npm run build:web` writes the production bundle into `apps/api/public/app`, which is how Laravel serves the SPA from the same origin as the API. The Playwright suite runs in a desktop and a mobile viewport and expects the API to be running.

## Local backend and database setup

Create a MySQL database and development user. The template defaults to database/user `mosqueconnect`; choose your own local password:

```sql
CREATE DATABASE mosqueconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mosqueconnect'@'localhost' IDENTIFIED BY 'choose-a-local-password';
GRANT ALL PRIVILEGES ON mosqueconnect.* TO 'mosqueconnect'@'localhost';
FLUSH PRIVILEGES;
```

Then install and configure the API:

```sh
cd apps/api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Update `DB_PASSWORD` in `apps/api/.env` to the local password you chose. The API runs at <http://localhost:8000>; verify it at <http://localhost:8000/api/health>.

Backend commands, run from `apps/api`:

```sh
php artisan serve                 # Start the API
php artisan migrate              # Apply pending migrations
php artisan migrate:fresh --seed # Rebuild and seed the local database (destructive)
php artisan db:seed              # Add/update demo data
php artisan test                 # Run all backend tests (uses SQLite via phpunit.xml)
```

Run `composer install` and `npm install` again after pulling changes that touch `composer.lock` or `package-lock.json`; otherwise tests fail on missing packages rather than on real defects.

The seeded development database includes demo identities and a development-only OTP (`123456`) for exercising role-specific screens. These fixtures are unsuitable for production and must not be treated as real credentials.

## Running both apps locally

Use two terminals after completing the local setup:

```sh
# Terminal 1, repository root
npm run dev:web

# Terminal 2
cd apps/api
php artisan serve
```

The frontend must point to the API through `VITE_API_URL`. MySQL must be running before migrations or database-backed API routes are used.

## Production deployment

The application is deployed to an Ubuntu VPS at <https://mosqueconnect.austattendance.online/>, where Nginx serves the built assets and passes application requests to PHP-FPM, and Laravel reads and writes the `mosqueconnect_db` MySQL database.

### Automatic deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which can also be started manually. The job:

1. Installs PHP dependencies with `composer install --no-dev --optimize-autoloader` in `apps/api`.
2. Builds the React bundle into `apps/api/public/app` and fails if the bundle is missing.
3. Writes the commit SHA into `apps/api/REVISION`, which `/api/health` reports.
4. Packs `release.tar.gz` without `.env`, tests, or logs, and verifies the archive contains the vendor autoloader and the built bundle but no `.env`.
5. Copies the archive to the server over SSH using the `SSH_PRIVATE_KEY` repository secret.
6. Unpacks it into `~/laravel`, refreshes permissions, then runs `php artisan migrate --force`, links storage if it is not already linked, and runs `php artisan optimize`.

The server never runs Composer or npm, so deployments are fast and reproducible. Required repository secrets: `SSH_PRIVATE_KEY`, and optionally `VITE_GOOGLE_MAPS_API_KEY`.

### First-time server setup

1. Install the stack on the server: `sudo apt update && sudo apt install -y nginx php8.4-fpm php8.4-mysql php8.4-mbstring php8.4-xml php8.4-curl php8.4-bcmath php8.4-intl php8.4-gd php8.4-zip acl unzip git`.
2. Copy the deployment folder to the server: `scp -r deploy USER@HOST:~/deploy`.
3. Run `bash ~/deploy/server-setup.sh` on the server. It asks for the MySQL port and root password, then prepares the directories and ACLs, creates `mosqueconnect_db` with a database user limited to that database, writes `~/laravel/.env` once from `deploy/env.production.example` with a fresh `APP_KEY`, installs the Nginx site, and reloads Nginx. Re-running is safe and never overwrites an existing `.env`.
4. Edit `~/laravel/.env`: confirm `APP_ENV=production` and `APP_DEBUG=false`, set `APP_URL` and `FRONTEND_URL` to the domain, set the `DB_*` values, and before any public use set a real `OTP_SMS_DRIVER` with `OTP_ALLOW_LOG_DRIVER=false`. Keep the file at `chmod 600`.
5. Create a deploy key pair, append the public half to `~/.ssh/authorized_keys` on a new line, and store the private half as the `SSH_PRIVATE_KEY` repository secret.
6. Point the domain's DNS A record at the server. For HTTPS, place the certificate and key at `~/ssl/live/<domain>/fullchain.pem` and `privkey.pem`, then run `bash ~/deploy/server-setup.sh --https` to install the TLS site with an HTTP-to-HTTPS redirect.
7. Optionally seed demo data once: `cd ~/laravel && php artisan db:seed --force`.

### Verifying a deployment

```sh
curl -I https://mosqueconnect.austattendance.online
curl https://mosqueconnect.austattendance.online/api/health
```

The `commit` value returned by the health endpoint must match the latest commit on `main`. On failure, check `/var/log/nginx/s20230204056-error.log` and `~/laravel/storage/logs/laravel.log` on the server.

**Security note.** Never run a public deployment with `APP_ENV=local` or with the log OTP driver, because OTP codes written to the log would let anyone with log access sign in as any phone number. Never commit `.env` files, SSH keys, or certificates.

## Repository hygiene

The root `.gitignore` covers environment files, SSH and deploy keys, `node_modules`, Composer `vendor`, Vite/Laravel build products, caches, logs, and runtime storage. Nested ignore files remaining under Laravel's `bootstrap/cache` and `storage` directories are intentional placeholders: they keep the required writable directory tree in a fresh clone while ignoring generated contents.

Before committing, check that no secret or generated dependency is tracked:

```sh
git status --short
git ls-files | grep -E '(^|/)(\.env$|node_modules/|vendor/)'
```

Only `.env.example` templates should appear for environment configuration.
