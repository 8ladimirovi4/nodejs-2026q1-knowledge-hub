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

Adminer is intended for **local debugging** (inspect schema, run SQL). Until the app uses PostgreSQL with migrations, the database may be empty.

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
