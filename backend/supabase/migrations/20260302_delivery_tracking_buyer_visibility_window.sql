-- Restrict buyer access to delivery tracking to the en-route and recently completed window.

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
    where d.id = delivery_order_id
      and (
        d.dasher_id = auth.uid()
        or (d.buyer_id = auth.uid() and d.status in ('picked_up', 'delivered'))
      )
  )
);
