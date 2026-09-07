-- Refactor timeline from fixed year slots to ordered positions

alter table public.player_timeline_cards
  rename column slot_index to position;

alter table public.player_timeline_cards
  drop constraint if exists player_timeline_cards_slot_index_check;

alter table public.player_timeline_cards
  add column if not exists is_starter boolean not null default false;

alter table public.player_timeline_cards
  drop constraint if exists player_timeline_cards_room_id_player_id_slot_index_key;

alter table public.player_timeline_cards
  drop constraint if exists player_timeline_cards_room_player_position;

alter table public.player_timeline_cards
  add constraint player_timeline_cards_room_player_position
  unique (room_id, player_id, position);

alter table public.turns
  rename column claimed_slot to insert_index;
