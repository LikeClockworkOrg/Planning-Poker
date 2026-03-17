# Planning Poker

[![Tests](https://github.com/LikeClockworkOrg/Planning-Poker/actions/workflows/ci.yml/badge.svg)](https://github.com/LikeClockworkOrg/Planning-Poker/actions/workflows/ci.yml)

Real-time planning poker app for agile teams. Create a room, share the code, and vote on story points together.

Built with Vue 3, Fastify, Socket.IO, and Redis.

## Prerequisites

- **Node.js 22+**
- **Docker** (for Redis)

## Development

### Quick start

```bash
npm install
npm run dev
```

This starts:
- A Redis container on port 6379 (via Docker Compose)
- The Fastify API server on port 3000 (with hot reload via tsx)
- The Vite dev server on port 5173 (with HMR, proxies `/api` and `/socket.io` to port 3000)

Open http://localhost:5173 to use the app.

### Stopping

`Ctrl+C` stops the Node processes. To also stop the Redis container:

```bash
npm run dev:stop
```

### Clearing Redis data

```bash
docker compose -f docker-compose.dev.yml down -v
```

### Build order

The shared package must be built before server and client. The root `build` script handles this:

```bash
npm run build
```

To build individual packages:

```bash
npm run build -w packages/shared   # Must be first
npm run build -w packages/client
npm run build -w packages/server
```

### Type checking

The client build includes type checking via `vue-tsc`:

```bash
npm run build -w packages/client
```

The server and shared packages are type-checked by their `tsc` build step.

## Project structure

```
packages/
  shared/    # TypeScript types, Socket.IO event enums, constants
  server/    # Fastify + Socket.IO + Redis backend
  client/    # Vue 3 + Vuetify + Pinia frontend
```

Packages reference each other via npm workspaces. The `@planning-poker/shared` package provides type-safe event definitions and data types used by both server and client.

## Environment variables

| Variable    | Default                   | Description          |
|-------------|---------------------------|----------------------|
| `PORT`      | `3000`                    | Server port          |
| `HOST`      | `0.0.0.0`                | Server bind address  |
| `REDIS_URL` | `redis://localhost:6379`  | Redis connection URL |
| `NODE_ENV`  | `development`             | `production` enables static file serving and disables CORS |

## Production deployment

### Docker Compose (recommended)

```bash
docker compose up --build -d
```

This builds a multi-stage Docker image and starts the app with Redis. The app serves the built Vue client as static files on port 3000.

### Manual

```bash
npm ci
npm run build
NODE_ENV=production REDIS_URL=redis://your-redis:6379 node packages/server/dist/index.js
```

The server serves the client from `packages/client/dist/` in production mode. You'll need Redis running separately.

### Reverse proxy

The app exposes port 3000. Place behind nginx, Caddy, or similar for TLS and domain routing. Ensure WebSocket upgrade is proxied for `/socket.io`.

## Quality checks

```bash
npm test            # Run all tests (Vitest)
npm run test:watch  # Run tests in watch mode
npm run build       # Type checking via TypeScript compilation across all packages
```

- **Tests**: Vitest test suite covering server business logic (room management, voting, vote masking, result calculation) and shared constants
- **Type checking**: `tsc` for server/shared, `vue-tsc` for client (runs as part of `npm run build`)

## How it works

- Rooms are stored in Redis as JSON with a 24-hour TTL (refreshed on every write)
- Most interaction happens over Socket.IO — REST is only used for room creation and existence checks
- Vote values are hidden from clients until the host reveals the round
- Host identity is verified via a SHA-256 hashed token stored in Redis and the plain token stored in the client's localStorage
- Participants persist across socket reconnects; they're only removed on explicit "Leave Room"
