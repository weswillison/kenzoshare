-- A loan that ended in a hand-off didn't come back, so there's nothing to
-- confirm.
create or replace function public.garage_confirm_return(p_loan uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.garage_loans;
begin
  select * into v_loan from public.garage_loans l
   where l.id = p_loan and l.ended_at is not null and l.confirmed_at is null
     and not exists (select 1 from public.garage_loans n where n.previous_loan_id = l.id);
  if v_loan.id is null then raise exception 'nothing to confirm'; end if;
  if not public.is_my_item(v_loan.item_id) then raise exception 'not your household''s item'; end if;

  update public.garage_loans set confirmed_at = now(), confirmed_by = auth.uid() where id = p_loan;
  perform public.log_event(auth.uid(), 'return_confirmed', 'garage', 'garage_item', v_loan.item_id, v_loan.borrower_id);
end;
$$;
