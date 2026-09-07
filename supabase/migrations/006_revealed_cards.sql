-- Track when a timeline card's year has been revealed (face-up on the row)

alter table public.player_timeline_cards
  add column if not exists is_revealed boolean not null default false;
