begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

alter table public.activity_events disable trigger activity_events_append_only;
alter table public.activity_events disable trigger activity_events_no_truncate;
truncate public.garage_loans, public.garage_requests, public.garage_items, public.activity_events,
  public.issues, public.household_join_requests, public.invites, public.profiles, public.households cascade;
delete from auth.users;
alter table public.activity_events enable trigger activity_events_append_only;
alter table public.activity_events enable trigger activity_events_no_truncate;

-- Ana and Ben live at Blue door and own the drill. Cam lives at Corner
-- house. Dee is a steward elsewhere. Fay has no household yet.
insert into auth.users (id, email, email_confirmed_at, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'cam@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000d', 'dee@example.test', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000f', 'fay@example.test', now(), 'authenticated', 'authenticated');
insert into public.households (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Blue door'),
  ('10000000-0000-0000-0000-000000000002', 'Corner house'),
  ('10000000-0000-0000-0000-000000000003', 'Green awning');
update public.profiles set household_id = '10000000-0000-0000-0000-000000000001'
 where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
update public.profiles set household_id = '10000000-0000-0000-0000-000000000002' where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set household_id = '10000000-0000-0000-0000-000000000003', role = 'steward' where id = '00000000-0000-0000-0000-00000000000d';

create temporary table t (k text primary key, v uuid);
grant all on t to authenticated;

-- ---------------------------------------------------------------- Ana lists the drill
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok($$
  insert into public.garage_items (id, household_id, category_id, name, replacement_cost_cents)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
          (select id from public.garage_categories where name = 'Tools'), 'Drill', 12000)
$$, 'a household member can list an item');
select throws_ok($$ select public.garage_request('20000000-0000-0000-0000-000000000001') $$, 'P0001', null,
  'you cannot request your own household''s item');
select is(public.can_upload_garage_photo('item/20000000-0000-0000-0000-000000000001/a.jpg'), true,
  'the owner can upload the item''s photo');

-- ---------------------------------------------------------------- Cam
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is((select count(*)::int from public.garage_items), 1, 'members see every item');
update public.garage_items set name = 'Mine now' where id = '20000000-0000-0000-0000-000000000001';
select throws_ok($$
  insert into public.garage_items (household_id, category_id, name, replacement_cost_cents)
  values ('10000000-0000-0000-0000-000000000001', (select id from public.garage_categories limit 1), 'Fake', 1)
$$, '42501', null, 'members cannot list items for another household');
select throws_ok($$ insert into public.garage_categories (name) values ('Cars') $$, '42501', null,
  'members cannot add categories');
select is(public.can_upload_garage_photo('item/20000000-0000-0000-0000-000000000001/b.jpg'), false,
  'other households cannot replace an item''s photo');
select lives_ok($$ insert into t select 'cam_req', public.garage_request('20000000-0000-0000-0000-000000000001') $$,
  'a member can request an item');
select throws_ok($$ select public.garage_hand_over((select v from t where k = 'cam_req')) $$, 'P0001', null,
  'the requester cannot confirm their own hand-over');
select throws_ok($$
  insert into public.garage_loans (item_id, borrower_id, started_by)
  values ('20000000-0000-0000-0000-000000000001', auth.uid(), auth.uid())
$$, '42501', null, 'nobody writes loans directly');

-- ---------------------------------------------------------------- Fay joins the line
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select lives_ok($$ insert into t select 'fay_req', public.garage_request('20000000-0000-0000-0000-000000000001') $$,
  'a member without a household can still request');
select is((select count(*)::int from public.garage_requests), 1, 'you see only your own requests');
select is((select my_position from public.garage_queue('20000000-0000-0000-0000-000000000001')), 2,
  'the line is first come, first served');

-- ---------------------------------------------------------------- Ben hands it to Cam
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.garage_requests), 2, 'the owning household sees every request');
select lives_ok($$ insert into t select 'cam_loan', public.garage_hand_over((select v from t where k = 'cam_req')) $$,
  'anyone in the owning household can confirm a hand-over');
select throws_ok($$ select public.garage_hand_over((select v from t where k = 'fay_req')) $$, '23505', null,
  'an item that is out cannot be handed to a second person');
select throws_ok($$ update public.garage_items set status = 'retired' where id = '20000000-0000-0000-0000-000000000001' $$,
  'P0001', 'item is out right now', 'an item that is out cannot stop being listed');

-- ---------------------------------------------------------------- Dee sees who has it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select borrower_id from public.garage_loans), '00000000-0000-0000-0000-00000000000c'::uuid,
  'everyone sees who has an item right now');
select lives_ok($$ insert into public.garage_categories (name) values ('Kitchen') $$, 'stewards can add categories');
select lives_ok($$ insert into t select 'dee_req', public.garage_request('20000000-0000-0000-0000-000000000001') $$,
  'Dee joins the line behind Fay');
-- Everything in this test shares one now(); put Dee's request clearly later.
reset role;
update public.garage_requests set created_at = now() + interval '1 minute' where id = (select v from t where k = 'dee_req');
set local role authenticated;

-- ---------------------------------------------------------------- Cam hands off to Fay
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is(public.can_upload_garage_photo('loan/' || (select v from t where k = 'cam_loan') || '/r.jpg'), true,
  'the borrower can add a photo to their loan');
select throws_ok($$ select public.garage_return((select v from t where k = 'cam_req')) $$, 'P0001', null,
  'returning needs a real open loan');
select is((select display_name from public.garage_next_in_line('20000000-0000-0000-0000-000000000001')), '',
  'the borrower can see who is next in line');
select throws_ok($$ select public.garage_hand_off((select v from t where k = 'cam_loan'), (select v from t where k = 'dee_req')) $$,
  'P0001', 'that person isn''t next in line', 'a hand-off cannot skip ahead in line');
select lives_ok($$ select public.garage_hand_off((select v from t where k = 'cam_loan'), (select v from t where k = 'fay_req')) $$,
  'the borrower can hand off to the next person in line');
select is((select count(*)::int from public.garage_loans), 2, 'borrowers see their own past loans and current ones');

-- ---------------------------------------------------------------- Dee again
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select count(*)::int from public.garage_next_in_line('20000000-0000-0000-0000-000000000001')), 0,
  'people not involved cannot see who is in line');
select is((select count(*)::int from public.garage_loans), 1, 'others see only the open loan, not history');

-- ---------------------------------------------------------------- Ana pauses while Fay has it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.garage_items set status = 'paused' where id = '20000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select throws_ok($$ select public.garage_hand_off((select id from public.garage_loans where ended_at is null), (select v from t where k = 'dee_req')) $$,
  'P0001', 'item is not lending right now', 'a paused item cannot be handed off');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.garage_items set status = 'available' where id = '20000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select lives_ok($$ select public.garage_close_request((select v from t where k = 'dee_req')) $$, 'Dee leaves the line');

-- ---------------------------------------------------------------- Fay returns it
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000f","role":"authenticated"}', true);
select is(public.garage_return((select id from public.garage_loans where ended_at is null)), null,
  'returning reports nobody waiting when the line is empty');

-- ---------------------------------------------------------------- Ana confirms and pauses
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select is((select count(*)::int from public.garage_loans), 2, 'the owning household sees the full history');
select throws_ok($$ select public.garage_confirm_return((select v from t where k = 'cam_loan')) $$, 'P0001', 'nothing to confirm',
  'a loan that was handed off has no return to confirm');
select lives_ok($$ select public.garage_confirm_return((select id from public.garage_loans where borrower_id = '00000000-0000-0000-0000-00000000000f')) $$,
  'the owner can confirm a return');
select lives_ok($$ update public.garage_items set status = 'paused' where id = '20000000-0000-0000-0000-000000000001' $$,
  'the owner can pause lending');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select throws_ok($$ select public.garage_request('20000000-0000-0000-0000-000000000001') $$, 'P0001', 'item is not lending right now',
  'paused items cannot be requested');

reset role;
set local role anon;
select throws_ok($$ select * from public.garage_items $$, '42501', null, 'logged-out visitors see no items');

reset role;
select is((select name from public.garage_items where id = '20000000-0000-0000-0000-000000000001'), 'Drill',
  'Cam''s edit to another household''s item changed nothing');

select * from finish();
rollback;
