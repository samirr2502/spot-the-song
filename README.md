# Spot the Song

Multiplayer music party game — hand-sketched UI, Socket.IO realtime, Spotify playlists.

**Start here:** [`docs/PRODUCT_CANVAS.md`](./docs/PRODUCT_CANVAS.md) and [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md)

## Quick start

```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001 (`GET /health`)

Copy env examples:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

## Project structure

```
spot-the-song/
├── client/          # React + Vite + sketch UI
├── server/          # Express + Socket.IO (authoritative game state)
├── shared/          # Types, socket contracts, scoring (later)
├── docs/            # Product canvas, plans, flows, state machine
└── supabase/        # Spotify import edge fn (reference for Phase 3)
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server concurrently |
| `npm run build` | Production build (shared → server → client) |
| `npm run typecheck` | TypeScript all workspaces |
| `npm run test` | Unit tests (shared scoring) |
| `npm start` | Run built server |

## Current phase

**Phase 8a — Spotify full playback (dev test)** ✓

- Host OAuth + Web Playback SDK test at `/dev/spotify`
- Catalog/playback abstractions in shared
- See [`docs/SPOTIFY_ARCHITECTURE.md`](docs/SPOTIFY_ARCHITECTURE.md)

**Next:** Verify `/dev/spotify` with Premium, then Phase 8b (multiplayer integration).

Legacy multiplayer still uses preview `ClipPlayer` until 8b.

## Spotify credentials

Server env (`server/.env`):

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` — e.g. `http://localhost:3001/api/spotify/callback` (register in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard))

**Dev playback test:** open http://localhost:5173/dev/spotify after `npm run dev`. Requires a Spotify account with Premium for Web Playback SDK.

Catalog import uses client-credentials; host playback uses OAuth (see `docs/SPOTIFY_ARCHITECTURE.md`).

## Tech stack

- React 19, Vite, TypeScript
- Express, Socket.IO
- Shared types package
- Supabase optional (future); in-memory rooms for now
