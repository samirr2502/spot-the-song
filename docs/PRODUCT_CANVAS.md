# Spot the Song — Product Canvas

Source of truth for product scope, architecture, and build phases.

---

## 1. Product statement

**Spot the Song** is a multiplayer music party game played on phones. Players listen to song clips from a host-provided Spotify playlist or album and compete through quick rounds of guessing, voting, singing, or chronological placement.

The experience is intentionally social, lightweight, and sketchy — like a hand-drawn notebook game that became interactive. No accounts, no progression systems, no polished SaaS chrome.

---

## 2. Core user experience

| Step | What happens |
|------|----------------|
| Arrive | Player enters name on landing screen |
| Choose | Join existing room (code/QR) or create new game |
| Configure | Host connects Spotify, picks mode, guess fields, rounds, playlist/album link |
| Lobby | Everyone sees live player list; host starts |
| Learn | Short sketched “How to Play” for selected mode |
| Play | Server-driven rounds with timers, answers, votes, scores |
| Results | Round leaderboard → final winner → play again or exit |

**Primary device:** mobile phone in portrait. Large touch targets. Minimal typing during play (except All In answer fields).

---

## 3. Game modes

### 3.1 ALL IN

Everyone answers simultaneously on their own device.

- Host selects guess checklist: Title, Artist, Album, Year (any combination).
- Each field submitted and scored separately.
- Partial credit per correct field.
- Speed bonus on overall submission timing.
- Normalized string matching (no semantic AI in v1).

### 3.2 TURNS

One active player per round. Three sub-modes:

| Sub-mode | Active player | Others |
|----------|---------------|--------|
| **Guess** | Says answers aloud; no text entry | Vote YES/NO per selected field near timer end |
| **Sing Along** | Sings to song/challenge | Rate 1–10 after performance; average = score |
| **Timeline** | Places new card on personal chronological timeline | Watch; placement validated when year reveals |

---

## 4. Round mechanics

### All In round

1. Server selects random track from pool.
2. **Host browser** plays first N seconds of the full Spotify track (Web Playback SDK), starting at 0:00. Guests hear through the host’s speakers — they do not need Spotify accounts.
3. Server-authoritative countdown runs for the clip duration.
4. Each player submits enabled fields separately.
5. Server scores fields + speed bonus.
6. Reveal shows title, artist, album, year, artwork, and **Open in Spotify** link.
7. Round results + mini leaderboard.
8. Repeat until `roundCount` exhausted.

**Legacy (until Phase 8b):** multiplayer may still use `previewUrl` + HTML audio via `ClipPlayer`. Target architecture is host-only Spotify playback — see [`SPOTIFY_ARCHITECTURE.md`](./SPOTIFY_ARCHITECTURE.md).

### Turn Guess round

1. Active player announced; timer starts.
2. Active player identifies song fields aloud.
3. Voting phase opens for non-active players.
4. Majority YES/NO per field determines credit.
5. Scores updated; rotate active player.

### Sing Along round

1. Active player sees song/challenge.
2. Performance timer.
3. Audience submits 1–10 rating (one each).
4. Average becomes round score.

### Timeline round

1. Each player starts with one revealed starter song/year on their timeline and **3 coins**.
2. On turn: random track plays (year hidden).
3. Active player places the card before/between/after existing cards.
4. Optional title/artist guesses earn **+1 coin each** (and bonus points if placement is correct).
5. After placement locks, other players have a timed **challenge window** — first challenger spends **2 coins**.
6. Reveal: correct placement keeps the card on the active timeline; wrong placement transfers the card to a successful challenger at the correct chronological slot; otherwise the card is discarded.
7. Game ends when a player reaches **cards to win** (including starter) or the track pool is exhausted. Points break ties.

---

## 5. Scoring

### All In (per round)

| Component | Rule |
|-----------|------|
| Field correct | Fixed points per enabled field (configurable constant) |
| Speed bonus | Extra points based on time remaining at submit |
| Wrong field | 0 for that field |

### Turn Guess

| Component | Rule |
|-----------|------|
| Field accepted | Points per field that received majority YES |
| Rejected field | 0 |

### Sing Along

| Component | Rule |
|-----------|------|
| Round score | Mean of all non-active ratings (1–10), scaled to game points |

### Timeline

| Component | Rule |
|-----------|------|
| Win condition | First player to reach `cardsToWin` cards on timeline (starter counts) |
| Correct placement | Base placement points + keep card |
| Title bonus | Optional normalized match (+50 pts if placement correct; +1 coin always) |
| Artist bonus | Optional normalized match (+50 pts if placement correct; +1 coin always) |
| Challenge | Spend 2 coins during challenge window; if placement wrong, challenger gets card |
| Tiebreaker | Total points |

### Answer matching (v1)

Shared `normalizeAnswer()` in `/shared`:

- lowercase, trim, collapse whitespace
- strip punctuation
- optionally ignore leading “the”
- fuzzy tolerance via Levenshtein (small spelling differences)

No LLM or semantic judging.

---

## 6. Multiplayer state

Server is **authoritative** for:

- Room lifecycle and player list
- Host designation
- Game settings and mode
- Track pool and current track
- Timers and phase transitions
- Answers, votes, ratings
- Scores and leaderboards
- Timeline placements and validation

Client renders state and sends intents; never owns score or phase truth.

### Conceptual room model

```ts
GameRoom {
  id: string
  code: string
  hostPlayerId: string
  players: Player[]
  status: RoomStatus
  settings: GameSettings
  trackPool: Track[]
  currentRound: RoundState | null
  scores: Record<playerId, number>
}
```

**Phase 0–2:** in-memory rooms on Node server.  
**Later:** optional Supabase persistence for room codes / Spotify cache; SQLite on server for ephemeral match data if needed.

---

## 7. Screen map

| # | Screen | Route (client) | Who |
|---|--------|----------------|-----|
| 1 | Landing / name | `/` | All |
| 2 | Home | `/home` | All |
| 3 | Join game | `/join` | Joining |
| 4 | Choose mode | `/create/mode` | Host |
| 5 | All In setup | `/create/all-in` | Host |
| 6 | Turns setup | `/create/turns` | Host |
| 7 | Lobby | `/room/:code` | All |
| 8 | How to Play | `/room/:code/how-to-play` | All |
| 9 | All In round | `/room/:code/play` | All |
| 10 | All In results | (phase within play) | All |
| 11 | Turn Guess | `/room/:code/play` | All |
| 12 | Sing Along | `/room/:code/play` | All |
| 13 | Timeline | `/room/:code/play` | All |
| 14 | Round leaderboard | (phase overlay) | All |
| 15 | Final results | `/room/:code/results` | All |

---

## 8. UI design language

**Feel:** pencil sketch on warm off-white paper.

| Element | Treatment |
|---------|-----------|
| Background | `#faf8f5` warm off-white |
| Lines | Graphite `#2d2d2d` / `#444` |
| Typography | Handwritten stack: Caveat, Patrick Hand, cursive fallbacks |
| Borders | Irregular radius, slight rotation, SVG rough rects |
| Icons | Simple sketch strokes |
| Shadows | Minimal or none |
| Buttons | Large, wobbly outlines, no glossy fills |
| Motion | Subtle — pencil scribble, fade, slight wiggle |

**Primitives (reusable):**

`SketchButton`, `SketchCard`, `SketchInput`, `SketchCheckbox`, `SketchRadio`, `SketchDivider`, `SketchAvatar`, `SketchModal`, `SketchTimer`, `SketchScore`, `SketchSongCard`

Accessibility: sufficient contrast, focus rings (sketched dashed outline), 44px+ touch targets, semantic HTML under decorative styling.

**Do not:** Material UI defaults, glassmorphism, heavy gradients, polished SaaS cards.

---

## 9. Shared domain models

Located in `/shared/src/types/`.

### Track

```ts
Track {
  id: string
  title: string
  artist: string
  album: string
  year: number | null
  artworkUrl: string | null
  spotifyUri: string
  spotifyUrl: string
  durationMs: number
  previewUrl?: string  // deprecated — optional legacy only
}
```

Before reveal, clients receive only `RoundTrackPublic` (`id` + optional artwork for sketch UI). Answer metadata and `spotifyUrl` are withheld until reveal.

### Player

```ts
Player {
  id: string
  name: string
  isHost: boolean
  connected: boolean
  avatarSeed?: string
}
```

### GameSettings

```ts
GameSettings {
  playMode: 'all-in' | 'turns'
  turnGame?: 'guess' | 'sing' | 'timeline'
  guessFields: {
    title: boolean
    artist: boolean
    album: boolean
    year: boolean
  }
  roundCount: number
  clipDurationSeconds: number
  guessTimerSeconds?: number
  singTimerSeconds?: number
}
```

### GameRoom, RoundState, AnswerPayload, VotePayload — see `/shared/src/types/game.ts`.

---

## 10. Socket events

Contracts in `/shared/src/socket/events.ts`. Pattern: `client:*` (client → server), `server:*` (server → client).

### Connection & room

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:join-room` | C→S | Join with code + player name |
| `client:create-room` | C→S | Create room + settings stub |
| `client:leave-room` | C→S | Leave / disconnect cleanup |
| `server:room-state` | S→C | Full room snapshot |
| `server:player-joined` | S→C | Player list delta |
| `server:player-left` | S→C | Player disconnected |
| `server:error` | S→C | User-facing error message |

### Lobby & game control

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:update-settings` | C→S | Host updates pre-start settings |
| `client:start-game` | C→S | Host starts → HOW_TO_PLAY |
| `client:ack-how-to-play` | C→S | Ready for round |
| `server:phase-changed` | S→C | Status + round phase |

### All In

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:submit-answers` | C→S | Field answers + timestamp |
| `server:round-started` | S→C | Track ref, timer end |
| `server:round-results` | S→C | Scores breakdown |

### Turns — Guess

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:submit-votes` | C→S | YES/NO per field |
| `server:voting-opened` | S→C | Voting phase start |

### Sing Along

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:submit-rating` | C→S | 1–10 score |

### Timeline

| Event | Direction | Purpose |
|-------|-----------|---------|
| `client:place-card` | C→S | Insert index |
| `client:submit-timeline-bonus` | C→S | Optional title/artist |
| `server:timeline-reveal` | S→C | Year + correctness |

---

## 11. Music & playback architecture

Game engine never imports Spotify SDK directly. Four layers:

| Layer | Responsibility |
|-------|----------------|
| **Track metadata** | Shared `Track` type |
| **Music catalog** | `MusicCatalogProvider` — import playlist/album tracks (server) |
| **Playback** | `PlaybackProvider` — host browser only (Web Playback SDK) |
| **Game state** | Server timers, scoring, reveal — no Spotify imports |

```
/server/src/music/
  SpotifyCatalogProvider.ts   // catalog import (client-credentials)
/client/src/lib/spotify/
  SpotifyPlaybackService.ts   // Web Playback SDK wrapper
  authApi.ts                  // host OAuth token fetch
```

**Host OAuth:** Only the host connects Spotify. Server holds client secret; browser never sees it. See [`SPOTIFY_ARCHITECTURE.md`](./SPOTIFY_ARCHITECTURE.md).

**Playback:** Host plays `spotifyUri` from position 0 for `clipDurationSeconds` (15 or 30). Server is authoritative for clip end; host player pauses on `round:clip-ended` (Phase 8b) with local timeout as safety fallback.

**Do not build gameplay around `preview_url`.** Treat it as unreliable/deprecated.

**Premium note:** Web Playback SDK typically requires Spotify Premium. UI must say so; never fake playback if SDK refuses.

---

## 12. Edge cases

| Case | Handling |
|------|----------|
| Host disconnects | Promote next player or end room (Phase 7) |
| Player mid-round disconnect | Mark disconnected; skip timers if needed |
| Empty Spotify import | Block lobby start; show error |
| Host not connected to Spotify | Block start or pause round with reconnect prompt (Phase 8b) |
| Spotify playback fails | Pause round; retry / Open in Spotify — do not silently continue |
| Tracks missing `spotifyUri` | Exclude at import; validate pool before start |
| Duplicate tracks in pool | Dedupe by Spotify id + normalized title/artist |
| Tie votes | Field counts as NO (consistent rule) |
| Active player tries to vote | Rejected server-side |
| Only one player | Allow solo dev testing; warn in UI |
| Invalid room code | Clear error |
| Spotify unavailable | Mock provider fallback in dev; error in prod setup |

---

## 13. Phase roadmap

See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for task-level detail.

| Phase | Focus |
|-------|-------|
| 0 | Foundation — monorepo, sketch UI, socket health |
| 1 | Rooms + lobby |
| 2 | All In MVP (mock tracks) |
| 3 | Spotify provider |
| 4 | Turn Guess |
| 5 | Sing Along |
| 6 | Timeline |
| 7 | Polish + reliability |
| 8a | Spotify architecture + `/dev/spotify` test (host playback) |
| 8b | Multiplayer Spotify integration (socket events, setup UI) |

---

## 14. Out-of-scope list

- User accounts / auth (except **host Spotify OAuth** for playback)
- Profiles, friends, social graph
- Virtual currency, achievements, cosmetics
- Progression / seasons / battle pass
- Admin dashboard
- Speech recognition
- Automatic vocal analysis
- Semantic / AI answer judging
- Complex persistence (beyond optional Supabase later)
- Native mobile apps (web-first PWA optional later)

---

## 15. Open questions

| # | Question | Default for v1 |
|---|----------|----------------|
| 1 | Exact point values per field? | 100 per field, speed bonus 0–50 by time left |
| 2 | Max players per room? | 12 |
| 3 | Max tracks imported? | 100 |
| 4 | Clip duration default? | 30 seconds (15 optional) |
| 5 | Keep Supabase Realtime edge functions? | No — Socket.IO only; Supabase optional for cache |
| 6 | PWA in v1? | Phase 7 nice-to-have |
| 7 | Reference sketch images | Apply when provided; style per section 8 |

---

## Repo structure (target)

```
spot-the-song/
├── client/                 # React + Vite + TypeScript
├── server/                 # Express + Socket.IO
├── shared/                 # Types, socket contracts, scoring helpers
├── docs/                   # This canvas + plans
├── supabase/               # Optional DB + spotify-import reference (Phase 3+)
├── package.json            # npm workspaces root
└── README.md
```

### Reused from previous codebase

| Asset | Use |
|-------|-----|
| `supabase/functions/spotify-import/` | Port to `SpotifyProvider` in Phase 3 |
| `packages/game-engine/src/validation.ts` | Port matching logic to `shared/src/scoring/` in Phase 2 |
| Spotify env var names | Unchanged |

### Removed (superseded)

- `apps/web/` — Supabase Realtime client replaced by Socket.IO client
- `legacy/` — obsolete UI
- `packages/game-engine/` — rules split into server authority + shared helpers
