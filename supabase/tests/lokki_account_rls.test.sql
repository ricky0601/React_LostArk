-- Run with `supabase test db` after applying migrations locally.
-- The transaction is rolled back, including the two temporary Auth users.

begin;
select plan(24);

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

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select user_id from public.lokki_profiles order by user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'an authenticated user reads only their profile'
);
select results_eq(
  $$insert into public.lokki_rosters (user_id, representative_character_name)
    values ('11111111-1111-1111-1111-111111111111', '테스트대표')
    returning representative_character_name$$,
  array['테스트대표'::text],
  'owner creates their roster'
);
select results_eq(
  $$update public.lokki_rosters
    set representative_character_name = '변경대표'
    returning representative_character_name$$,
  array['변경대표'::text],
  'owner updates their roster'
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
    '새대표',
    '[{"character_name":"테스트캐릭터","server_name":"루페온","item_level":1700,"last_synced_at":"2026-09-04T12:00:00Z"},{"character_name":"새대표","server_name":"카단","item_level":1710,"combat_power":123456,"last_synced_at":"2026-09-04T12:00:00Z"}]'::jsonb
  )$$,
  'owner atomically upserts a complete roster'
);
select results_eq(
  $$select representative_character_name || ':' || count(*)::text
    from public.lokki_rosters join public.lokki_characters on lokki_characters.roster_id = lokki_rosters.id
    group by representative_character_name$$,
  array['새대표:2'::text],
  'sync sets the representative and avoids duplicate roster rows'
);
select lives_ok(
  $$select public.lokki_sync_roster(
    '새대표',
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
  $$update public.lokki_rosters
    set representative_character_name = '탈취'
    returning id$$,
  'another user cannot update the owner roster'
);
select is_empty(
  $$delete from public.lokki_rosters returning id$$,
  'another user cannot delete the owner roster'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$delete from public.lokki_profiles returning user_id$$,
  array['11111111-1111-1111-1111-111111111111'::uuid],
  'deleting the owner profile cascades through their stored data'
);

select * from finish();
rollback;
