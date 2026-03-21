drop policy if exists "delivery_orders_update_buyer" on public.delivery_orders;
drop policy if exists "delivery_orders_update_dasher" on public.delivery_orders;
drop policy if exists "delivery_orders_update_actor" on public.delivery_orders;

create policy "delivery_orders_update_actor"
on public.delivery_orders
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (
    (
      buyer_id = (select auth.uid())
      and status in ('pending', 'accepted', 'picked_up')
    )
    or (
      exists (
        select 1
        from public.dashers d
        where d.id = (select auth.uid())
      )
      and (
        (status = 'pending' and dasher_id is null)
        or dasher_id = (select auth.uid())
      )
    )
  )
)
with check (
  (select auth.uid()) is not null
  and (
    (
      buyer_id = (select auth.uid())
      and status = 'cancelled'
      and dasher_id is null
    )
    or (
      exists (
        select 1
        from public.dashers d
        where d.id = (select auth.uid())
      )
      and (
        (status = 'accepted' and dasher_id = (select auth.uid()))
        or (
          dasher_id = (select auth.uid())
          and status in ('accepted', 'picked_up', 'delivered', 'cancelled')
        )
      )
    )
  )
);
