-- Re-apply resilient split-delivery RPC after 20260212.
-- Keeps split-by-pickup behavior while restoring legacy pickup backfill.

insert into public.listing_pickup_locations (
  listing_id,
  seller_id,
  pickup_address,
  pickup_building_name,
  pickup_lat,
  pickup_lng
)
select
  l.id,
  l.user_id,
  l.pickup_address,
  null,
  l.pickup_lat::double precision,
  l.pickup_lng::double precision
from public.listings l
left join public.listing_pickup_locations lpl
  on lpl.listing_id = l.id
where lpl.listing_id is null
  and l.pickup_address is not null
  and l.pickup_lat is not null
  and l.pickup_lng is not null
on conflict (listing_id) do nothing;

create or replace function public.create_delivery_orders_for_order(p_order_id bigint)
returns setof public.delivery_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_created public.delivery_orders%rowtype;
  v_missing_pickup_count int := 0;
  v_group_count int := 0;
  v_total_group_subtotal int := 0;
  v_allocated_tax int := 0;
  v_allocated_fee int := 0;
  v_group_tax int := 0;
  v_group_fee int := 0;
  v_group_total int := 0;
  v_order_number text;
  rec record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_order
  from public.orders o
  where o.id = p_order_id
    and o.user_id = v_user_id
    and o.delivery_method = 'delivery';

  if v_order.id is null then
    raise exception 'Order not found or not a delivery order';
  end if;

  if exists (select 1 from public.delivery_orders d where d.order_id = p_order_id) then
    return query
    select *
    from public.delivery_orders d
    where d.order_id = p_order_id
    order by d.id;
    return;
  end if;

  -- Opportunistically backfill pickup rows for listings in this order
  -- using legacy listing pickup columns, if present.
  insert into public.listing_pickup_locations (
    listing_id,
    seller_id,
    pickup_address,
    pickup_building_name,
    pickup_lat,
    pickup_lng
  )
  select
    l.id,
    l.user_id,
    l.pickup_address,
    null,
    l.pickup_lat::double precision,
    l.pickup_lng::double precision
  from public.order_items oi
  join public.listings l on l.id = oi.listing_id
  left join public.listing_pickup_locations lpl
    on lpl.listing_id = oi.listing_id
    and lpl.seller_id = l.user_id
  where oi.order_id = p_order_id
    and lpl.listing_id is null
    and l.pickup_address is not null
    and l.pickup_lat is not null
    and l.pickup_lng is not null
  group by l.id, l.user_id, l.pickup_address, l.pickup_lat, l.pickup_lng
  on conflict (listing_id) do nothing;

  select count(*)
  into v_missing_pickup_count
  from public.order_items oi
  join public.listings l on l.id = oi.listing_id
  left join public.listing_pickup_locations lpl
    on lpl.listing_id = oi.listing_id
    and lpl.seller_id = l.user_id
  where oi.order_id = p_order_id
    and lpl.listing_id is null;

  if v_missing_pickup_count > 0 then
    raise exception 'One or more listings are missing pickup locations';
  end if;

  select
    count(*),
    coalesce(sum(group_subtotal_cents), 0)
  into
    v_group_count,
    v_total_group_subtotal
  from (
    select
      l.user_id,
      lpl.pickup_address,
      coalesce(lpl.pickup_building_name, ''),
      lpl.pickup_lat,
      lpl.pickup_lng,
      sum(oi.price_cents * oi.quantity)::int as group_subtotal_cents
    from public.order_items oi
    join public.listings l on l.id = oi.listing_id
    join public.listing_pickup_locations lpl
      on lpl.listing_id = oi.listing_id
      and lpl.seller_id = l.user_id
    where oi.order_id = p_order_id
    group by
      l.user_id,
      lpl.pickup_address,
      coalesce(lpl.pickup_building_name, ''),
      lpl.pickup_lat,
      lpl.pickup_lng
  ) grouped;

  if v_group_count = 0 then
    raise exception 'No delivery groups found for order %', p_order_id;
  end if;

  for rec in
    select
      row_number() over (
        order by
          l.user_id,
          lpl.pickup_address,
          coalesce(lpl.pickup_building_name, ''),
          lpl.pickup_lat,
          lpl.pickup_lng
      ) as group_index,
      count(*) over () as group_count,
      l.user_id as seller_id,
      min(oi.listing_id)::bigint as listing_id,
      lpl.pickup_address as pickup_address,
      lpl.pickup_building_name as pickup_building_name,
      lpl.pickup_lat::double precision as pickup_lat,
      lpl.pickup_lng::double precision as pickup_lng,
      string_agg(oi.title, ', ' order by oi.id) as listing_titles,
      sum(oi.price_cents * oi.quantity)::int as group_subtotal_cents
    from public.order_items oi
    join public.listings l on l.id = oi.listing_id
    join public.listing_pickup_locations lpl
      on lpl.listing_id = oi.listing_id
      and lpl.seller_id = l.user_id
    where oi.order_id = p_order_id
    group by
      l.user_id,
      lpl.pickup_address,
      lpl.pickup_building_name,
      lpl.pickup_lat,
      lpl.pickup_lng
    order by
      l.user_id,
      lpl.pickup_address,
      lpl.pickup_building_name,
      lpl.pickup_lat,
      lpl.pickup_lng
  loop
    if rec.group_index < rec.group_count then
      if v_total_group_subtotal > 0 then
        v_group_tax := floor(
          (v_order.tax_cents::numeric * rec.group_subtotal_cents::numeric)
          / v_total_group_subtotal::numeric
        )::int;
      else
        v_group_tax := 0;
      end if;

      v_group_fee := floor(
        v_order.delivery_fee_cents::numeric / rec.group_count::numeric
      )::int;
    else
      v_group_tax := v_order.tax_cents - v_allocated_tax;
      v_group_fee := v_order.delivery_fee_cents - v_allocated_fee;
    end if;

    v_allocated_tax := v_allocated_tax + v_group_tax;
    v_allocated_fee := v_allocated_fee + v_group_fee;
    v_group_total := rec.group_subtotal_cents + v_group_tax + v_group_fee;

    v_order_number :=
      'DD' ||
      upper(to_char(now(), 'YYMMDDHH24MISS')) ||
      upper(substr(md5(random()::text), 1, 4));

    insert into public.delivery_orders (
      order_id,
      order_number,
      buyer_id,
      seller_id,
      listing_id,
      listing_title,
      subtotal_cents,
      tax_cents,
      delivery_fee_cents,
      total_cents,
      pickup_address,
      pickup_lat,
      pickup_lng,
      delivery_address,
      delivery_lat,
      delivery_lng,
      status
    )
    values (
      p_order_id,
      v_order_number,
      v_user_id,
      rec.seller_id,
      rec.listing_id::int,
      coalesce(rec.listing_titles, 'Order items'),
      rec.group_subtotal_cents,
      v_group_tax,
      v_group_fee,
      v_group_total,
      'Private pickup location',
      null,
      null,
      coalesce(v_order.delivery_address, 'Buyer location'),
      v_order.delivery_lat,
      v_order.delivery_lng,
      'pending'
    )
    returning * into v_created;

    insert into public.delivery_pickups (
      delivery_order_id,
      pickup_address,
      pickup_building_name,
      pickup_lat,
      pickup_lng
    )
    values (
      v_created.id,
      rec.pickup_address,
      rec.pickup_building_name,
      rec.pickup_lat,
      rec.pickup_lng
    );
  end loop;

  return query
  select *
  from public.delivery_orders d
  where d.order_id = p_order_id
  order by d.id;
end;
$$;

grant execute on function public.create_delivery_orders_for_order(bigint) to authenticated;
