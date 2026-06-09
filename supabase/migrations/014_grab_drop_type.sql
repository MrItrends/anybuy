-- Migration 014: Add 'grab' drop type (flash sale — first click wins)
alter table public.live_drops
  drop constraint if exists live_drops_drop_type_check;
alter table public.live_drops
  add constraint live_drops_drop_type_check
  check (drop_type in ('auction', 'fixed', 'grab'));
