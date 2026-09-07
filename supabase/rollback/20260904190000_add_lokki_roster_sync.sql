-- Destructive rollback for #77. Run only before roster data is in production use.

drop function if exists public.lokki_set_representative(text);
drop function if exists public.lokki_sync_roster(text, jsonb);
alter table public.lokki_characters drop column if exists combat_power;
