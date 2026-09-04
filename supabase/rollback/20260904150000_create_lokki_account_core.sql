-- Manual rollback for 20260904150000_create_lokki_account_core.sql.
-- WARNING: this permanently deletes all Lokki account and roster data.

begin;

drop trigger if exists lokki_auth_user_created on auth.users;
drop function if exists private.lokki_create_profile_for_auth_user();

drop table if exists public.lokki_weekly_states;
drop table if exists public.lokki_characters;
drop table if exists public.lokki_rosters;
drop table if exists public.lokki_profiles;

drop function if exists private.lokki_set_updated_at();

commit;
