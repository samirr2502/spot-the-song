-- Spot the Song initial schema

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_player_id text,
  mode text not null default 'online' check (mode in ('local', 'online')),
  phase text not null default 'lobby' check (phase in ('lobby', 'playing', 'reveal', 'finished')),
  settings jsonb not null default '{"guessTimeSeconds": 30}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null,
  name text not null,
  score integer not null default 0,
  turn_order integer not null default 0,
  is_host boolean not null default false,
  connected_at timestamptz not null default now(),
  unique (room_id, player_id)
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  title text not null,
  artist text not null,
  audio_url text not null
);

create table if not exists public.game_deck (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null,
  played boolean not null default false,
  unique (room_id, song_id)
);

create table if not exists public.turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  active_player_id text not null,
  song_id uuid not null references public.songs(id) on delete cascade,
  guess text,
  is_correct boolean,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists idx_room_players_room_id on public.room_players(room_id);
create index if not exists idx_albums_room_id on public.albums(room_id);
create index if not exists idx_songs_album_id on public.songs(album_id);
create index if not exists idx_game_deck_room_id on public.game_deck(room_id);
create index if not exists idx_turns_room_id on public.turns(room_id);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.game_deck enable row level security;
alter table public.turns enable row level security;

-- MVP policies: open read/write for anon (tighten with auth in production)
create policy "rooms read" on public.rooms for select using (true);
create policy "rooms insert" on public.rooms for insert with check (true);
create policy "rooms update" on public.rooms for update using (true);

create policy "room_players read" on public.room_players for select using (true);
create policy "room_players insert" on public.room_players for insert with check (true);
create policy "room_players update" on public.room_players for update using (true);

create policy "albums read" on public.albums for select using (true);
create policy "albums insert" on public.albums for insert with check (true);

create policy "songs read" on public.songs for select using (true);
create policy "songs insert" on public.songs for insert with check (true);

create policy "game_deck read" on public.game_deck for select using (true);
create policy "game_deck insert" on public.game_deck for insert with check (true);
create policy "game_deck update" on public.game_deck for update using (true);
create policy "game_deck delete" on public.game_deck for delete using (true);

create policy "turns read" on public.turns for select using (true);
create policy "turns insert" on public.turns for insert with check (true);
create policy "turns update" on public.turns for update using (true);
create policy "turns delete" on public.turns for delete using (true);

-- Enable realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.turns;
alter publication supabase_realtime add table public.albums;
alter publication supabase_realtime add table public.game_deck;
alter publication supabase_realtime add table public.songs;
