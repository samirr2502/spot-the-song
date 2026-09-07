-- Timeline collection + challenge mechanics

alter table public.songs
  add column if not exists release_year integer not null default 2000;

alter table public.room_players
  add column if not exists coins integer not null default 3;

alter table public.rooms drop constraint if exists rooms_phase_check;
alter table public.rooms
  add constraint rooms_phase_check
  check (phase in ('lobby', 'playing', 'placement', 'challenge', 'reveal', 'finished'));

alter table public.turns
  add column if not exists claimed_slot integer,
  add column if not exists challenger_player_id text,
  add column if not exists claim_awarded_to text,
  add column if not exists claim_discarded boolean not null default false;

create table if not exists public.player_timeline_cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id text not null,
  song_id uuid not null references public.songs(id) on delete cascade,
  slot_index integer not null check (slot_index >= 0 and slot_index < 10),
  created_at timestamptz not null default now(),
  unique (room_id, player_id, slot_index),
  unique (room_id, song_id)
);

create index if not exists idx_player_timeline_cards_room_id
  on public.player_timeline_cards(room_id);

alter table public.player_timeline_cards enable row level security;

create policy "player_timeline_cards read" on public.player_timeline_cards for select using (true);
create policy "player_timeline_cards insert" on public.player_timeline_cards for insert with check (true);
create policy "player_timeline_cards update" on public.player_timeline_cards for update using (true);
create policy "player_timeline_cards delete" on public.player_timeline_cards for delete using (true);

alter publication supabase_realtime add table public.player_timeline_cards;
