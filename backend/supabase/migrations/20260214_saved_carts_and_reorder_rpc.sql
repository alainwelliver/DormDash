-- Customer repeat-buying primitives: saved carts + cart batch/reorder RPCs.

create table if not exists public.saved_carts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  source_order_id bigint references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.saved_cart_items (
  saved_cart_id bigint not null references public.saved_carts(id) on delete cascade,
  listing_id bigint not null references public.listings(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  primary key (saved_cart_id, listing_id)
);

create index if not exists idx_saved_carts_user_created
  on public.saved_carts(user_id, created_at desc);
create index if not exists idx_saved_carts_user_last_used
  on public.saved_carts(user_id, last_used_at desc nulls last);
create index if not exists idx_saved_cart_items_listing_id
  on public.saved_cart_items(listing_id);

alter table public.saved_carts enable row level security;
alter table public.saved_cart_items enable row level security;

drop policy if exists "saved_carts_select_own" on public.saved_carts;
create policy "saved_carts_select_own"
on public.saved_carts
for select
using (user_id = auth.uid());

drop policy if exists "saved_carts_insert_own" on public.saved_carts;
create policy "saved_carts_insert_own"
on public.saved_carts
for insert
with check (user_id = auth.uid());

drop policy if exists "saved_carts_update_own" on public.saved_carts;
create policy "saved_carts_update_own"
on public.saved_carts
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "saved_carts_delete_own" on public.saved_carts;
create policy "saved_carts_delete_own"
on public.saved_carts
for delete
using (user_id = auth.uid());

drop policy if exists "saved_cart_items_select_owner" on public.saved_cart_items;
create policy "saved_cart_items_select_owner"
on public.saved_cart_items
for select
using (
  exists (
    select 1
    from public.saved_carts sc
    where sc.id = saved_cart_id
      and sc.user_id = auth.uid()
  )
);

drop policy if exists "saved_cart_items_insert_owner" on public.saved_cart_items;
create policy "saved_cart_items_insert_owner"
on public.saved_cart_items
for insert
with check (
  exists (
    select 1
    from public.saved_carts sc
    where sc.id = saved_cart_id
      and sc.user_id = auth.uid()
  )
);

drop policy if exists "saved_cart_items_update_owner" on public.saved_cart_items;
create policy "saved_cart_items_update_owner"
on public.saved_cart_items
for update
using (
  exists (
    select 1
    from public.saved_carts sc
    where sc.id = saved_cart_id
      and sc.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.saved_carts sc
    where sc.id = saved_cart_id
      and sc.user_id = auth.uid()
  )
);

drop policy if exists "saved_cart_items_delete_owner" on public.saved_cart_items;
create policy "saved_cart_items_delete_owner"
on public.saved_cart_items
for delete
using (
  exists (
    select 1
    from public.saved_carts sc
    where sc.id = saved_cart_id
      and sc.user_id = auth.uid()
  )
);

create or replace function public.add_items_to_cart_batch(p_items jsonb)
returns table (
  listing_id bigint,
  requested_quantity integer,
  resulting_quantity integer,
  action text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_listing_id bigint;
  v_requested integer;
  v_existing_id bigint;
  v_existing_qty integer;
  v_new_qty integer;
  v_max_qty integer := 20;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a JSON array';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    listing_id := null;
    requested_quantity := 0;
    resulting_quantity := 0;
    action := null;
    message := null;

    begin
      v_listing_id := (v_item->>'listing_id')::bigint;
    exception when others then
      v_listing_id := null;
    end;

    begin
      v_requested := greatest(coalesce((v_item->>'quantity')::integer, 1), 1);
    exception when others then
      v_requested := 1;
    end;

    listing_id := v_listing_id;
    requested_quantity := v_requested;

    if v_listing_id is null then
      action := 'skipped_invalid';
      message := 'Invalid listing_id';
      return next;
      continue;
    end if;

    if not exists (select 1 from public.listings l where l.id = v_listing_id) then
      action := 'skipped_missing';
      message := 'Listing no longer exists';
      return next;
      continue;
    end if;

    select ci.id, ci.quantity
    into v_existing_id, v_existing_qty
    from public.cart_items ci
    where ci.user_id = v_user_id
      and ci.listing_id = v_listing_id
    limit 1;

    if v_existing_id is null then
      v_new_qty := least(v_requested, v_max_qty);
      insert into public.cart_items (user_id, listing_id, quantity)
      values (v_user_id, v_listing_id, v_new_qty);

      resulting_quantity := v_new_qty;
      action := 'added';
      message := case when v_requested > v_max_qty then 'Quantity capped at 20' else null end;
    else
      v_new_qty := least(v_existing_qty + v_requested, v_max_qty);
      update public.cart_items
      set quantity = v_new_qty
      where id = v_existing_id;

      resulting_quantity := v_new_qty;
      action := 'merged';
      message := case when v_existing_qty + v_requested > v_max_qty then 'Quantity capped at 20' else null end;
    end if;

    return next;
  end loop;
end;
$$;

create or replace function public.create_saved_cart_from_current_cart(
  p_name text,
  p_icon text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_saved_cart_id bigint;
  v_name text := trim(coalesce(p_name, ''));
  v_cart_count int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_name = '' then
    raise exception 'Saved cart name is required';
  end if;

  select count(*) into v_cart_count
  from public.cart_items ci
  where ci.user_id = v_user_id
    and ci.quantity > 0;

  if v_cart_count = 0 then
    raise exception 'Cannot save an empty cart';
  end if;

  insert into public.saved_carts (user_id, name, icon)
  values (v_user_id, left(v_name, 60), nullif(trim(coalesce(p_icon, '')), ''))
  returning id into v_saved_cart_id;

  insert into public.saved_cart_items (saved_cart_id, listing_id, quantity)
  select v_saved_cart_id, ci.listing_id, ci.quantity
  from public.cart_items ci
  where ci.user_id = v_user_id
    and ci.quantity > 0;

  return v_saved_cart_id;
end;
$$;

create or replace function public.add_saved_cart_to_cart(p_saved_cart_id bigint)
returns table (
  listing_id bigint,
  requested_quantity integer,
  resulting_quantity integer,
  action text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.saved_carts sc
    where sc.id = p_saved_cart_id
      and sc.user_id = v_user_id
  ) then
    raise exception 'Saved cart not found';
  end if;

  update public.saved_carts
  set last_used_at = now(), updated_at = now()
  where id = p_saved_cart_id
    and user_id = v_user_id;

  select jsonb_agg(
    jsonb_build_object(
      'listing_id', sci.listing_id,
      'quantity', sci.quantity
    )
  )
  into v_items
  from public.saved_cart_items sci
  where sci.saved_cart_id = p_saved_cart_id;

  if v_items is null then
    return;
  end if;

  return query
  select *
  from public.add_items_to_cart_batch(v_items);
end;
$$;

grant select, insert, update, delete on public.saved_carts to authenticated;
grant select, insert, update, delete on public.saved_cart_items to authenticated;
grant usage, select on sequence public.saved_carts_id_seq to authenticated;

grant execute on function public.add_items_to_cart_batch(jsonb) to authenticated;
grant execute on function public.create_saved_cart_from_current_cart(text, text) to authenticated;
grant execute on function public.add_saved_cart_to_cart(bigint) to authenticated;
