-- Run with `supabase test db` after applying migrations locally.
-- The transaction is rolled back, including the two temporary Auth users.

begin;
select plan(35);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'lokki-owner@example.invalid'),
  ('22222222-2222-2222-2222-222222222222', 'lokki-other@example.invalid');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.lokki_profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.lokki_rosters'::regclass),
  'rosters has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.lokki_characters'::regclass),
  'characters has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.lokki_weekly_states'::regclass),
  'weekly states has RLS enabled'
);

set local role anon;
select throws_ok(
  $$select * from public.lokki_profiles$$,
  '42501',
  null,
  'anonymous users cannot read profiles'
);
select throws_ok(
  $$select public.lokki_sync_roster('[{"character_name":"익명캐릭터"}]'::jsonb)$$,
  '42501',
  null,
  'anonymous users cannot execute roster sync'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select user_id from public.lokki_profiles order by user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'an authenticated user reads only their profile'
);
select results_eq(
  $$insert into public.lokki_rosters (user_id)
    values ('11111111-1111-1111-1111-111111111111')
    returning user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'owner creates their roster'
);
select results_eq(
  $$update public.lokki_profiles
    set representative_character_name = '변경대표'
    returning representative_character_name$$,
  array['변경대표'::text],
  'owner updates their representative character on the profile'
);
select throws_ok(
  $$insert into public.lokki_rosters (user_id)
    values ('22222222-2222-2222-2222-222222222222')$$,
  '42501',
  null,
  'owner cannot create another user roster'
);
select throws_ok(
  $$update public.lokki_profiles
    set discord_id = '123456789'$$,
  '42501',
  null,
  'browser role cannot change server-managed Discord ID'
);
select results_eq(
  $$insert into public.lokki_characters (user_id, roster_id, character_name)
    select user_id, id, '테스트캐릭터'
    from public.lokki_rosters
    returning character_name$$,
  array['테스트캐릭터'::text],
  'owner creates a character in their roster'
);
select results_eq(
  $$insert into public.lokki_weekly_states (user_id, character_id, week_start, activity_key)
    select user_id, id, date '2026-08-31', 'raid:test'
    from public.lokki_characters
    returning activity_key$$,
  array['raid:test'::text],
  'owner creates a weekly state for their character'
);
select lives_ok(
  $$select public.lokki_sync_roster(
    '[{"character_name":"테스트캐릭터","server_name":"루페온","item_level":1700,"last_synced_at":"2026-09-04T12:00:00Z"},{"character_name":"새대표","server_name":"카단","item_level":1710,"combat_power":123456,"last_synced_at":"2026-09-04T12:00:00Z"}]'::jsonb
  )$$,
  'owner atomically upserts a complete roster'
);
select results_eq(
  $$select count(*)::text || ':' || (select count(*) from public.lokki_characters)::text
    from public.lokki_rosters$$,
  array['1:2'::text],
  'sync avoids duplicate roster rows and stores every character'
);
select lives_ok(
  $$select public.lokki_sync_roster(
    '[{"character_name":"새대표","server_name":"카단","item_level":1711,"last_synced_at":"2026-09-04T13:00:00Z"}]'::jsonb
  )$$,
  'a later complete sync removes missing characters'
);
select results_eq(
  $$select character_name || ':' || item_level::text || ':' || combat_power::text
    from public.lokki_characters$$,
  array['새대표:1711.00:123456.00'::text],
  'sync keeps the last combat power when a profile endpoint is unavailable'
);
select is_empty(
  $$select * from public.lokki_weekly_states$$,
  'removing a missing character cascades its weekly state'
);
select results_eq(
  $$insert into public.lokki_weekly_states (user_id, character_id, week_start, activity_key)
    select user_id, id, date '2026-08-31', 'raid:preserve'
    from public.lokki_characters
    returning activity_key$$,
  array['raid:preserve'::text],
  'owner creates state used by validation rollback checks'
);
select lives_ok(
  $$select public.lokki_set_representative('독립대표')$$,
  'representative character is stored independently from the roster'
);
select results_eq(
  $$select representative_character_name || ':'
      || (select count(*) from public.lokki_characters)::text || ':'
      || (select count(*) from public.lokki_weekly_states)::text
    from public.lokki_profiles$$,
  array['독립대표:1:1'::text],
  'changing the representative leaves roster characters and weekly states unchanged'
);
select throws_ok(
  $$select public.lokki_sync_roster(null)$$,
  'P0001',
  'characters must be a non-null array',
  'sync rejects a null payload'
);
select results_eq(
  $$select representative_character_name || ':'
      || (select count(*) from public.lokki_characters)::text || ':'
      || (select count(*) from public.lokki_weekly_states)::text
    from public.lokki_profiles$$,
  array['독립대표:1:1'::text],
  'null payload leaves profile, characters, and weekly states unchanged'
);
select throws_ok(
  $$select public.lokki_sync_roster('[]'::jsonb)$$,
  'P0001',
  'characters must not be empty',
  'sync rejects an empty payload'
);
select results_eq(
  $$select representative_character_name || ':'
      || (select count(*) from public.lokki_characters)::text || ':'
      || (select count(*) from public.lokki_weekly_states)::text
    from public.lokki_profiles$$,
  array['독립대표:1:1'::text],
  'empty payload leaves profile, characters, and weekly states unchanged'
);
select lives_ok(
  $$select public.lokki_set_representative(null)$$,
  'owner can release the representative character'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is_empty(
  $$select * from public.lokki_rosters$$,
  'another user cannot read the owner roster'
);
select is_empty(
  $$select * from public.lokki_characters$$,
  'another user cannot read the owner characters'
);
select is_empty(
  $$select * from public.lokki_weekly_states$$,
  'another user cannot read the owner weekly states'
);
select is_empty(
  $$update public.lokki_profiles
    set representative_character_name = '탈취'
    returning user_id$$,
  'another user cannot update the owner profile'
);
select is_empty(
  $$delete from public.lokki_rosters returning id$$,
  'another user cannot delete the owner roster'
);
select lives_ok(
  $$select public.lokki_set_representative('다른대표')$$,
  'a user can save a representative before saving an expedition'
);
select lives_ok(
  $$select public.lokki_sync_roster(
    '[{"character_name":"다른대표","server_name":"아만","item_level":1600}]'::jsonb
  )$$,
  'another user can sync only their own roster'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$select coalesce(representative_character_name, 'NULL') || ':'
      || (select count(*) from public.lokki_characters)::text || ':'
      || (select count(*) from public.lokki_weekly_states)::text
    from public.lokki_profiles$$,
  array['NULL:1:1'::text],
  'another user RPC calls do not change the owner data'
);
select results_eq(
  $$delete from public.lokki_profiles returning user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'deleting the owner profile cascades through their stored data'
);

select * from finish();
rollback;
