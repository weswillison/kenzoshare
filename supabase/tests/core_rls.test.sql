begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- Start from an empty database so seed data doesn't change the counts.
-- Everything here is rolled back at the end.
alter table public.activity_events disable trigger activity_events_append_only;
alter table public.activity_events disable trigger activity_events_no_truncate;
truncate public.activity_events, public.issues, public.household_join_requests,
  public.invites, public.profiles, public.households cascade;
delete from auth.users;
alter table public.activity_events enable trigger activity_events_append_only;
alter table public.activity_events enable trigger activity_events_no_truncate;

-- People: Ana and Ben share a house, Cam lives elsewhere, Dee is a steward,
-- Eli has left, Fay is new and has no household yet.
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'cam@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'dee@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000e', 'eli@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000f', 'fay@example.test', now(), 'authenticated', 'authenticated');

insert into public.households (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Blue door'),
  ('10000000-0000-0000-0000-000000000002', 'Corner house');

update public.profiles set household_id = '10000000-0000-0000-0000-000000000001'
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
update public.profiles set household_id = '10000000-0000-0000-0000-000000000002'
 where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set role = 'steward' where id = '00000000-0000-0000-0000-00000000000d';
update public.profiles set status = 'left' where id = '00000000-0000-0000-0000-00000000000e';

insert into public.issues (id, reporter_id, about_profile_id, kind, description) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-00000000000c', 'late', 'Ladder came back a week late');

insert into public.invites (inviter_id, email) values
  ('00000000-0000-0000-0000-00000000000b', 'newperson@example.test');

select is((select count(*)::int from public.profiles), 6, 'confirming an email creates a profile');

-- ---------------------------------------------------------------- as Ana
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 6, 'members see the directory');
select is((select count(*)::int from public.issues), 0, 'members cannot see issues they are not part of');
select is((select count(*)::int from public.invites), 0, 'members cannot see invites others sent');
select is((select count(*)::int from public.activity_events where actor_id <> auth.uid() and coalesce(counterpart_id, auth.uid()) <> auth.uid()), 0,
  'members cannot see other people''s activity');

update public.profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-00000000000c';
select throws_ok($$ update public.profiles set role = 'steward' where id = auth.uid() $$, '42501', null,
  'members cannot make themselves stewards');
select throws_ok($$ update public.profiles set household_id = '10000000-0000-0000-0000-000000000002' where id = auth.uid() $$, '42501', null,
  'members cannot move themselves into a household');
select throws_ok($$ insert into public.activity_events (actor_id, event_type, module) values (auth.uid(), 'fake', 'core') $$, '42501', null,
  'members cannot write to the activity log');
select throws_ok($$ delete from public.activity_events $$, '42501', null,
  'members cannot delete from the activity log');
select throws_ok($$ insert into public.households (name) values ('Sneaky') $$, '42501', null,
  'households are only created through create_household');
select throws_ok($$ select public.create_household('Second home') $$, 'P0001', 'already in a household',
  'members already in a household cannot create another');
select lives_ok($$ update public.profiles set bio = 'Has a ladder' where id = auth.uid() $$,
  'members can edit their own profile');

-- ---------------------------------------------------------------- as Fay
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select lives_ok($$ insert into public.household_join_requests (household_id) values ('10000000-0000-0000-0000-000000000001') $$,
  'a member without a household can ask to join one');

-- ---------------------------------------------------------------- as Cam
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
update public.household_join_requests set status = 'approved' where profile_id = '00000000-0000-0000-0000-00000000000f';
select is((select count(*)::int from public.household_join_requests), 0,
  'other households cannot see a join request');
select is((select count(*)::int from public.issues), 1, 'the person an issue is about can see it');

-- ---------------------------------------------------------------- as Eli (left)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'someone who left sees only their own profile');
select is((select count(*)::int from public.households), 0, 'someone who left cannot see households');

-- ---------------------------------------------------------------- as Ben
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select lives_ok($$ update public.household_join_requests set status = 'approved' where profile_id = '00000000-0000-0000-0000-00000000000f' $$,
  'a current household member can approve a join request');
select lives_ok($$ update public.issues set status = 'resolved', resolution_note = 'Talked it through' where id = '20000000-0000-0000-0000-000000000001' $$,
  'the reporter can resolve an issue');

-- ---------------------------------------------------------------- as Dee (steward)
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select count(*)::int from public.issues), 1, 'stewards see all issues');
select is((select count(*)::int from public.invites), 1, 'stewards see all invites');

-- ---------------------------------------------------------------- as anon
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'logged-out visitors cannot read profiles');

-- ---------------------------------------------------------------- checks as owner
reset role;
select is(
  (select bio from public.profiles where id = '00000000-0000-0000-0000-00000000000c'), null,
  'Ana''s edit to Cam''s profile changed nothing');
select is(
  (select household_id from public.profiles where id = '00000000-0000-0000-0000-00000000000f'),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'approval moves the requester into the household, and Cam''s attempt did not');

select is(
  (select resolved_by from public.issues where id = '20000000-0000-0000-0000-000000000001'),
  '00000000-0000-0000-0000-00000000000b'::uuid,
  'resolving records who resolved it');
select throws_ok($$ delete from public.activity_events $$, 'P0001', 'activity_events is append-only',
  'not even the database owner can delete from the activity log');

select throws_ok($$ truncate public.activity_events $$, 'P0001', 'activity_events is append-only',
  'not even the database owner can truncate the activity log');
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type = 'TRUNCATE'),
  0, 'no client role can truncate any table');

select * from finish();
rollback;
