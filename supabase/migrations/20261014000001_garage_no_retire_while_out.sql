-- An item can't stop being listed while someone has it: the item page is
-- hidden once retired, so the borrower couldn't mark it returned.
create function public.no_retire_while_out() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'retired' and old.status <> 'retired'
     and exists (select 1 from public.garage_loans where item_id = new.id and ended_at is null) then
    raise exception 'item is out right now';
  end if;
  return new;
end;
$$;
create trigger garage_items_no_retire_while_out before update of status on public.garage_items
  for each row execute function public.no_retire_while_out();
