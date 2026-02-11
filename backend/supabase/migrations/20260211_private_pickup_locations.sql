-- Private pickup location storage for listings and delivery orders.
-- Keeps seller pickup addresses hidden from buyers and feed consumers.

create table if not exists public.listing_pickup_locations (
  listing_id bigint primary key references public.listings(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  pickup_address text not null,
  pickup_building_name text,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_listing_pickup_locations_seller_id
  on public.listing_pickup_locations(seller_id);

create table if not exists public.delivery_pickups (
  delivery_order_id bigint primary key references public.delivery_orders(id) on delete cascade,
  pickup_address text not null,
  pickup_building_name text,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  created_at timestamptz not null default now()
);

alter table public.listing_pickup_locations enable row level security;
alter table public.delivery_pickups enable row level security;

drop policy if exists "listing_pickup_locations_select_own" on public.listing_pickup_locations;
create policy "listing_pickup_locations_select_own"
on public.listing_pickup_locations
for select
to authenticated
using (seller_id = auth.uid());

drop policy if exists "listing_pickup_locations_insert_own" on public.listing_pickup_locations;
create policy "listing_pickup_locations_insert_own"
on public.listing_pickup_locations
for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_pickup_locations_update_own" on public.listing_pickup_locations;
create policy "listing_pickup_locations_update_own"
on public.listing_pickup_locations
for update
to authenticated
using (seller_id = auth.uid())
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.listings l
    where l.id = listing_id
      and l.user_id = auth.uid()
  )
);

drop policy if exists "listing_pickup_locations_delete_own" on public.listing_pickup_locations;
create policy "listing_pickup_locations_delete_own"
on public.listing_pickup_locations
for delete
to authenticated
using (seller_id = auth.uid());

drop policy if exists "delivery_pickups_select_dashers_only" on public.delivery_pickups;
create policy "delivery_pickups_select_dashers_only"
on public.delivery_pickups
for select
to authenticated
using (
  exists (
    select 1
    from public.dashers da
    where da.id = auth.uid()
  )
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_order_id
      and (
        (d.status = 'pending' and d.dasher_id is null)
        or d.dasher_id = auth.uid()
      )
  )
);

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
where l.pickup_address is not null
  and l.pickup_lat is not null
  and l.pickup_lng is not null
on conflict (listing_id) do nothing;

insert into public.delivery_pickups (
  delivery_order_id,
  pickup_address,
  pickup_building_name,
  pickup_lat,
  pickup_lng
)
select
  d.id,
  d.pickup_address,
  null,
  d.pickup_lat::double precision,
  d.pickup_lng::double precision
from public.delivery_orders d
where d.pickup_address is not null
  and d.pickup_lat is not null
  and d.pickup_lng is not null
on conflict (delivery_order_id) do nothing;

create or replace function public.create_delivery_orders_for_order(p_order_id bigint)
returns setof public.delivery_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_seller_id uuid;
  v_listing_id bigint;
  v_pickup public.listing_pickup_locations%rowtype;
  v_listing_titles text;
  v_order_number text;
  v_created public.delivery_orders%rowtype;
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

  for v_seller_id, v_listing_id in
    select
      l.user_id as seller_id,
      min(oi.listing_id)::bigint as listing_id
    from public.order_items oi
    join public.listings l on l.id = oi.listing_id
    where oi.order_id = p_order_id
    group by l.user_id
  loop
    select *
    into v_pickup
    from public.listing_pickup_locations lpl
    where lpl.listing_id = v_listing_id
      and lpl.seller_id = v_seller_id;

    if v_pickup.listing_id is null then
      raise exception 'Seller pickup location is missing for listing %', v_listing_id;
    end if;

    select string_agg(oi.title, ', ' order by oi.id)
    into v_listing_titles
    from public.order_items oi
    join public.listings l on l.id = oi.listing_id
    where oi.order_id = p_order_id
      and l.user_id = v_seller_id;

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
      v_seller_id,
      v_listing_id::int,
      coalesce(v_listing_titles, 'Order items'),
      v_order.subtotal_cents,
      v_order.tax_cents,
      v_order.delivery_fee_cents,
      v_order.total_cents,
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
      v_pickup.pickup_address,
      v_pickup.pickup_building_name,
      v_pickup.pickup_lat,
      v_pickup.pickup_lng
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
