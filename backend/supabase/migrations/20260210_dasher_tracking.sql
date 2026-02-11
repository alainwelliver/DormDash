-- Dasher live-tracking schema updates

alter table if exists public.orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision;

alter table if exists public.delivery_orders
  add column if not exists delivery_lat double precision,
  add column if not exists delivery_lng double precision,
  add column if not exists accepted_at timestamptz,
  add column if not exists picked_up_at timestamptz,
  add column if not exists delivered_at timestamptz;

create table if not exists public.delivery_tracking (
  delivery_order_id bigint primary key references public.delivery_orders(id) on delete cascade,
  dasher_id uuid not null references auth.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading real,
  speed_mps real,
  accuracy_m real,
  source text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_delivery_tracking_dasher_id
  on public.delivery_tracking(dasher_id);

create index if not exists idx_delivery_tracking_updated_at
  on public.delivery_tracking(updated_at desc);

create index if not exists idx_delivery_orders_status_dasher
  on public.delivery_orders(status, dasher_id);

create index if not exists idx_delivery_orders_buyer_status
  on public.delivery_orders(buyer_id, status);

alter table public.delivery_tracking enable row level security;

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
      and (d.buyer_id = auth.uid() or d.dasher_id = auth.uid())
  )
);

drop policy if exists "delivery_tracking_upsert_dasher_only" on public.delivery_tracking;
create policy "delivery_tracking_upsert_dasher_only"
on public.delivery_tracking
for all
to authenticated
using (
  dasher_id = auth.uid()
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_order_id
      and d.dasher_id = auth.uid()
      and d.status in ('accepted', 'picked_up')
  )
)
with check (
  dasher_id = auth.uid()
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = delivery_order_id
      and d.dasher_id = auth.uid()
      and d.status in ('accepted', 'picked_up')
  )
);

create or replace function public.accept_delivery_order(p_order_id bigint)
returns public.delivery_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.delivery_orders;
begin
  update public.delivery_orders
  set
    dasher_id = auth.uid(),
    status = 'accepted',
    accepted_at = coalesce(accepted_at, now())
  where id = p_order_id
    and status = 'pending'
    and dasher_id is null
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Delivery order is no longer available';
  end if;

  update public.dashers
  set status = 'busy'
  where id = auth.uid();

  return v_order;
end;
$$;

grant execute on function public.accept_delivery_order(bigint) to authenticated;

create or replace function public.set_delivery_status(p_order_id bigint, p_status text)
returns public.delivery_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.delivery_orders;
begin
  select *
  into v_order
  from public.delivery_orders
  where id = p_order_id
    and dasher_id = auth.uid();

  if v_order.id is null then
    raise exception 'Delivery order not found for dasher';
  end if;

  if p_status = 'picked_up' and v_order.status <> 'accepted' then
    raise exception 'Invalid status transition to picked_up';
  end if;

  if p_status = 'delivered' and v_order.status <> 'picked_up' then
    raise exception 'Invalid status transition to delivered';
  end if;

  if p_status not in ('accepted', 'picked_up', 'delivered', 'cancelled') then
    raise exception 'Unsupported status';
  end if;

  update public.delivery_orders
  set
    status = p_status,
    picked_up_at = case when p_status = 'picked_up' then now() else picked_up_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end
  where id = p_order_id
  returning * into v_order;

  if p_status in ('delivered', 'cancelled') then
    update public.dashers
    set status = 'online'
    where id = auth.uid();
  end if;

  return v_order;
end;
$$;

grant execute on function public.set_delivery_status(bigint, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'delivery_tracking'
    ) then
      alter publication supabase_realtime add table public.delivery_tracking;
    end if;
  end if;
end;
$$;
