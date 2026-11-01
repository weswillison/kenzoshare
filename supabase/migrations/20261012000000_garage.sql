-- v1 Garage Share: items owned by households, requests that double as a
-- waitlist, loans, and photos.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.garage_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(trim(name)) > 0),
  sort        int not null default 100,
  created_at  timestamptz not null default now()
);

insert into public.garage_categories (name, sort) values
  ('Tools', 10), ('Gardening', 20), ('Outdoors & sports', 30);

create table public.garage_items (
  -- The browser picks the id so the photo can be uploaded under it before
  -- the item is saved.
  id                      uuid primary key default gen_random_uuid(),
  household_id            uuid not null references public.households,
  category_id             uuid not null references public.garage_categories,
  name                    text not null check (length(trim(name)) > 0),
  photo_path              text,
  condition               text,
  replacement_cost_cents  int not null check (replacement_cost_cents >= 0),
  location                text,
  comes_with              text,
  notes                   text,
  status                  text not null default 'available' check (status in ('available', 'paused', 'retired')),
  -- Set with status = 'paused' for a snooze; null means paused until changed.
  paused_until            timestamptz,
  created_by              uuid not null default auth.uid() references public.profiles,
  created_at              timestamptz not null default now()
);
create index on public.garage_items (household_id);

-- A request is someone asking to borrow. While the item is out it waits in
-- line, oldest first.
create table public.garage_requests (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.garage_items,
  requester_id  uuid not null references public.profiles,
  due_on        date,
  status        text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled', 'declined')),
  created_at    timestamptz not null default now(),
  decided_by    uuid references public.profiles,
  decided_at    timestamptz
);
create unique index garage_requests_one_pending on public.garage_requests (item_id, requester_id) where status = 'pending';
create index on public.garage_requests (item_id, created_at) where status = 'pending';

create table public.garage_loans (
  id                  uuid primary key default gen_random_uuid(),
  item_id             uuid not null references public.garage_items,
  borrower_id         uuid not null references public.profiles,
  request_id          uuid references public.garage_requests,
  previous_loan_id    uuid references public.garage_loans,
  started_at          timestamptz not null default now(),
  started_by          uuid not null references public.profiles,
  start_photo_path    text,
  due_on              date,
  ended_at            timestamptz,
  ended_by            uuid references public.profiles,
  return_photo_path   text,
  confirmed_at        timestamptz,
  confirmed_by        uuid references public.profiles
);
-- The database refuses two people holding the same item at once.
create unique index garage_loans_one_open on public.garage_loans (item_id) where ended_at is null;
create index on public.garage_loans (borrower_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.garage_item_household(p_item uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.garage_items where id = p_item;
$$;

create function public.is_my_item(p_item uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.my_household_id() is not null
     and public.garage_item_household(p_item) = public.my_household_id();
$$;

grant execute on function public.garage_item_household, public.is_my_item to authenticated;

-- ---------------------------------------------------------------------------
-- Actions. Each one checks its rules, changes rows, and logs its event in
-- one transaction, so a hand-off can't half happen.
-- ---------------------------------------------------------------------------

create function public.garage_request(p_item uuid, p_due_on date default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_item public.garage_items;
  v_id uuid;
begin
  if not public.is_active_member() then raise exception 'not an active member'; end if;
  select * into v_item from public.garage_items where id = p_item;
  if v_item.id is null or v_item.status <> 'available' then raise exception 'item is not lending right now'; end if;
  if public.is_my_item(p_item) then raise exception 'this is your household''s item'; end if;

  insert into public.garage_requests (item_id, requester_id, due_on)
  values (p_item, auth.uid(), p_due_on) returning id into v_id;
  perform public.log_event(auth.uid(), 'item_requested', 'garage', 'garage_item', p_item);
  return v_id;
end;
$$;

-- The owner's household confirms the item changed hands.
create function public.garage_hand_over(p_request uuid, p_photo text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.garage_requests;
  v_id uuid;
begin
  select * into v_req from public.garage_requests where id = p_request and status = 'pending' for update;
  if v_req.id is null then raise exception 'request not found'; end if;
  if not public.is_my_item(v_req.item_id) then raise exception 'not your household''s item'; end if;

  insert into public.garage_loans (item_id, borrower_id, request_id, started_by, start_photo_path, due_on)
  values (v_req.item_id, v_req.requester_id, v_req.id, auth.uid(), p_photo, v_req.due_on)
  returning id into v_id;
  update public.garage_requests set status = 'fulfilled', decided_by = auth.uid(), decided_at = now() where id = v_req.id;
  perform public.log_event(auth.uid(), 'item_lent', 'garage', 'garage_item', v_req.item_id, v_req.requester_id);
  return v_id;
end;
$$;

-- The requester cancels, or the owner's household says no.
create function public.garage_close_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.garage_requests;
begin
  select * into v_req from public.garage_requests where id = p_request and status = 'pending';
  if v_req.id is null then raise exception 'request not found'; end if;

  if v_req.requester_id = auth.uid() then
    update public.garage_requests set status = 'cancelled', decided_by = auth.uid(), decided_at = now() where id = p_request;
  elsif public.is_my_item(v_req.item_id) then
    update public.garage_requests set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = p_request;
    perform public.log_event(auth.uid(), 'request_declined', 'garage', 'garage_item', v_req.item_id, v_req.requester_id);
  else
    raise exception 'not your request';
  end if;
end;
$$;

-- The borrower or the owner's household marks it returned. It's available
-- again right away. Returns the next person in line, if any, so the app can
-- email them.
create function public.garage_return(p_loan uuid, p_photo text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.garage_loans;
  v_next uuid;
begin
  select * into v_loan from public.garage_loans where id = p_loan and ended_at is null for update;
  if v_loan.id is null then raise exception 'loan not found'; end if;
  if v_loan.borrower_id <> auth.uid() and not public.is_my_item(v_loan.item_id) then
    raise exception 'not your loan';
  end if;

  update public.garage_loans
     set ended_at = now(), ended_by = auth.uid(), return_photo_path = p_photo,
         confirmed_at = case when public.is_my_item(item_id) then now() end,
         confirmed_by = case when public.is_my_item(item_id) then auth.uid() end
   where id = p_loan;
  perform public.log_event(auth.uid(), 'item_returned', 'garage', 'garage_item', v_loan.item_id,
    case when auth.uid() = v_loan.borrower_id then null else v_loan.borrower_id end);

  select requester_id into v_next from public.garage_requests
   where item_id = v_loan.item_id and status = 'pending' order by created_at limit 1;
  return v_next;
end;
$$;

create function public.garage_confirm_return(p_loan uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.garage_loans;
begin
  select * into v_loan from public.garage_loans where id = p_loan and ended_at is not null and confirmed_at is null;
  if v_loan.id is null then raise exception 'nothing to confirm'; end if;
  if not public.is_my_item(v_loan.item_id) then raise exception 'not your household''s item'; end if;

  update public.garage_loans set confirmed_at = now(), confirmed_by = auth.uid() where id = p_loan;
  perform public.log_event(auth.uid(), 'return_confirmed', 'garage', 'garage_item', v_loan.item_id, v_loan.borrower_id);
end;
$$;

-- The borrower passes the item straight to someone in line.
create function public.garage_hand_off(p_loan uuid, p_request uuid, p_photo text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.garage_loans;
  v_req public.garage_requests;
  v_id uuid;
begin
  select * into v_loan from public.garage_loans where id = p_loan and ended_at is null for update;
  if v_loan.id is null or v_loan.borrower_id <> auth.uid() then raise exception 'not your loan'; end if;
  select * into v_req from public.garage_requests
   where id = p_request and item_id = v_loan.item_id and status = 'pending' for update;
  if v_req.id is null then raise exception 'that person isn''t waiting for this item'; end if;

  update public.garage_loans set ended_at = now(), ended_by = auth.uid(), return_photo_path = p_photo where id = p_loan;
  insert into public.garage_loans (item_id, borrower_id, request_id, previous_loan_id, started_by, start_photo_path, due_on)
  values (v_loan.item_id, v_req.requester_id, v_req.id, v_loan.id, auth.uid(), p_photo, v_req.due_on)
  returning id into v_id;
  update public.garage_requests set status = 'fulfilled', decided_by = auth.uid(), decided_at = now() where id = v_req.id;
  perform public.log_event(auth.uid(), 'item_handed_off', 'garage', 'garage_item', v_loan.item_id, v_req.requester_id);
  return v_id;
end;
$$;

revoke execute on function public.garage_request, public.garage_hand_over, public.garage_close_request,
  public.garage_return, public.garage_confirm_return, public.garage_hand_off from public, anon;
grant execute on function public.garage_request, public.garage_hand_over, public.garage_close_request,
  public.garage_return, public.garage_confirm_return, public.garage_hand_off to authenticated;

-- Listing, pausing, and retiring are plain edits; this trigger logs them.
create function public.log_garage_item() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_event(auth.uid(), 'item_listed', 'garage', 'garage_item', new.id);
  elsif old.status <> new.status then
    perform public.log_event(auth.uid(),
      case new.status when 'paused' then 'item_paused' when 'retired' then 'item_retired' else 'item_unpaused' end,
      'garage', 'garage_item', new.id);
  end if;
  return new;
end;
$$;
create trigger garage_items_log after insert or update on public.garage_items
  for each row execute function public.log_garage_item();

-- Waiting requests are closed when an item stops lending.
create function public.close_requests_on_retire() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'retired' and old.status <> 'retired' then
    update public.garage_requests set status = 'declined', decided_by = auth.uid(), decided_at = now()
     where item_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
create trigger garage_items_retire after update of status on public.garage_items
  for each row execute function public.close_requests_on_retire();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

revoke all on public.garage_categories, public.garage_items, public.garage_requests, public.garage_loans
  from anon, authenticated, service_role;

alter table public.garage_categories enable row level security;
alter table public.garage_items      enable row level security;
alter table public.garage_requests   enable row level security;
alter table public.garage_loans      enable row level security;

-- categories: members see them; stewards add them.
create policy categories_read on public.garage_categories for select using (public.is_active_member());
create policy categories_add on public.garage_categories for insert with check (public.is_steward());
grant select, insert (name, sort) on public.garage_categories to authenticated;

-- items: members see every item. Only the owning household lists or edits.
create policy items_read on public.garage_items for select using (public.is_active_member());
create policy items_create on public.garage_items for insert
  with check (household_id = public.my_household_id() and created_by = auth.uid());
create policy items_edit on public.garage_items for update
  using (household_id = public.my_household_id())
  with check (household_id = public.my_household_id());
grant select,
  insert (id, household_id, category_id, name, photo_path, condition, replacement_cost_cents, location, comes_with, notes),
  update (category_id, name, photo_path, condition, replacement_cost_cents, location, comes_with, notes, status, paused_until)
  on public.garage_items to authenticated;

-- requests: the requester and the owning household see them. Others see
-- only the queue length, through garage_queue(). Changes go through the
-- functions above.
create policy requests_read on public.garage_requests for select
  using (requester_id = auth.uid() or public.is_my_item(item_id));
grant select on public.garage_requests to authenticated;

-- loans: everyone sees who has an item now. Past loans are visible only to
-- the owning household and to the borrower.
create policy loans_read on public.garage_loans for select
  using (
    (ended_at is null and public.is_active_member())
    or borrower_id = auth.uid()
    or public.is_my_item(item_id)
  );
grant select on public.garage_loans to authenticated;

-- How many are waiting, and where you are in line.
create function public.garage_queue(p_item uuid)
returns table (waiting int, my_position int)
language sql stable security definer set search_path = '' as $$
  with q as (
    select requester_id, row_number() over (order by created_at) as pos
      from public.garage_requests where item_id = p_item and status = 'pending'
  )
  select (select count(*)::int from q), (select pos::int from q where requester_id = auth.uid())
   where public.is_active_member();
$$;
revoke execute on function public.garage_queue from public, anon;
grant execute on function public.garage_queue to authenticated;

-- The next person waiting, for whoever can hand the item to them: the
-- current borrower or the owning household.
create function public.garage_next_in_line(p_item uuid)
returns table (request_id uuid, requester_id uuid, display_name text)
language sql stable security definer set search_path = '' as $$
  select r.id, r.requester_id, p.display_name
    from public.garage_requests r join public.profiles p on p.id = r.requester_id
   where r.item_id = p_item and r.status = 'pending'
     and (public.is_my_item(p_item) or exists (
       select 1 from public.garage_loans l where l.item_id = p_item and l.ended_at is null and l.borrower_id = auth.uid()))
   order by r.created_at limit 1;
$$;
revoke execute on function public.garage_next_in_line from public, anon;
grant execute on function public.garage_next_in_line to authenticated;

-- Plain facts for a profile. Never rates or rankings.
create function public.profile_facts(p_profile uuid)
returns table (things_lent int, times_borrowed int)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::int from public.garage_items i
      join public.profiles p on p.household_id = i.household_id
     where p.id = p_profile and i.status <> 'retired'),
    (select count(*)::int from public.garage_loans where borrower_id = p_profile)
   where public.is_active_member();
$$;
revoke execute on function public.profile_facts from public, anon;
grant execute on function public.profile_facts to authenticated;

-- ---------------------------------------------------------------------------
-- Photos. Paths are item/<item id>/<file> or loan/<loan id>/<file>.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garage-photos', 'garage-photos', false, 2097152, array['image/jpeg']);

create function public.can_upload_garage_photo(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_id uuid;
begin
  if array_length(v_parts, 1) <> 3 then return false; end if;
  begin
    v_id := v_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if v_parts[1] = 'item' then
    -- A new item has no row yet, so its id must be unused; an existing one
    -- must belong to the uploader's household.
    return public.my_household_id() is not null
       and (public.is_my_item(v_id) or not exists (select 1 from public.garage_items where id = v_id));
  elsif v_parts[1] = 'loan' then
    return exists (
      select 1 from public.garage_loans l
       where l.id = v_id and (l.borrower_id = auth.uid() or public.is_my_item(l.item_id))
    );
  end if;
  return false;
end;
$$;
grant execute on function public.can_upload_garage_photo to authenticated;

create policy garage_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'garage-photos' and public.is_active_member());
create policy garage_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'garage-photos' and public.is_active_member() and public.can_upload_garage_photo(name));
