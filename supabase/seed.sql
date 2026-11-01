-- Fake people and households for local development. Nothing here is real.
-- Sign in locally with any of these emails; the link arrives in Mailpit at
-- http://127.0.0.1:54324. Sam Rivera is a steward.

create temporary table seed_people (n int, name text, email text, phone text, contact text, langs text[], house int, bio text, inviter int, steward boolean);
insert into seed_people values
  (1,  'Sam Rivera',    'sam@example.test',    '215-555-0101', 'text',  '{English,Spanish}', 1, 'Has a big ladder and a truck.', null, true),
  (2,  'Rosa Delgado',  'rosa@example.test',   '215-555-0102', 'call',  '{Spanish,English}', 1, null, 1, false),
  (3,  'Marcus Bell',   'marcus@example.test', '215-555-0103', 'text',  '{English}',         2, 'Bikes and camping gear.', 1, false),
  (4,  'Linh Tran',     'linh@example.test',   '215-555-0104', 'email', '{English,Vietnamese}', 3, null, 1, false),
  (5,  'Ade Okafor',    'ade@example.test',    '215-555-0105', 'text',  '{English}',         4, 'Garden tools, happy to show how to use them.', 3, false),
  (6,  'Priya Shah',    'priya@example.test',  null,           'email', '{English,Gujarati}', 5, null, 4, false),
  (7,  'Tom Kowalski',  'tom@example.test',    '215-555-0107', 'call',  '{English,Polish}',  6, null, 2, false),
  (8,  'Gabi Santos',   'gabi@example.test',   '215-555-0108', 'text',  '{Portuguese,English}', 7, null, 5, false),
  (9,  'Jen Murphy',    'jen@example.test',    '215-555-0109', 'text',  '{English}',         8, 'Paddle board in the basement.', 1, false),
  (10, 'Kev Murphy',    'kev@example.test',    '215-555-0110', 'call',  '{English}',         8, null, 9, false),
  (11, 'Dana Lee',      'dana@example.test',   '215-555-0111', 'email', '{English,Korean}',  3, null, 4, false),
  (12, 'Omar Haddad',   'omar@example.test',   '215-555-0112', 'text',  '{Arabic,English}',  5, null, 6, false);

create temporary table seed_houses (n int, name text, address text);
insert into seed_houses values
  (1, 'Blue door',       '101 Example St'),
  (2, 'Bike house',      '103 Example St'),
  (3, 'Tran-Lee',        '106 Example St'),
  (4, 'Corner garden',   '110 Example St'),
  (5, 'Green awning',    '112 Example St'),
  (6, 'Kowalski',        '115 Example St'),
  (7, 'Yellow steps',    '118 Example St'),
  (8, 'The Murphys',     '121 Example St');

-- Fixed ids keep links stable across resets.
create temporary table seed_ids as
  select n, ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id from seed_people;
create temporary table seed_house_ids as
  select n, ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid as id from seed_houses;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, reauthentication_token, phone_change, phone_change_token
)
select '00000000-0000-0000-0000-000000000000', i.id, 'authenticated', 'authenticated', p.email, '', now(),
       '{"provider":"email","providers":["email"]}', '{}', now(), now(),
       '', '', '', '', '', '', '', ''
  from seed_people p join seed_ids i using (n);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select i.id::text, i.id, jsonb_build_object('sub', i.id::text, 'email', p.email, 'email_verified', true),
       'email', now(), now(), now()
  from seed_people p join seed_ids i using (n);

insert into public.households (id, name, address)
select hi.id, h.name, h.address from seed_houses h join seed_house_ids hi using (n);

update public.profiles pr
   set display_name = p.name,
       phone = p.phone,
       preferred_contact = p.contact,
       languages = p.langs,
       bio = p.bio,
       household_id = hi.id,
       invited_by = inv.id,
       role = case when p.steward then 'steward' else 'member' end
  from seed_people p
  join seed_ids i using (n)
  join seed_house_ids hi on hi.n = p.house
  left join seed_ids inv on inv.n = p.inviter
 where pr.id = i.id;

insert into public.issues (reporter_id, about_profile_id, kind, description)
select (select id from seed_ids where n = 3), (select id from seed_ids where n = 9),
       'late', 'Tent came back a few days after we said.';

insert into public.issues (reporter_id, about_profile_id, kind, description, status, resolution_note)
select (select id from seed_ids where n = 5), (select id from seed_ids where n = 8),
       'damaged', 'Rake handle cracked.', 'open', null;
-- The resolve trigger records auth.uid() as the resolver, so act as Gabi.
select set_config('request.jwt.claims', json_build_object('sub', id)::text, false) from seed_ids where n = 8;
update public.issues set status = 'resolved', resolution_note = 'Gabi replaced the handle.'
 where description = 'Rake handle cracked.';
select set_config('request.jwt.claims', '', false);

insert into public.invites (inviter_id, email)
select id, 'friend.of.sam@example.test' from seed_ids where n = 1;

-- Garage Share. Listing logs an event as the signed-in person, so each
-- item is inserted acting as its owner.
create temporary table seed_items (n int, owner int, category text, name text, cost int, comes_with text, location text, condition text);
insert into seed_items values
  (1, 1,  'Tools',             'Extension ladder (24 ft)', 25000, null,                              'Side alley',    'Sturdy, a little paint on it'),
  (2, 1,  'Tools',             'Pressure washer',          18000, 'Two nozzles, 25 ft hose',         'Basement',      'Works well'),
  (3, 3,  'Outdoors & sports', 'Four-person tent',         20000, 'Stakes, rain fly',                'Hall closet',   'One small patch on the floor'),
  (4, 3,  'Outdoors & sports', 'Floor bike pump',           4000, null,                              'Front hall',    'Works well'),
  (5, 5,  'Gardening',         'Wheelbarrow',               9000, null,                              'Back yard',     'Tire holds air'),
  (6, 5,  'Gardening',         'Hedge trimmer',            12000, 'Battery and charger',             'Shed',          'Sharp'),
  (7, 9,  'Outdoors & sports', 'Paddle board',             60000, 'Paddle, leash, pump',             'Basement',      'Good'),
  (8, 7,  'Tools',             'Cordless drill',           15000, 'Charger, two batteries, bit set', 'Kitchen drawer','Works well');

do $$
declare r record;
begin
  for r in
    select s.*, ('20000000-0000-4000-8000-' || lpad(s.n::text, 12, '0'))::uuid as item_id, i.id as owner_id, p.household_id
      from seed_items s join seed_ids i on i.n = s.owner join public.profiles p on p.id = i.id
  loop
    perform set_config('request.jwt.claims', json_build_object('sub', r.owner_id)::text, true);
    insert into public.garage_items (id, household_id, category_id, name, replacement_cost_cents, comes_with, location, condition, created_by)
    values (r.item_id, r.household_id, (select id from public.garage_categories where name = r.category),
            r.name, r.cost, r.comes_with, r.location, r.condition, r.owner_id);
  end loop;
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Rosa has the tent and Omar is waiting for it. Dana asked for the drill.
insert into public.garage_loans (item_id, borrower_id, started_by, started_at, due_on)
select '20000000-0000-4000-8000-000000000003', (select id from seed_ids where n = 2), (select id from seed_ids where n = 3),
       now() - interval '4 days', (now() + interval '3 days')::date;
insert into public.garage_requests (item_id, requester_id, created_at) values
  ('20000000-0000-4000-8000-000000000003', (select id from seed_ids where n = 12), now() - interval '1 day'),
  ('20000000-0000-4000-8000-000000000008', (select id from seed_ids where n = 11), now() - interval '2 hours');
