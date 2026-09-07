# Spot the Song

A music guessing game where players contribute albums, songs are shuffled into a shared deck, and everyone takes turns guessing. Correct guesses earn 1 point.

## Features

- **Local mode** — pass-and-play on one device (no backend required)
- **Online mode** — each player joins on their phone; turns and audio sync via Supabase Realtime
- **Flip card reveal** — songs hide behind a card until the answer is revealed
- **Spotify import** — paste an album or playlist link to load songs automatically
- **Shared game engine** — pure TypeScript rules used by both local and online modes

## Project structure

```
spot-the-song/
├── apps/web/              # React + Vite frontend
├── packages/game-engine/  # Pure TS game logic + tests
├── supabase/
│   ├── migrations/        # Postgres schema for online play
│   └── functions/         # Edge functions (Spotify import)
└── legacy/                # Original prototype (reference only)
```

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 and choose **Local Game** to play immediately.

### Local game

1. Add 2+ players
2. Paste a Spotify album/playlist link, load demo albums, or add songs manually
3. Start the game — pass the device on each turn

### Online game

1. Create a Supabase project
2. Run the migration in `supabase/migrations/001_initial.sql`
3. Copy `apps/web/.env.example` to `apps/web/.env` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Create a room, share the 6-character code, add albums, and start

### Spotify import

Albums can be imported from a Spotify link instead of typing songs manually.

1. For **album links**, add Spotify credentials in Supabase → **Project Settings → Edge Functions → Secrets**:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
2. Deploy the edge function (already in `supabase/functions/spotify-import/`):
   ```bash
   supabase functions deploy spotify-import
   ```
2. Paste an album or playlist URL in the game setup screen

The importer reads Spotify's public embed pages for 30-second preview clips (Spotify's Web API no longer returns `preview_url` for new apps). Tracks without a preview fall back to Deezer/iTunes search when possible.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the web app |
| `npm run build` | Build engine + web |
| `npm test` | Run game engine unit tests |

## Game rules (v1)

- Songs from all albums are merged and shuffled once at game start
- Players take turns in order
- Active player has ~30 seconds to guess (title or artist)
- Correct guess: +1 point; wrong or timeout: 0 points
- Card flips on reveal to show title and artist
- Game ends when the deck is empty

## Tech stack

- React 19 + TypeScript + Vite
- `@spot-the-song/game-engine` (shared rules)
- Supabase (Postgres + Realtime) for online multiplayer
- Spotify-inspired dark theme

## Legacy prototype

The original UI shell lives in `legacy/` for reference. The new app replaces it with a working game loop.
