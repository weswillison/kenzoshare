-- Someone who left can still return or hand off a loan they hold, and
-- nothing else (docs/decisions.md). Leaving takes them out of every line,
-- so nobody hands an item to a former member.

create function public.garage_leave_lines() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'left' and old.status <> 'left' then
    update public.garage_requests set status = 'cancelled', decided_by = new.id, decided_at = now()
     where requester_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
create trigger profiles_leave_lines after update of status on public.profiles
  for each row execute function public.garage_leave_lines();

-- The owner's household confirms the item changed hands, only while the
-- item is lending.
create or replace function public.garage_hand_over(p_request uuid, p_photo text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.garage_requests;
  v_status text;
  v_id uuid;
begin
  select * into v_req from public.garage_requests where id = p_request and status = 'pending' for update;
  if v_req.id is null then raise exception 'request not found'; end if;
  if not public.is_my_item(v_req.item_id) then raise exception 'not your household''s item'; end if;
  select status into v_status from public.garage_items where id = v_req.item_id for update;
  if v_status <> 'available' then raise exception 'item is not lending right now'; end if;

  insert into public.garage_loans (item_id, borrower_id, request_id, started_by, start_photo_path, due_on)
  values (v_req.item_id, v_req.requester_id, v_req.id, auth.uid(), p_photo, v_req.due_on)
  returning id into v_id;
  update public.garage_requests set status = 'fulfilled', decided_by = auth.uid(), decided_at = now() where id = v_req.id;
  perform public.log_event(auth.uid(), 'item_lent', 'garage', 'garage_item', v_req.item_id, v_req.requester_id);
  return v_id;
end;
$$;

-- The requester cancels, or the owner's household says no. The row is
-- locked so this can't race a hand-over.
create or replace function public.garage_close_request(p_request uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.garage_requests;
begin
  select * into v_req from public.garage_requests where id = p_request and status = 'pending' for update;
  if v_req.id is null then raise exception 'request not found'; end if;

  if v_req.requester_id = auth.uid() then
    update public.garage_requests set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
     where id = p_request and status = 'pending';
  elsif public.is_my_item(v_req.item_id) then
    update public.garage_requests set status = 'declined', decided_by = auth.uid(), decided_at = now()
     where id = p_request and status = 'pending';
    perform public.log_event(auth.uid(), 'request_declined', 'garage', 'garage_item', v_req.item_id, v_req.requester_id);
  else
    raise exception 'not your request';
  end if;
end;
$$;
