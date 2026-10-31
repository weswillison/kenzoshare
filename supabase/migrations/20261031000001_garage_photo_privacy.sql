-- Hand-over and return photos are evidence between the people on a loan,
-- so they're hidden from everyone else. Listing photos stay visible to
-- every member. The path says which is which:
--   item/<item id>/       listing photo, every active member
--   request/<request id>/ hand-over photo (the loan doesn't exist yet)
--   loan/<loan id>/       return or hand-off photo
-- Evidence is visible to the borrower, the owning household, and stewards.

create or replace function public.can_upload_garage_photo(p_name text) returns boolean
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
  elsif v_parts[1] = 'request' then
    return exists (
      select 1 from public.garage_requests r
       where r.id = v_id and r.status = 'pending' and public.is_my_item(r.item_id)
    );
  elsif v_parts[1] = 'loan' then
    return exists (
      select 1 from public.garage_loans l
       where l.id = v_id and (l.borrower_id = auth.uid() or public.is_my_item(l.item_id))
    );
  end if;
  return false;
end;
$$;

create function public.can_read_garage_photo(p_name text) returns boolean
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
    return public.is_active_member();
  elsif v_parts[1] = 'request' then
    return public.is_steward() or exists (
      select 1 from public.garage_requests r
       where r.id = v_id and (r.requester_id = auth.uid() or public.is_my_item(r.item_id))
    );
  elsif v_parts[1] = 'loan' then
    -- A hand-off photo ends one loan and starts the next, so the person who
    -- received the item sees that one photo too.
    return public.is_steward()
      or exists (
        select 1 from public.garage_loans l
         where l.id = v_id and (l.borrower_id = auth.uid() or public.is_my_item(l.item_id)))
      or exists (
        select 1 from public.garage_loans n
         where n.previous_loan_id = v_id and n.borrower_id = auth.uid()
           and n.start_photo_path = regexp_replace(p_name, '-thumb\.jpg$', '.jpg'));
  end if;
  return false;
end;
$$;
grant execute on function public.can_read_garage_photo to authenticated;

drop policy garage_photos_read on storage.objects;
create policy garage_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'garage-photos' and public.can_read_garage_photo(name));
