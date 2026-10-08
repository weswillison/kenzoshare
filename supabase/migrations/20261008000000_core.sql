-- v0 Core: households, profiles, invites, join requests, activity log, issues.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  address     text,
  notes       text,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id                 uuid primary key references auth.users on delete cascade,
  display_name       text not null default '',
  -- Copied from auth.users: clients can't read auth.users, and the directory
  -- needs email as a contact option.
  email              text not null,
  household_id       uuid references public.households,
  phone              text,
  preferred_contact  text check (preferred_contact in ('text', 'call', 'email')),
  languages          text[] not null default '{}',
  bio                text,
  role               text not null default 'member' check (role in ('member', 'steward')),
  status             text not null default 'active' check (status in ('active', 'left')),
  invited_by         uuid references public.profiles,
  joined_at          timestamptz not null default now()
);

-- Supabase's invite email carries the sign-in token. This row records who
-- vouched for whom.
create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  inviter_id  uuid not null default auth.uid() references public.profiles,
  email       text not null check (email like '%@%'),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at  timestamptz not null default now()
);
create unique index invites_one_pending_per_email on public.invites (lower(email)) where status = 'pending';

create table public.household_join_requests (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null default auth.uid() references public.profiles,
  household_id  uuid not null references public.households,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  decided_by    uuid references public.profiles,
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create unique index join_requests_one_pending_per_person on public.household_join_requests (profile_id) where status = 'pending';

create table public.activity_events (
  id              bigint generated always as identity primary key,
  actor_id        uuid not null references public.profiles,
  event_type      text not null,
  module          text not null check (module in ('core', 'garage', 'groceries', 'car', 'meals', 'childcare')),
  subject_type    text,
  subject_id      uuid,
  counterpart_id  uuid references public.profiles,
  details         jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index on public.activity_events (actor_id, created_at desc);
create index on public.activity_events (counterpart_id, created_at desc);

create table public.issues (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null default auth.uid() references public.profiles,
  about_profile_id  uuid references public.profiles,
  module            text not null default 'core' check (module in ('core', 'garage', 'groceries', 'car', 'meals', 'childcare')),
  subject_type      text,
  subject_id        uuid,
  kind              text not null check (kind in ('late', 'damaged', 'lost', 'no_show', 'payment', 'other')),
  description       text not null check (length(trim(description)) > 0),
  status            text not null default 'open' check (status in ('open', 'resolved')),
  resolution_note   text,
  resolved_by       uuid references public.profiles,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers. security definer so policies can check membership without
-- recursing into profiles' own RLS.
-- ---------------------------------------------------------------------------

create function public.is_active_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create function public.is_steward() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and role = 'steward');
$$;

create function public.my_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.profiles where id = auth.uid() and status = 'active';
$$;

create function public.log_event(
  p_actor uuid, p_type text, p_module text, p_subject_type text, p_subject_id uuid,
  p_counterpart uuid default null, p_details jsonb default '{}'
) returns void
language sql security definer set search_path = '' as $$
  insert into public.activity_events (actor_id, event_type, module, subject_type, subject_id, counterpart_id, details)
  values (p_actor, p_type, p_module, p_subject_type, p_subject_id, p_counterpart, p_details);
$$;
revoke execute on function public.log_event from public, anon, authenticated;

grant execute on function public.is_active_member, public.is_steward, public.my_household_id to authenticated;

-- ---------------------------------------------------------------------------
-- Joining. Supabase creates the auth user as soon as an invite is sent, so
-- the profile waits until the email is confirmed (the invite link clicked).
-- Public signups are off, so every user arrives through an invite or seed.
-- ---------------------------------------------------------------------------

create function public.handle_confirmed_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
begin
  if new.email_confirmed_at is null
     or (tg_op = 'UPDATE' and old.email_confirmed_at is not null) then
    return new;
  end if;

  select * into v_invite from public.invites
   where lower(email) = lower(new.email) and status = 'pending'
   order by created_at desc limit 1;

  insert into public.profiles (id, email, invited_by)
  values (new.id, new.email, v_invite.inviter_id)
  on conflict (id) do nothing;

  if v_invite.id is not null then
    update public.invites set status = 'accepted' where id = v_invite.id;
    perform public.log_event(new.id, 'joined', 'core', 'profile', new.id, v_invite.inviter_id);
  end if;
  return new;
end;
$$;
create trigger on_auth_user_confirmed after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_confirmed_user();

-- Households are created through this function so the creator always lands
-- in the household they made.
create function public.create_household(p_name text, p_address text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_active_member() then
    raise exception 'not an active member';
  end if;
  if public.my_household_id() is not null then
    raise exception 'already in a household';
  end if;

  insert into public.households (name, address) values (p_name, p_address) returning id into v_id;
  update public.profiles set household_id = v_id where id = auth.uid();
  update public.household_join_requests set status = 'declined', decided_at = now()
   where profile_id = auth.uid() and status = 'pending';
  perform public.log_event(auth.uid(), 'household_created', 'core', 'household', v_id);
  return v_id;
end;
$$;
revoke execute on function public.create_household from public, anon;
grant execute on function public.create_household to authenticated;

create function public.handle_join_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_event(new.profile_id, 'household_join_requested', 'core', 'household', new.household_id);
  elsif old.status = 'pending' and new.status = 'approved' then
    update public.profiles set household_id = new.household_id where id = new.profile_id;
    perform public.log_event(new.profile_id, 'household_joined', 'core', 'household', new.household_id, new.decided_by);
  end if;
  return new;
end;
$$;
create trigger join_requests_after after insert or update on public.household_join_requests
  for each row execute function public.handle_join_request();

create function public.stamp_join_decision() returns trigger
language plpgsql as $$
begin
  if old.status <> 'pending' then
    raise exception 'request already decided';
  end if;
  new.decided_by := auth.uid();
  new.decided_at := now();
  return new;
end;
$$;
create trigger join_requests_stamp before update on public.household_join_requests
  for each row execute function public.stamp_join_decision();

-- ---------------------------------------------------------------------------
-- Event logging: the database writes the log as a side effect of real
-- changes, so the app can't forget an event or record a fake one.
-- ---------------------------------------------------------------------------

create function public.log_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_event(new.inviter_id, 'invite_sent', 'core', 'invite', new.id);
  return new;
end;
$$;
create trigger invites_log after insert on public.invites
  for each row execute function public.log_invite();

create function public.stamp_issue_resolution() returns trigger
language plpgsql as $$
begin
  if old.status = 'open' and new.status = 'resolved' then
    new.resolved_by := auth.uid();
    new.resolved_at := now();
  elsif new.status = 'open' then
    new.resolved_by := null;
    new.resolved_at := null;
  end if;
  return new;
end;
$$;
create trigger issues_stamp before update on public.issues
  for each row execute function public.stamp_issue_resolution();

create function public.log_issue() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_event(new.reporter_id, 'issue_reported', new.module, 'issue', new.id, new.about_profile_id);
  elsif old.status = 'open' and new.status = 'resolved' then
    perform public.log_event(new.resolved_by, 'issue_resolved', new.module, 'issue', new.id, new.reporter_id);
  elsif old.status = 'resolved' and new.status = 'open' then
    perform public.log_event(auth.uid(), 'issue_reopened', new.module, 'issue', new.id, new.reporter_id);
  end if;
  return new;
end;
$$;
create trigger issues_log after insert or update on public.issues
  for each row execute function public.log_issue();

-- Append-only, enforced for every role including the secret key.
create function public.forbid_change() returns trigger
language plpgsql as $$
begin
  raise exception 'activity_events is append-only';
end;
$$;
create trigger activity_events_append_only before update or delete on public.activity_events
  for each row execute function public.forbid_change();
create trigger activity_events_no_truncate before truncate on public.activity_events
  for each statement execute function public.forbid_change();

-- ---------------------------------------------------------------------------
-- Row Level Security. RLS decides which rows; grants decide which columns,
-- so nobody can edit their own role, status, or household. Nothing is
-- granted to anon: logged-out visitors can't read any table.
-- ---------------------------------------------------------------------------

-- Start from nothing, then grant only what each table needs. Supabase's
-- defaults include TRUNCATE, which skips RLS.
revoke all on all tables in schema public from anon, authenticated, service_role;

alter table public.households              enable row level security;
alter table public.profiles                enable row level security;
alter table public.invites                 enable row level security;
alter table public.household_join_requests enable row level security;
alter table public.activity_events         enable row level security;
alter table public.issues                  enable row level security;

-- households: every active member sees every household, including address.
-- Anyone living there can edit it. Created only through create_household().
create policy households_read on public.households for select
  using (public.is_active_member() or id = (select household_id from public.profiles where id = auth.uid()));
create policy households_edit on public.households for update
  using (id = public.my_household_id());
grant select, update (name, address, notes) on public.households to authenticated;
-- The daily keep-awake ping reads one row.
grant select on public.households to service_role;

-- profiles: active members see the directory; you always see yourself.
create policy profiles_read on public.profiles for select
  using (public.is_active_member() or id = auth.uid());
create policy profiles_edit_own on public.profiles for update
  using (id = auth.uid() and public.is_active_member());
grant select, update (display_name, phone, preferred_contact, languages, bio) on public.profiles to authenticated;

-- invites: you see the invites you sent; stewards see all.
create policy invites_read on public.invites for select
  using (inviter_id = auth.uid() or public.is_steward());
create policy invites_create on public.invites for insert
  with check (inviter_id = auth.uid() and public.is_active_member());
grant select, insert (email) on public.invites to authenticated;
-- The server removes the row if Supabase fails to send the invite email.
grant delete on public.invites to service_role;

-- join requests: the requester, current members of that household, and
-- stewards see them. Only current members decide.
create policy join_requests_read on public.household_join_requests for select
  using (profile_id = auth.uid() or household_id = public.my_household_id() or public.is_steward());
create policy join_requests_create on public.household_join_requests for insert
  with check (profile_id = auth.uid() and public.is_active_member() and public.my_household_id() is null);
create policy join_requests_decide on public.household_join_requests for update
  using (household_id = public.my_household_id() and status = 'pending')
  with check (status in ('approved', 'declined'));
grant select, insert (household_id), update (status) on public.household_join_requests to authenticated;

-- activity_events: you see events where you're the actor or the counterpart.
-- Nobody writes directly; only the functions above do.
create policy events_read_own on public.activity_events for select
  using (actor_id = auth.uid() or counterpart_id = auth.uid());
grant select on public.activity_events to authenticated;

-- issues: only the reporter, the person it's about, and stewards see an issue,
-- and any of them can resolve it.
create policy issues_read on public.issues for select
  using (reporter_id = auth.uid() or about_profile_id = auth.uid() or public.is_steward());
create policy issues_create on public.issues for insert
  with check (reporter_id = auth.uid() and public.is_active_member());
create policy issues_resolve on public.issues for update
  using (reporter_id = auth.uid() or about_profile_id = auth.uid() or public.is_steward());
grant select, insert (about_profile_id, module, subject_type, subject_id, kind, description),
  update (status, resolution_note) on public.issues to authenticated;

-- ---------------------------------------------------------------------------
-- Your own stats. Counts for others arrive with v1 as plain facts on a
-- profile, never as a score.
-- ---------------------------------------------------------------------------

create function public.my_stats()
returns table (module text, event_type text, n bigint)
language sql stable security definer set search_path = '' as $$
  select e.module, e.event_type, count(*) from public.activity_events e
   where e.actor_id = auth.uid() group by e.module, e.event_type
  union all
  select 'core', 'issues_about_me', count(*) from public.issues where about_profile_id = auth.uid();
$$;
revoke execute on function public.my_stats from public, anon;
grant execute on function public.my_stats to authenticated;
