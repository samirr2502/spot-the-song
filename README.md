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
| `npm run lint` | ESLint (client) |
| `npm start` | Run built server |

## Current phase

**Phase 6 — Timeline** ✓

- Personal timelines with starter cards at game start
- Listen → place hidden-year card → reveal and validate chronology
- Optional title/artist bonus points; setup at `/create/turns/timeline`

Next: **Phase 7 — Polish + Reliability**

## Spotify credentials

Set on the server for Phase 3+:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`

Existing import logic lives in `supabase/functions/spotify-import/` to port into `server/src/music/`.

## Tech stack

- React 19, Vite, TypeScript
- Express, Socket.IO
- Shared types package
- Supabase optional (future); in-memory rooms for now
