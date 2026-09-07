-- Remove separate placement phase; guess and placement happen during playing

update public.rooms set phase = 'playing' where phase = 'placement';

alter table public.rooms drop constraint if exists rooms_phase_check;
alter table public.rooms
  add constraint rooms_phase_check
  check (phase in ('lobby', 'playing', 'challenge', 'reveal', 'finished'));
