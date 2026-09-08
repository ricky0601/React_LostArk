-- #77: Atomic roster synchronization and representative-character management.
-- Representative characters belong to profiles; rosters contain only saved expedition data.

alter table public.lokki_profiles
  add column if not exists representative_character_name text
    check (representative_character_name is null or char_length(representative_character_name) between 1 and 20);

alter table public.lokki_characters
  add column if not exists combat_power numeric(20, 2)
    check (combat_power is null or combat_power >= 0);

drop index if exists public.lokki_characters_one_main_per_user_idx;
alter table public.lokki_characters drop column if exists is_main;
alter table public.lokki_rosters drop column if exists representative_character_name;

grant update (representative_character_name) on table public.lokki_profiles to authenticated;
grant insert (user_id) on table public.lokki_rosters to authenticated;
grant insert (combat_power) on table public.lokki_characters to authenticated;
grant update (combat_power) on table public.lokki_characters to authenticated;

drop function if exists public.lokki_sync_roster(text, jsonb);

create or replace function public.lokki_sync_roster(
  p_characters jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_roster_id uuid;
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_characters is null or jsonb_typeof(p_characters) <> 'array' then
    raise exception 'characters must be a non-null array';
  end if;
  if jsonb_array_length(p_characters) = 0 then
    raise exception 'characters must not be empty';
  end if;

  insert into public.lokki_rosters (user_id)
  values (current_user_id)
  on conflict (user_id) do nothing;

  select id into current_roster_id
  from public.lokki_rosters
  where user_id = current_user_id;

  insert into public.lokki_characters (
    user_id,
    roster_id,
    character_name,
    server_name,
    character_class,
    item_level,
    combat_power,
    last_synced_at
  )
  select
    current_user_id,
    current_roster_id,
    character_name,
    server_name,
    character_class,
    item_level,
    combat_power,
    last_synced_at
  from jsonb_to_recordset(p_characters) as character_data (
    character_name text,
    server_name text,
    character_class text,
    item_level numeric,
    combat_power numeric,
    last_synced_at timestamptz
  )
  on conflict (user_id, character_name) do update set
    roster_id = excluded.roster_id,
    server_name = excluded.server_name,
    character_class = excluded.character_class,
    item_level = excluded.item_level,
    combat_power = coalesce(excluded.combat_power, public.lokki_characters.combat_power),
    last_synced_at = excluded.last_synced_at;

  delete from public.lokki_characters existing
  where existing.user_id = current_user_id
    and not exists (
      select 1
      from jsonb_array_elements(p_characters) item
      where item ->> 'character_name' = existing.character_name
    );
end;
$$;

revoke all on function public.lokki_sync_roster(jsonb) from public, anon;
grant execute on function public.lokki_sync_roster(jsonb) to authenticated;

create or replace function public.lokki_set_representative(
  p_representative_character_name text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  update public.lokki_profiles
  set representative_character_name = p_representative_character_name
  where user_id = current_user_id;
end;
$$;

revoke all on function public.lokki_set_representative(text) from public, anon;
grant execute on function public.lokki_set_representative(text) to authenticated;
