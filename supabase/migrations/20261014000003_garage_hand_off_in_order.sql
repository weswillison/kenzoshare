-- A hand-off goes to the next person in line, first come, first served, and
-- only while the owner is lending.
create or replace function public.garage_hand_off(p_loan uuid, p_request uuid, p_photo text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.garage_loans;
  v_req public.garage_requests;
  v_id uuid;
begin
  select * into v_loan from public.garage_loans where id = p_loan and ended_at is null for update;
  if v_loan.id is null or v_loan.borrower_id <> auth.uid() then raise exception 'not your loan'; end if;
  if (select status from public.garage_items where id = v_loan.item_id) <> 'available' then
    raise exception 'item is not lending right now';
  end if;
  select * into v_req from public.garage_requests
   where id = p_request and item_id = v_loan.item_id and status = 'pending' for update;
  if v_req.id is null then raise exception 'that person isn''t waiting for this item'; end if;
  if exists (select 1 from public.garage_requests
              where item_id = v_loan.item_id and status = 'pending' and created_at < v_req.created_at) then
    raise exception 'that person isn''t next in line';
  end if;

  update public.garage_loans set ended_at = now(), ended_by = auth.uid(), return_photo_path = p_photo where id = p_loan;
  insert into public.garage_loans (item_id, borrower_id, request_id, previous_loan_id, started_by, start_photo_path, due_on)
  values (v_loan.item_id, v_req.requester_id, v_req.id, v_loan.id, auth.uid(), p_photo, v_req.due_on)
  returning id into v_id;
  update public.garage_requests set status = 'fulfilled', decided_by = auth.uid(), decided_at = now() where id = v_req.id;
  perform public.log_event(auth.uid(), 'item_handed_off', 'garage', 'garage_item', v_loan.item_id, v_req.requester_id);
  return v_id;
end;
$$;
