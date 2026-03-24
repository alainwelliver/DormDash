-- RPC for buyers to retrieve pickup location(s) for their own pickup orders.
-- listing_pickup_locations is normally hidden from buyers via RLS; this
-- security-definer function safely exposes it only to the buyer of the order.

create or replace function public.get_pickup_locations_for_order(p_order_id bigint)
returns table(
  listing_id   bigint,
  pickup_address      text,
  pickup_building_name text,
  pickup_lat          double precision,
  pickup_lng          double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Caller must be the buyer of a pickup order
  if not exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and o.user_id = v_user_id
      and o.delivery_method = 'pickup'
  ) then
    raise exception 'Order not found or not a pickup order';
  end if;

  return query
  select distinct on (lpl.pickup_address)
    lpl.listing_id,
    lpl.pickup_address,
    lpl.pickup_building_name,
    lpl.pickup_lat,
    lpl.pickup_lng
  from public.order_items oi
  join public.listing_pickup_locations lpl on lpl.listing_id = oi.listing_id
  where oi.order_id = p_order_id
  order by lpl.pickup_address, lpl.listing_id;
end;
$$;

grant execute on function public.get_pickup_locations_for_order(bigint) to authenticated;
