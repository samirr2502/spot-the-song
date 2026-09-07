-- Block direct client updates to turns (prevents forging guess results).
-- Game mutations should go through the game-action edge function (service role).

drop policy if exists "turns update" on public.turns;

create policy "turns update blocked"
  on public.turns
  for update
  using (false);

comment on policy "turns update blocked" on public.turns is
  'Turn updates must go through game-action edge function for fair play';
