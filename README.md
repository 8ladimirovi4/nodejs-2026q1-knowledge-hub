# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

## Downloading

```
git clone {repository URL}
```

```
cp .env.example .env
```

## Installing NPM modules

```
npm install
```

## Database (PostgreSQL + Prisma)

The API uses **PostgreSQL** via **Prisma ORM**. Connection string is read from **`DATABASE_URL`** in `.env` (see `.env.example`). Copy `.env.example` to `.env` and set variables; for a local app talking to Postgres in Docker, use host **`localhost`** and port **`5432`** (when the `db` service publishes `5432:5432`).

### npm scripts (`package.json`)


| Script        | Command           | Purpose                                                                                                                                        |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`db:seed`** | `npm run db:seed` | Runs`npx prisma db seed` — fills the database with initial data from `prisma/seed.ts` (requires applied migrations and valid `DATABASE_URL`). |

### Prisma CLI (run with `npx`)

These are not separate npm scripts in this repo; use **`npx prisma …`** from the project root (with `.env` loaded — Prisma reads `DATABASE_URL` via `prisma.config.ts`).


| Command                     | When to use                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `npx prisma generate`       | After changing`prisma/schema.prisma` — regenerates the Prisma client (`@prisma/client`). |
| `npx prisma migrate dev`    | **Development:** create and apply a new migration from schema changes.                    |
| `npx prisma migrate deploy` | **CI/production:** apply existing migrations from `prisma/migrations/`.                   |
| `npx prisma migrate reset`  | **Dev only:** drops the database, reapplies all migrations, runs seed (destructive).      |
| `npx prisma db seed`        | Same as**`npm run db:seed`** — seed data.                                                |
| `npx prisma studio`         | Open a browser UI to browse/edit tables.                                                  |

Typical local workflow: start Postgres (`docker compose up -d db` or full stack) → set **`DATABASE_URL`** → `npx prisma migrate dev` → optional `npm run db:seed` → `npm run start:dev`.

## Running application

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

### Swagger UI and JWT (Bearer token)

Protected routes expect the header `Authorization: Bearer <access_token>`. Swagger does not add it automatically; you must authorize once per session (authorization may persist across reloads).

After seeding the database (`npm run db:seed`), user with **`login`** `admin` and **`password`** `admin123` exists (see `prisma/seed.ts`). You can use these credentials in **`POST /auth/login`** to obtain an access token without signing up first.

1. Call **`POST /auth/login`** with `{ "login": "...", "password": "..." }` and copy **`accessToken`** from the JSON response.
2. Click **Authorize** (top of the Swagger UI page).
3. In the **`access-token`** field, paste **only** the JWT string (do **not** prefix with `Bearer` and do **not** wrap in quotes).
4. Click **Authorize**, then **Close**.
5. Use **Try it out** → **Execute** on any protected operation (for example **`GET /user`**). The generated **curl** and the browser request should include `-H 'Authorization: Bearer …'`.

Public routes (`/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/`, `/doc`) do not require a token.

**Logout / refresh token blacklist:** `POST /auth/logout` accepts `{ "refreshToken": "<jwt>" }` and revokes that refresh token until it would have expired. Revocation is stored **in memory** in the API process: it does **not** survive restarts, is **not** shared between multiple app instances, and is intended for **local/demo** use only. For production, use Redis or a database-backed store.

## Google Gemini (AI integration)

This API calls **Google Gemini** over HTTP from the server. The browser never sees your Gemini API key; only your backend sends `x-goog-api-key` to Google.

### How to obtain a Gemini API key (step-by-step)

1. Sign in with a Google account at **[Google AI Studio](https://aistudio.google.com/)** (or open **Get API key** from the Gemini API docs).
2. Open **Get API key** / **Create API key** and choose **Create API key in new project** (or attach the key to an existing Google Cloud project you are allowed to use).
3. Copy the key string once it is shown. Store it only in **`.env`** (or your secret manager); never commit it to Git.
4. If the console shows quotas or billing notices, review the **free tier** limits for your account and region (see **Known limitations** below).

### Which Gemini model is used

The model name is read from **`GEMINI_MODEL`** in `.env`. If that variable is missing or empty, the application falls back to **`gemini-2.5-flash`**.

The sample in **`.env.example`** sets **`GEMINI_MODEL=gemini-2.0-flash`**. You may change it to any model your API key can access (for example **`gemini-2.5-flash`** or **`gemini-2.5-flash-lite`**) as long as it supports the **`generateContent`** endpoint used by this project.

### Setup Gemini

1. Set **`GEMINI_API_KEY`** in **`.env`** to the key you copied from AI Studio (replace the placeholder `your-gemini-api-key`). Do not paste the key into the README, Swagger, or source files.

**AI-related variables** (all optional except **`GEMINI_API_KEY`** for real AI responses):


| Variable                     | Purpose                                                                  |
| ------------------------------ | -------------------------------------------------------------------------- |
| **`GEMINI_API_KEY`**         | Google Gemini API key (required for live model calls).                   |
| **`GEMINI_API_BASE_URL`**    | Base URL (default`https://generativelanguage.googleapis.com`).           |
| **`GEMINI_MODEL`**           | Model id (see**Which Gemini model is used**).                            |
| **`GEMINI_HTTP_TIMEOUT_MS`** | Request timeout in ms (default**120000**).                               |
| **`AI_RATE_LIMIT_RPM`**      | Max AI-route requests per minute per client (default**20**).             |
| **`AI_CACHE_TTL_SEC`**       | TTL for summarize/translate in-memory cache in seconds (default**300**). |
| **`AI_CONVERSATION_MAX_PAIRS`** | Max user–model **pairs** kept per `sessionId` for **`POST /ai/generate`** (default**10**). Older pairs are dropped (FIFO trim). |
| **`AI_CONVERSATION_IDLE_TTL_SEC`** | If no request hits a thread for this many **seconds**, its stored turns are discarded on the **next** access (default**900**). In-process only; no background sweeper. |

### How to run the app and test AI endpoints

1. Start the API (**`npm run start:dev`** or **`npm start`** or **`npm start:prod`(build needed) as documented above) with a valid **`.env`** including **`GEMINI_API_KEY`**.
2. Open **`http://localhost:<PORT>/doc/`** (default port **4000**).
3. Obtain a JWT: **`POST /auth/login`** (for example seeded user `admin` / `admin123` after **`npm run db:seed`**).
4. In Swagger, **Authorize** with the **access token** (paste the JWT only, no `Bearer` prefix in the UI field).
5. **Article-backed AI** requires an existing article id from the database (e.g. from **`GET /article`**):
   - **`POST /ai/articles/{articleId}/summarize`**
   - **`POST /ai/articles/{articleId}/translate`**
   - **`POST /ai/articles/{articleId}/analyze`**
6. Optional: **`POST /ai/generate`** (free-form prompt) supports **short-term conversation memory**. Request body includes **`prompt`** and optional **`sessionId`** (UUID v4). If you omit **`sessionId`**, the server mints one and returns it in **`{ "text": "...", "sessionId": "..." }`**; reuse that **`sessionId`** on follow-up requests so Gemini receives prior turns in the thread. Separate **`sessionId`** values isolate context (for example separate Swagger tabs or topics). Memory is keyed by **`userId` from the JWT** plus **`sessionId`**, stored **in-process** until restart; depth is capped by **`AI_CONVERSATION_MAX_PAIRS`** (pairs), and idle threads are cleared per **`AI_CONVERSATION_IDLE_TTL_SEC`** on the next access (see table above).
7. **`GET /ai/usage`** returns in-memory counters since process start (totals, per-endpoint counts, optional token aggregates when Gemini returns usage metadata).

Without **`GEMINI_API_KEY`**, AI routes that call Gemini respond with an internal configuration error instead of a model result.

### Known limitations

- **Free tier and quotas:** Google applies per-minute/per-day and token limits that vary by model and account. Heavy use or burst traffic can return **429**; the server retries with backoff, then may respond with **503**.
- **Latency:** Each AI call depends on Google’s response time and prompt size; expect noticeable delays compared to ordinary CRUD endpoints.
- **Regional availability:** Access to Gemini and certain models can depend on **country/region** and Google/Cloud policy. If requests fail with auth or “unsupported” errors, check [Gemini API documentation](https://ai.google.dev/gemini-api/docs) and AI Studio for your region.
- **Model and API changes:** Model names and free-tier rules can change; update **`GEMINI_MODEL`** and monitor Google’s announcements if a model is deprecated.
- **Cache and usage data:** Summarize/translate responses are cached in memory (**`AI_CACHE_TTL_SEC`**). **`POST /ai/generate`** dialogue history is stored in memory per **`sessionId`** (bounded by **`AI_CONVERSATION_MAX_PAIRS`** and **`AI_CONVERSATION_IDLE_TTL_SEC`**) and is also lost when the Node process restarts. **`GET /ai/usage`** counters reset when the Node process restarts.

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


| Field        | Value                                                                     |
| -------------- | --------------------------------------------------------------------------- |
| **System**   | PostgreSQL                                                                |
| **Server**   | `db` (Docker Compose service name for PostgreSQL on the internal network) |
| **Username** | same as**`POSTGRES_USER`** in `.env`                                      |
| **Password** | same as**`POSTGRES_PASSWORD`** in `.env`                                  |
| **Database** | same as**`POSTGRES_DB`** in `.env`                                        |

Adminer is intended for **local debugging** (inspect schema, run SQL). After running **Prisma migrations** (and optionally **`npm run db:seed`**), tables and data will appear here.

Open the API docs at `http://localhost:<PORT>/doc/` (for example `http://localhost:4000/doc/` when `PORT=4000`).

## Testing

Run commands from a new terminal in the project root.

### Unit tests (Vitest)

```
npm run test:unit
```

```
npm run test:unit:watch
```

```
npm run test:unit:ui
```

### Coverage (Vitest)

```
npm run test:coverage
```

```
npm run test:coverage:open
```

### E2E / auth suites (Jest)

```
npm run test:e2e
```

```
npm run test:auth
```

```
npm run test:refresh
```

```
npm run test:rbac
```

### Run all test suites

```
npm run test
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
