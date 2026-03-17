# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev           # Start Redis (Docker), Fastify server, and Vite dev server concurrently
npm run dev:stop      # Tear down dev Redis container
npm run build         # Build all packages (shared → client → server, order matters)

# Per-package
npm run build -w packages/shared    # Build shared types (must be first)
npm run build -w packages/client    # Build Vue client
npm run build -w packages/server    # Build server

# Production
docker compose up --build           # Full production stack (app + Redis)
```

There are no tests or linting configured.

## Architecture

npm workspaces monorepo with three packages that share TypeScript types via `@planning-poker/shared`.

- **packages/shared** — TypeScript types, Socket.IO event enums with typed payloads, and constants (Fibonacci values, room code charset, limits). Compiled with `composite: true` so server can use project references. Must be built before other packages.
- **packages/server** — Fastify HTTP server + Socket.IO for real-time events. Redis stores rooms as JSON with 24h TTL (refreshed on every write). In production, serves the built Vue client via `@fastify/static` with SPA fallback.
- **packages/client** — Vue 3 SPA with Pinia stores and Vuetify components. Vite proxies `/api` and `/socket.io` to the server in dev mode. Socket.IO client is a lazy singleton with manual connect/disconnect controlled by the room store.

## Key Design Decisions

- **Host authentication**: 32-byte random hex token, SHA-256 hashed before Redis storage. Plain token returned once at room creation and stored in localStorage. Host-only actions (reveal, new round, set topic) require this token.
- **Vote masking**: `toClientRoom()` in `room.ts` strips vote values during voting phase, sending only `votedParticipantIds`. Full votes are only sent on reveal.
- **Room state flow**: Most interaction is via Socket.IO. REST is minimal — just `POST /api/rooms` (create) and `GET /api/rooms/:code` (exists check). The room store (`stores/room.ts`) manages all socket listeners and emits.
- **Reconnection**: On socket reconnect, client re-emits `room:join` with preserved participantId and hostToken to restore state.

## Environment Variables

- `PORT` (default: 3000)
- `HOST` (default: 0.0.0.0)
- `REDIS_URL` (default: redis://localhost:6379)
- `NODE_ENV` (development/production) — controls CORS, static file serving
