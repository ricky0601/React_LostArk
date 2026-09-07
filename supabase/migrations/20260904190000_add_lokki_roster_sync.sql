-- #77: Atomic roster synchronization and representative-character management.

alter table public.lokki_characters
  add column combat_power numeric(20, 2)
    check (combat_power is null or combat_power >= 0);

grant insert (combat_power) on table public.lokki_characters to authenticated;
grant update (combat_power) on table public.lokki_characters to authenticated;

create or replace function public.lokki_sync_roster(
  p_representative_character_name text,
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
  if jsonb_typeof(p_characters) <> 'array' then
    raise exception 'characters must be an array';
  end if;
  if p_representative_character_name is not null and not exists (
    select 1
    from jsonb_array_elements(p_characters) item
    where item ->> 'character_name' = p_representative_character_name
  ) then
    raise exception 'representative character must belong to the roster';
  end if;

  insert into public.lokki_rosters (user_id, representative_character_name)
  values (current_user_id, p_representative_character_name)
  on conflict (user_id) do update
    set representative_character_name = excluded.representative_character_name
  returning id into current_roster_id;

  update public.lokki_characters
  set is_main = false
  where user_id = current_user_id and is_main;

  insert into public.lokki_characters (
    user_id,
    roster_id,
    character_name,
    server_name,
    character_class,
    item_level,
    combat_power,
    is_main,
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
    character_name = p_representative_character_name,
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
    is_main = excluded.is_main,
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

revoke all on function public.lokki_sync_roster(text, jsonb) from public, anon;
grant execute on function public.lokki_sync_roster(text, jsonb) to authenticated;

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
  if p_representative_character_name is not null and not exists (
    select 1 from public.lokki_characters
    where user_id = current_user_id
      and character_name = p_representative_character_name
  ) then
    raise exception 'representative character must belong to the roster';
  end if;

  update public.lokki_rosters
  set representative_character_name = p_representative_character_name
  where user_id = current_user_id;

  update public.lokki_characters
  set is_main = (character_name = p_representative_character_name)
  where user_id = current_user_id
    and is_main is distinct from (character_name = p_representative_character_name);
end;
$$;

revoke all on function public.lokki_set_representative(text) from public, anon;
grant execute on function public.lokki_set_representative(text) to authenticated;
