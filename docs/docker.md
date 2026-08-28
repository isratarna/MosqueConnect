# Docker development environment

The Docker Compose stack runs the React/Vite frontend, Laravel API, and MySQL.
Source directories are bind-mounted, so frontend and backend edits are reflected
without rebuilding the images.

Docker Desktop (using Linux containers) must be running before using the stack.

## Start the project

From the repository root:

```sh
docker compose up --build
```

Open:

- Frontend: <http://localhost:5173>
- API health check: <http://localhost:8000/api/health>

On the first start, the API container installs Composer dependencies, creates
`apps/api/.env` if it is absent, and generates a Laravel application key.

Create the database tables and optional demo data in another terminal:

```sh
docker compose exec api php artisan migrate
docker compose exec api php artisan db:seed
```

## Common commands

```sh
# Run backend tests
docker compose exec api php artisan test

# Run frontend tests
docker compose exec web npm run test --workspace=apps/web

# Follow container logs
docker compose logs -f

# Stop containers but retain the database
docker compose down

# Stop containers and delete the local Docker database/dependency volumes
docker compose down --volumes
```

Copy `.env.example` to `.env` at the repository root if you need to change the
published ports or local database credentials. This root file configures Docker
Compose; `apps/api/.env` remains Laravel's application environment file.

## Production note

This stack is optimized for local development: it uses Vite's development
server, Laravel's Artisan server, bind mounts, and local credentials. A production
deployment should use multi-stage builds, serve the frontend as static files,
run Laravel behind a production web server, inject secrets externally, and avoid
publishing the database port.
