# Spot the Song

A music guessing game where players listen to clips, guess songs, and build chronological timelines. Pass-and-play locally or play online from any phone.

## Features

- **Local mode** — pass-and-play on one device (no backend required)
- **Online mode** — each player on their phone; sync via Supabase Realtime
- **Smooth reveals** — animated title and year flips with sound effects
- **Fair online play** — server-validated guesses via edge function
- **PWA** — add to home screen on iOS and Android
- **Spotify import** — paste an album or playlist link to load songs

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — choose **Local Game** to play immediately.

## Deploy (Vercel — recommended)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — `vercel.json` is preconfigured

## Supabase setup (online mode)

1. Create a Supabase project
2. Run all migrations in order: `supabase/migrations/001` through `007`
3. Copy `apps/web/.env.example` to `apps/web/.env`
4. Deploy edge functions:
   ```bash
   supabase functions deploy spotify-import
   supabase functions deploy game-action
   ```
5. Set edge function secrets (Spotify credentials for album import)

Migration `007` blocks direct client updates to turns — game mutations must go through the `game-action` edge function.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the web app |
| `npm run build` | Build engine + web |
| `npm test` | Run game engine unit tests |

## Project structure

```
spot-the-song/
├── apps/web/              # React + Vite frontend
├── packages/game-engine/  # Pure TS game logic + tests
├── supabase/
│   ├── migrations/        # Postgres schema
│   └── functions/       # Edge functions (spotify-import, game-action)
└── vercel.json            # Vercel deploy config
```

## Tech stack

- React 19 + TypeScript + Vite + Motion
- `@spot-the-song/game-engine` (shared rules)
- Supabase (Postgres + Realtime + Edge Functions)
- PWA via vite-plugin-pwa
