-- Track timeline cards that were correctly named by the player

alter table public.player_timeline_cards
  add column if not exists is_guessed boolean not null default false;
