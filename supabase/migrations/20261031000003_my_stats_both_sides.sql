-- Your record counts what you did and what others did with you (a loan you
-- received is logged with the lender as actor and you as counterpart).
drop function public.my_stats();
create function public.my_stats()
returns table (module text, event_type text, as_counterpart boolean, n bigint)
language sql stable security definer set search_path = '' as $$
  select e.module, e.event_type, e.actor_id <> auth.uid(), count(*)
    from public.activity_events e
   where e.actor_id = auth.uid() or e.counterpart_id = auth.uid()
   group by 1, 2, 3;
$$;
revoke execute on function public.my_stats from public, anon;
grant execute on function public.my_stats to authenticated;
