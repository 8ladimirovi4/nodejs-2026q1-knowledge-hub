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

Optional **Adminer** (database UI on port **8080**) is behind the `debug` profile:

```bash
docker compose --profile debug up --build
```

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
