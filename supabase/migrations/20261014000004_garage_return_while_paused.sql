-- While an item is paused, nobody is told they're next when it comes back.
create or replace function public.garage_return(p_loan uuid, p_photo text default null) returns uuid
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

  select r.requester_id into v_next from public.garage_requests r
    join public.garage_items i on i.id = r.item_id
   where r.item_id = v_loan.item_id and r.status = 'pending' and i.status = 'available'
   order by r.created_at limit 1;
  return v_next;
end;
$$;
