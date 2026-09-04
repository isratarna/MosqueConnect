# MosqueConnect

MosqueConnect is a full-stack community platform for finding nearby mosques and keeping worshippers connected with verified mosque information. The current application combines a React single-page application with a Laravel REST API and a MySQL database. It supports public discovery as well as authenticated workflows for community members, mosque administrators, and platform super administrators.

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 5, React Router 6, Bootstrap 5, Bootstrap Icons, Lucide React |
| Maps | Google Maps JavaScript API through `@react-google-maps/api`; browser geolocation with a Dhaka fallback |
| Backend | PHP 8.3+, Laravel 13, Laravel Sanctum |
| Database | MySQL 8.4 for development; SQLite in-memory for backend tests |
| Tooling | npm workspaces, Composer, PHPUnit, Node's test runner, Docker Compose |

## Implemented features

- Nearby mosque discovery, filters, map display, mosque profiles, facilities, prayer schedules, and Jumu'ah sessions
- Phone OTP authentication, Sanctum API tokens, profiles, account status checks, and role-based authorization
- Mosque following and notifications with read/unread management
- Public announcements, community events, campaign progress, and manual donation pledges
- Mosque ownership/verification claims and applicant status tracking
- Mosque administrator tools for profiles, prayer schedules, announcements, events, campaigns, and donation confirmation
- Super administrator tools for verification requests, users, mosques, moderation, reports, audit logs, statistics, and settings
- Community-facing support, blood donation, and volunteer information flows
- Seeded demo data and automated frontend utility and backend feature/unit tests

Some community screens use local placeholder content, and online payment processing is not integrated. Campaign contributions are manual pledges that an administrator confirms. Event registration is guarded by `VITE_EVENT_REGISTRATION_ENABLED` and should remain disabled unless matching API routes are added.

## Project structure

```text
MosqueConnect/
├── apps/
│   ├── web/                 # React/Vite SPA
│   │   ├── public/          # Static images
│   │   └── src/             # Pages, components, contexts, hooks, services, tests
│   └── api/                 # Laravel REST API
│       ├── app/             # Controllers, models, policies, services, middleware
│       ├── database/        # Migrations, factories, and seeders
│       ├── routes/api.php   # Public and authenticated API routes
│       └── tests/           # PHPUnit feature and unit tests
├── docker/                  # Development container definitions
├── docs/docker.md           # Additional Docker notes
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

A Google Maps JavaScript API key is optional. Without it, map areas display a fallback while the rest of the application remains usable.

## Environment configuration

Templates are committed; real environment files are ignored. Never commit credentials or replace example values with production secrets.

| File | Purpose | Important variables |
| --- | --- | --- |
| `.env` | Docker Compose ports and MySQL container settings | `COMPOSE_PROJECT_NAME`, `WEB_PORT`, `API_PORT`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` |
| `apps/web/.env` | Browser application configuration | `VITE_API_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_EVENT_REGISTRATION_ENABLED` |
| `apps/api/.env` | Laravel application configuration | `APP_KEY`, `APP_ENV`, `APP_DEBUG`, `APP_URL`, `FRONTEND_URL`, `DB_*`, `SESSION_*`, `CACHE_STORE`, `QUEUE_CONNECTION`, `MAIL_*`, `OTP_*` |

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
npm run preview --workspace=apps/web
```

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

## Repository hygiene

The root `.gitignore` covers environment files, `node_modules`, Composer `vendor`, Vite/Laravel build products, caches, logs, and runtime storage. Nested ignore files remaining under Laravel's `bootstrap/cache` and `storage` directories are intentional placeholders: they keep the required writable directory tree in a fresh clone while ignoring generated contents.

Before committing, check that no secret or generated dependency is tracked:

```sh
git status --short
git ls-files | grep -E '(^|/)(\.env$|node_modules/|vendor/)'
```

Only `.env.example` templates should appear for environment configuration.
