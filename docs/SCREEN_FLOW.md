# Spot the Song — Screen Flow

Navigation and game flows. See [`PRODUCT_CANVAS.md`](./PRODUCT_CANVAS.md) for screen details.

---

## App navigation (static routes)

```mermaid
flowchart TD
  Landing["/ — Name entry"] --> Home["/home"]
  Home --> Join["/join"]
  Home --> Mode["/create/mode"]
  Home --> HowTo["/how-to-play"]
  Mode --> AllInSetup["/create/all-in"]
  Mode --> TurnsSetup["/create/turns"]
  AllInSetup --> Lobby["/room/:code"]
  TurnsSetup --> Lobby
  Join --> Lobby
  Lobby --> HowToPlay["/room/:code/how-to-play"]
  HowToPlay --> Play["/room/:code/play"]
  Play --> Results["/room/:code/results"]
  Results --> Home
  Results --> Lobby
  DevSpotify["/dev/spotify — host playback test"]
```

**Dev route (Phase 8a):** `/dev/spotify` — connect Spotify, paste track URI, play first 15s/30s. Not part of the main game flow until Phase 8b.

---

## Create game flow

```mermaid
flowchart TD
  A[Enter player name] --> B[Home — Create game]
  B --> C{Choose mode}
  C -->|All In| D[All In setup]
  C -->|Turns| E[Turns setup]
  D --> D1[Paste Spotify playlist/album link]
  D --> D1b[Connect Spotify — host only]
  D --> D2[Select guess fields]
  D --> D3[Song clip 15s / 30s + rounds]
  D --> F[Create lobby]
  E --> E1[Paste Spotify link + Connect Spotify]
  E --> E2{Turn game type}
  E2 -->|Guess| E3[Guess field checklist]
  E2 -->|Sing Along| E4[Timer settings]
  E2 -->|Timeline| E5[Round settings]
  E --> F
  F --> G[Show QR + room code]
  G --> H[Players join live]
  H --> I{Host clicks Start}
  I --> J[How to Play screen]
  J --> K[Game begins]
```

---

## Join game flow

```mermaid
flowchart TD
  A[Enter player name] --> B[Home — Join game]
  B --> C[Enter room code or scan QR]
  C --> D{Valid room?}
  D -->|No| E[Show error — retry]
  E --> C
  D -->|Yes| F[Lobby — see players]
  F --> G{Host started?}
  G -->|No| F
  G -->|Yes| H[How to Play]
  H --> I[Game]
```

---

## All In flow

```mermaid
flowchart TD
  A[Round intro] --> B[Host plays Spotify clip + server timer]
  B --> C[Each player fills enabled fields]
  C --> D[Submit answers]
  D --> E{All submitted or time up?}
  E -->|No| C
  E -->|Yes| F[Server scores fields + speed bonus]
  F --> G[Reveal + Open in Spotify + round leaderboard]
  G --> H{More rounds?}
  H -->|Yes| A
  H -->|No| I[Final leaderboard]
  I --> J[Play again or Exit]
```

---

## Turn Guess flow

```mermaid
flowchart TD
  A[Announce active player] --> B[Timer — active player guesses aloud]
  B --> C[Voting opens for others]
  C --> D[YES/NO per selected field]
  D --> E{All votes or time up?}
  E -->|No| D
  E -->|Yes| F[Majority per field]
  F --> G[Update scores]
  G --> H[Round leaderboard]
  H --> I{More rounds?}
  I -->|Yes| J[Next active player]
  J --> A
  I -->|No| K[Final results]
```

---

## Sing Along flow

```mermaid
flowchart TD
  A[Announce active player] --> B[Show song/challenge]
  B --> C[Performance timer]
  C --> D[Rating phase opens]
  D --> E[Each other player rates 1–10]
  E --> F{All rated or time up?}
  F -->|No| E
  F -->|Yes| G[Average = round score]
  G --> H[Round leaderboard]
  H --> I{More rounds?}
  I -->|Yes| J[Next player]
  J --> A
  I -->|No| K[Final results]
```

---

## Timeline flow

```mermaid
flowchart TD
  A[Game start — each player gets starter card] --> B[Announce active player]
  B --> C[Play hidden-year track]
  C --> D[Drag card to timeline slot]
  D --> E[Optional title/artist bonus guess]
  E --> F[Reveal year]
  F --> G{Chronologically correct?}
  G -->|Yes| H[Keep card + points]
  G -->|No| I[Discard / no placement points]
  H --> J[Round results]
  I --> J
  J --> K{More turns?}
  K -->|Yes| L[Next active player]
  L --> B
  K -->|No| M[Final results — most cards / points]
```

---

## Socket-driven phase overlay

Game screens (`/room/:code/play`) render different UI based on `room.status` and `currentRound.phase` from `server:room-state` / `server:phase-changed`. See [`STATE_MACHINE.md`](./STATE_MACHINE.md).
