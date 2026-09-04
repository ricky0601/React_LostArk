-- #81: Initial account, roster, character, and weekly-state schema for Lokki.
-- These tables intentionally use a lokki_ prefix because the Supabase project may
-- be shared with INXX, which already owns public.users and public.user_characters.

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

create or replace function private.lokki_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.lokki_set_updated_at() from public;

create table public.lokki_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 50),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  -- Server-managed. A browser cannot insert or update this column.
  discord_id text unique check (discord_id is null or discord_id ~ '^[0-9]{1,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lokki_rosters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.lokki_profiles(user_id) on delete cascade,
  representative_character_name text
    check (representative_character_name is null or char_length(representative_character_name) between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.lokki_characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lokki_profiles(user_id) on delete cascade,
  roster_id uuid not null,
  character_name text not null check (char_length(character_name) between 1 and 20),
  server_name text check (server_name is null or char_length(server_name) between 1 and 20),
  character_class text check (character_class is null or char_length(character_class) between 1 and 30),
  item_level numeric(8, 2) check (item_level is null or item_level >= 0),
  is_main boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, character_name),
  unique (id, user_id),
  foreign key (roster_id, user_id)
    references public.lokki_rosters(id, user_id) on delete cascade
);

create unique index lokki_characters_one_main_per_user_idx
  on public.lokki_characters (user_id)
  where is_main;
create index lokki_characters_roster_id_idx
  on public.lokki_characters (roster_id);

create table public.lokki_weekly_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.lokki_profiles(user_id) on delete cascade,
  character_id uuid,
  week_start date not null check (extract(isodow from week_start) = 1),
  activity_key text not null check (char_length(activity_key) between 1 and 80),
  completed_count smallint not null default 0 check (completed_count >= 0),
  target_count smallint not null default 1 check (target_count > 0 and completed_count <= target_count),
  earned_gold integer not null default 0 check (earned_gold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (character_id, user_id)
    references public.lokki_characters(id, user_id) on delete cascade
);

-- NULL character_id represents an account-wide weekly activity. Coalescing its
-- text form prevents duplicate account-wide rows for the same week/activity.
create unique index lokki_weekly_states_scope_idx
  on public.lokki_weekly_states (
    user_id,
    coalesce(character_id::text, ''),
    week_start,
    activity_key
  );
create index lokki_weekly_states_user_week_idx
  on public.lokki_weekly_states (user_id, week_start desc);
create index lokki_weekly_states_character_id_idx
  on public.lokki_weekly_states (character_id)
  where character_id is not null;

create trigger lokki_profiles_set_updated_at
before update on public.lokki_profiles
for each row execute function private.lokki_set_updated_at();
create trigger lokki_rosters_set_updated_at
before update on public.lokki_rosters
for each row execute function private.lokki_set_updated_at();
create trigger lokki_characters_set_updated_at
before update on public.lokki_characters
for each row execute function private.lokki_set_updated_at();
create trigger lokki_weekly_states_set_updated_at
before update on public.lokki_weekly_states
for each row execute function private.lokki_set_updated_at();

create or replace function private.lokki_create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lokki_profiles (user_id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 50), ''),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), 2048), '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.lokki_create_profile_for_auth_user() from public;

create trigger lokki_auth_user_created
  after insert on auth.users
  for each row execute function private.lokki_create_profile_for_auth_user();

alter table public.lokki_profiles enable row level security;
alter table public.lokki_rosters enable row level security;
alter table public.lokki_characters enable row level security;
alter table public.lokki_weekly_states enable row level security;

create policy "lokki_profiles_owner_all"
on public.lokki_profiles for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "lokki_rosters_owner_all"
on public.lokki_rosters for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "lokki_characters_owner_all"
on public.lokki_characters for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "lokki_weekly_states_owner_all"
on public.lokki_weekly_states for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.lokki_profiles from anon, authenticated;
revoke all on table public.lokki_rosters from anon, authenticated;
revoke all on table public.lokki_characters from anon, authenticated;
revoke all on table public.lokki_weekly_states from anon, authenticated;

-- Discord identity is deliberately excluded from browser write grants.
grant select, delete on table public.lokki_profiles to authenticated;
grant insert (user_id, display_name, avatar_url) on table public.lokki_profiles to authenticated;
grant update (display_name, avatar_url) on table public.lokki_profiles to authenticated;

grant select, delete on table public.lokki_rosters to authenticated;
grant insert (user_id, representative_character_name) on table public.lokki_rosters to authenticated;
grant update (representative_character_name) on table public.lokki_rosters to authenticated;

grant select, delete on table public.lokki_characters to authenticated;
grant insert (user_id, roster_id, character_name, server_name, character_class, item_level, is_main, last_synced_at)
  on table public.lokki_characters to authenticated;
grant update (roster_id, character_name, server_name, character_class, item_level, is_main, last_synced_at)
  on table public.lokki_characters to authenticated;

grant select, delete on table public.lokki_weekly_states to authenticated;
grant insert (user_id, character_id, week_start, activity_key, completed_count, target_count, earned_gold)
  on table public.lokki_weekly_states to authenticated;
grant update (character_id, week_start, activity_key, completed_count, target_count, earned_gold)
  on table public.lokki_weekly_states to authenticated;
