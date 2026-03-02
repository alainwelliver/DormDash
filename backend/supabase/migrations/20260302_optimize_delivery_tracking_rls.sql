-- Optimize delivery tracking RLS performance and remove ALL-policy overlap.

alter table if exists public.delivery_tracking enable row level security;

drop policy if exists "delivery_tracking_select_buyer_or_dasher" on public.delivery_tracking;
create policy "delivery_tracking_select_buyer_or_dasher"
on public.delivery_tracking
for select
to authenticated
using (
  exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_tracking.delivery_order_id
      and (
        d.dasher_id = (select auth.uid())
        or (
          d.buyer_id = (select auth.uid())
          and d.status in ('picked_up', 'delivered')
        )
      )
  )
);

drop policy if exists "delivery_tracking_upsert_dasher_only" on public.delivery_tracking;

drop policy if exists "delivery_tracking_insert_dasher_only" on public.delivery_tracking;
create policy "delivery_tracking_insert_dasher_only"
on public.delivery_tracking
for insert
to authenticated
with check (
  dasher_id = (select auth.uid())
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_tracking.delivery_order_id
      and d.dasher_id = (select auth.uid())
      and d.status in ('accepted', 'picked_up')
  )
);

drop policy if exists "delivery_tracking_update_dasher_only" on public.delivery_tracking;
create policy "delivery_tracking_update_dasher_only"
on public.delivery_tracking
for update
to authenticated
using (
  dasher_id = (select auth.uid())
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_tracking.delivery_order_id
      and d.dasher_id = (select auth.uid())
      and d.status in ('accepted', 'picked_up')
  )
)
with check (
  dasher_id = (select auth.uid())
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_tracking.delivery_order_id
      and d.dasher_id = (select auth.uid())
      and d.status in ('accepted', 'picked_up')
  )
);

drop policy if exists "delivery_tracking_delete_dasher_only" on public.delivery_tracking;
create policy "delivery_tracking_delete_dasher_only"
on public.delivery_tracking
for delete
to authenticated
using (
  dasher_id = (select auth.uid())
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_tracking.delivery_order_id
      and d.dasher_id = (select auth.uid())
      and d.status in ('accepted', 'picked_up')
  )
);
