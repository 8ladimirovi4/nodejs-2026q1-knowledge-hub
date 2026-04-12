# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

## Downloading

```
git clone {repository URL}
```

## Installing NPM modules

```
npm install
```

## Database (PostgreSQL + Prisma)

The API uses **PostgreSQL** via **Prisma ORM**. Connection string is read from **`DATABASE_URL`** in `.env` (see `.env.example`). Copy `.env.example` to `.env` and set variables; for a local app talking to Postgres in Docker, use host **`localhost`** and port **`5432`** (when the `db` service publishes `5432:5432`).

### npm scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| **`db:seed`** | `npm run db:seed` | Runs `npx prisma db seed` — fills the database with initial data from `prisma/seed.ts` (requires applied migrations and valid `DATABASE_URL`). |

### Prisma CLI (run with `npx`)

These are not separate npm scripts in this repo; use **`npx prisma …`** from the project root (with `.env` loaded — Prisma reads `DATABASE_URL` via `prisma.config.ts`).

| Command | When to use |
|---------|-------------|
| `npx prisma generate` | After changing `prisma/schema.prisma` — regenerates the client in `generated/prisma`. |
| `npx prisma migrate dev` | **Development:** create and apply a new migration from schema changes. |
| `npx prisma migrate deploy` | **CI/production:** apply existing migrations from `prisma/migrations/`. |
| `npx prisma migrate reset` | **Dev only:** drops the database, reapplies all migrations, runs seed (destructive). |
| `npx prisma db seed` | Same as **`npm run db:seed`** — seed data. |
| `npx prisma studio` | Open a browser UI to browse/edit tables. |

Typical local workflow: start Postgres (`docker compose up -d db` or full stack) → set **`DATABASE_URL`** → `npx prisma migrate dev` → optional `npm run db:seed` → `npm run start:dev`.

## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Docker

The stack is defined in `docker-compose.yml` (NestJS app + PostgreSQL). Copy `.env.example` to `.env` and adjust variables as needed.

Set **`PORT`** in `.env` for the HTTP port; it is used both by the application and for the host port mapping (default **4000**).

Set **`ADMINER_PORT`** in `.env` for the **host** port of [Adminer](https://www.adminer.org/) when you use the `debug` Compose profile (default **8080**). The container still listens on port **8080** internally; Compose publishes it as `ADMINER_PORT` on your machine.

### Docker Hub image

The production application image is published on Docker Hub:

- **Repository:** [vlleo/nodejs-2026q1-knowledge-hub-app](https://hub.docker.com/r/vlleo/nodejs-2026q1-knowledge-hub-app)
- **Pull:** `docker pull vlleo/nodejs-2026q1-knowledge-hub-app:latest`

To run the pre-built image together with PostgreSQL, point the `app` service in `docker-compose.yml` at this image (`image: …`) instead of `build`, keeping the same `.env` and `db` service as in this repository.

### `docker compose` vs `docker-compose`

Modern **Docker Desktop** ships **Docker Compose V2** as a CLI **plugin**. You run it with a **space**:

```bash
docker compose up --build
```

The legacy standalone command **`docker-compose`** (with a **hyphen**) is a separate binary and is often **not** installed. If your shell reports `command not found: docker-compose`, use **`docker compose`** instead. The two forms are equivalent for typical workflows, but only the plugin is guaranteed with current Docker Desktop installs.

To stop and remove containers:

```bash
docker compose down
```

### Verifying health checks (`docker compose ps`)

Both **`app`** and **`db`** define `healthcheck` in `docker-compose.yml`. After the stack is running, check that Docker reports them as healthy:

```bash
docker compose up --build -d
docker compose ps
```

In the **STATUS** (or **State**) column you should see **`healthy`** for **`app`** and **`db`** once probes have succeeded (allow a short time after startup; **`app`** uses `start_period: 40s`). If you see **`starting`**, wait and run `docker compose ps` again.

This matches the course criterion that health checks are configured for both services. Optional detail:

```bash
docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q app)"
docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q db)"
```

Expected output for each: **`healthy`**.

### Verifying the application container runs as non-root

The production **`Dockerfile`** creates user **`nestjs`** and ends with **`USER nestjs`**, so the API process must not run as **root** (course criterion: final application image runs as non-root).

After Compose has started **`app`**:

```bash
docker compose up --build -d
docker compose exec app whoami
docker compose exec app id
```

You should see **`nestjs`** (or another **non-root** user) and a **UID that is not `0`** (not `root`).

From the host, without exec:

```bash
docker inspect --format '{{.Config.User}}' "$(docker compose ps -q app)"
```

A **non-empty** value (e.g. `nestjs`) indicates the default user for the container is not root.

To check the image directly after **`docker pull`** (or substitute your local tag, e.g. `nodejs-2026q1-knowledge-hub-app:latest`):

```bash
docker run --rm vlleo/nodejs-2026q1-knowledge-hub-app:latest id
```

Again, **UID must not be `0`**.

### Adminer (optional, local PostgreSQL UI)

Adminer is **not** started by default. It is isolated behind the Compose **`debug`** profile so the usual `docker compose up` stack is only **app** + **db**.

1. Ensure `.env` exists (from `.env.example`) and set **`ADMINER_PORT`** if you do not want the default **8080** on the host.
2. Start the stack with the profile:

```bash
docker compose --profile debug up --build
```

3. Open Adminer in the browser: **`http://localhost:<ADMINER_PORT>/`** (for example `http://localhost:8080/` when `ADMINER_PORT=8080`).
4. Log in to PostgreSQL:

| Field | Value |
|-------|--------|
| **System** | PostgreSQL |
| **Server** | `db` (Docker Compose service name for PostgreSQL on the internal network) |
| **Username** | same as **`POSTGRES_USER`** in `.env` |
| **Password** | same as **`POSTGRES_PASSWORD`** in `.env` |
| **Database** | same as **`POSTGRES_DB`** in `.env` |

Adminer is intended for **local debugging** (inspect schema, run SQL). After running **Prisma migrations** (and optionally **`npm run db:seed`**), tables and data will appear here.

Open the API docs at `http://localhost:<PORT>/doc/` (for example `http://localhost:4000/doc/` when `PORT=4000`).

## Testing

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all test with authorization

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
