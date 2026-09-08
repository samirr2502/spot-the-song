# Spot the Song — Implementation Plan

Phased build plan. **Implement one phase at a time.** Update completion notes at the bottom of each phase section when done.

Reference: [`PRODUCT_CANVAS.md`](./PRODUCT_CANVAS.md)

---

## PHASE 0 — FOUNDATION

**Goal:** Stable clean project — app loads, client connects to server, visual system established.

### Tasks

- [x] Vite React TypeScript client (`/client`)
- [x] Node/Express/Socket.IO server (`/server`)
- [x] Shared TypeScript package (`/shared`)
- [x] npm workspaces + dev scripts (`npm run dev`, `build`, `typecheck`, `lint`)
- [x] `.env.example` files (client + server)
- [x] Health check endpoint (`GET /health`)
- [x] Socket connection + connection status UI
- [x] React Router initial routes (landing, home placeholders)
- [x] Sketch UI primitives (Button, Card, Input, Checkbox, Radio, Divider, Avatar, Modal, Timer, Score, SongCard)
- [x] Responsive mobile-first layout
- [x] Remove legacy `apps/`, `packages/`, `legacy/` folders
- [x] Planning docs (this file, canvas, screen flow, state machine)

### Deliverable

App loads at `http://localhost:5173`, server at `http://localhost:3001`, socket shows connected, sketch design system visible on landing/home.

### Phase 0 completion notes

_Completed 2026-09-07._

- Monorepo restructured to `client/`, `server/`, `shared/`, `docs/`.
- Old `apps/web`, `packages/game-engine`, and `legacy/` removed.
- Spotify import edge function preserved under `supabase/functions/spotify-import/` for Phase 3 port.
- Phase 0 delivers health check, socket ping/pong, sketch primitives demo on landing, and route shell for Phase 1.

---

## PHASE 1 — ROOMS + LOBBY

**Goal:** Players can create and join games reliably.

### Tasks

- [x] Persist player name in sessionStorage
- [x] `client:create-room` / `client:join-room` handlers
- [x] 6-character room codes (server-generated)
- [x] QR code on lobby screen
- [x] Live player list via `server:room-state`
- [x] Host designation + host-only Start button
- [x] Basic reconnect (same session id)
- [x] Disconnect cleanup (grace period optional)
- [x] In-memory `RoomManager` on server
- [x] Lobby UI screen wired to socket

### Deliverable

Multiple devices enter one lobby and see each other live.

### Phase 1 completion notes

_Completed 2026-09-07._

- `RoomManager` handles create/join/reconnect/leave/start with 30s disconnect grace.
- Lobby at `/room/:code` shows QR (join link), room code, live player list, host start button.
- Session persisted in sessionStorage for reconnect after refresh.
- Start transitions room to `how-to-play` and navigates to `/room/:code/how-to-play`.

---

## PHASE 2 — ALL IN GUESS MVP

**Goal:** First fully playable game loop.

### Tasks

- [x] All In setup screen (guess checklist, rounds, clip duration)
- [x] Validate at least one guess field selected
- [x] `MockMusicProvider` + seed tracks
- [x] Server random track selection per round
- [x] Round timer (server-authoritative)
- [x] Per-field answer inputs + submit
- [x] Port normalized matching to `shared/src/scoring/matching.ts`
- [x] Field-by-field scoring + speed bonus
- [x] Round results UI + mini leaderboard
- [x] Multi-round loop + final results screen
- [x] `client:submit-answers` / `server:round-results`

### Deliverable

Complete multiplayer All In game start to finish with mock tracks.

### Phase 2 completion notes

_Completed 2026-09-07._

- All In setup at `/create/all-in` with field checklist validation.
- `MockMusicProvider` loads 12 seed tracks; server picks random tracks per round.
- Full loop: how-to-play ready → rounds → results → final leaderboard → play again.
- Scoring in `shared/src/scoring/` (100 pts/field, up to 50 speed bonus).

---

## PHASE 3 — MUSIC PROVIDER / SPOTIFY

**Goal:** Replace mock tracks with real playlist/album data.

### Tasks

- [x] `MusicProvider` interface on server
- [x] Port `spotify-import` logic to `SpotifyProvider`
- [x] Parse playlist/album links in setup flow
- [x] Populate normalized `Track[]` in room
- [x] Handle missing previews gracefully
- [x] Loading + error UI on setup
- [x] Game logic unchanged when provider swaps

### Deliverable

Host creates game from Spotify playlist/album link.

### Phase 3 completion notes

_Completed 2026-09-07._

- `SpotifyProvider` ports logic from `supabase/functions/spotify-import/` to `server/src/music/`.
- Setup screen accepts Spotify links with preview via `POST /api/music/preview`.
- Tracks without previews are kept for guessing; clip UI shows honest fallback.
- Empty link uses demo seed tracks (dev fallback).
- Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `server/.env` for album links and richer preview resolution.

---

## PHASE 4 — TURN-BASED GUESS

**Goal:** Spoken-answer party mode with voting.

### Tasks

- [x] Active player rotation
- [x] Server timers for guess + voting phases
- [x] Active player UI (prompt, no text entry)
- [x] Voting UI for other players (YES/NO per field)
- [x] Block active player from voting
- [x] Majority calculation (tie = NO)
- [x] Scoring + round results + leaderboard

### Deliverable

Full turn-based Guess game loop.

### Phase 4 completion notes

- Turn Guess setup at `/create/turns/guess` with Spotify or demo tracks.
- Server: `turnGuessGame.ts`, rotation via `turnRotationIndex`, phases `playing` → `voting` → reveal.
- Client: `TurnGuessPlayPage` with active-player prompt and YES/NO voting UI; `GamePlayPage` routes by mode.
- Socket: `client:submit-votes` with majority scoring (100 pts per accepted field).

---

## PHASE 5 — SING ALONG

**Goal:** Social karaoke scoring.

### Tasks

- [x] Sing Along setup in Turns flow
- [x] Active player challenge display + timer
- [x] Audience 1–10 rating UI
- [x] One rating per player enforcement
- [x] Average calculation + results

### Deliverable

Complete Sing Along game loop.

### Phase 5 completion notes

- Setup at `/create/turns/sing` with performance timer and Spotify/demo tracks.
- Server: `singAlongGame.ts`, phases `playing` → `rating` → reveal; average × 10 = round points.
- Client: `SingAlongPlayPage` with challenge song for active player and 1–10 rating grid for audience.
- Socket: `client:submit-rating`; active player blocked from self-rating.

---

## PHASE 6 — TIMELINE

**Goal:** Chronological placement gameplay.

### Tasks

- [x] Starter song per player on join/start
- [x] Player-specific timeline state on server
- [x] Hidden incoming card + drag/drop placement (mobile touch)
- [x] Before / between / after drop zones
- [x] Year reveal + server validation
- [x] Optional title/artist bonus guesses
- [x] Turn rotation + results

### Deliverable

Complete playable Timeline mode.

### Phase 6 completion notes

- Setup at `/create/turns/timeline`; starter cards dealt when the first round begins.
- Server: `timelineGame.ts`, per-player timelines, placement validation, bonus scoring.
- Client: `TimelineBoard` with tap-to-place slots; `TimelinePlayPage` for listen → place → reveal flow.
- Sockets: `client:place-card`, `client:submit-timeline-bonus`.

---

## PHASE 7 — POLISH + RELIABILITY

**Goal:** Finished feel without scope creep.

### Tasks

- [ ] Reconnect mid-game
- [ ] Host leave → promote or end
- [ ] Player leave mid-round
- [ ] Empty Spotify / duplicate track handling
- [ ] Loading and error states everywhere
- [ ] Sketch transitions + animation polish
- [ ] Audio state indicators
- [ ] Mobile Safari + Android Chrome testing
- [ ] Accessibility pass
- [ ] Unit tests: scoring + state transitions

### Do NOT add

Accounts, profiles, friends, currency, achievements, cosmetics, progression, admin dashboard.

### Phase 7 completion notes

_(pending)_

---

## Dev commands

```bash
npm install
npm run dev          # client + server concurrently
npm run typecheck    # all workspaces
npm run build        # production build
npm run lint         # eslint on client
```

## Environment

| Variable | Where | Phase |
|----------|-------|-------|
| `PORT` | server | 0 |
| `CLIENT_ORIGIN` | server | 0 |
| `VITE_SERVER_URL` | client | 0 |
| `SPOTIFY_CLIENT_ID` | server | 3 |
| `SPOTIFY_CLIENT_SECRET` | server | 3 |
| `SUPABASE_URL` | server (optional) | 7+ |
