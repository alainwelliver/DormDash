-- PL/pgSQL: RETURNS TABLE (order_id bigint, ...) defines output variables named
-- order_id, status, etc. Unqualified `order_id` in subqueries on order_items
-- then collides with those variables (SQLSTATE 42702). Qualify with table alias.

create or replace function public.finalize_paid_order(p_order_id bigint)
returns table (
  order_id bigint,
  status text,
  delivery_method text,
  inventory_finalized_at timestamptz,
  finalized_now boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_finalized_now boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
    and user_id = auth.uid()
  for update;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status = 'pending_payment' then
    update public.orders
    set
      status = 'paid',
      paid_at = coalesce(paid_at, now())
    where id = v_order.id
    returning * into v_order;
  elsif v_order.status <> 'paid' then
    raise exception 'Order is not in a payable state';
  end if;

  if v_order.inventory_finalized_at is null then
    update public.listings l
    set available_quantity = greatest(
      l.available_quantity - item_totals.quantity_total,
      0
    )
    from (
      select
        oi.listing_id,
        sum(oi.quantity)::integer as quantity_total
      from public.order_items oi
      where oi.order_id = v_order.id
      group by oi.listing_id
    ) item_totals
    where l.id = item_totals.listing_id;

    delete from public.cart_items
    where user_id = v_order.user_id
      and listing_id in (
        select oi.listing_id
        from public.order_items oi
        where oi.order_id = v_order.id
      );

    update public.orders
    set
      status = 'paid',
      paid_at = coalesce(paid_at, now()),
      inventory_finalized_at = now()
    where id = v_order.id
    returning * into v_order;

    v_finalized_now := true;
  end if;

  return query
  select
    v_order.id,
    v_order.status,
    v_order.delivery_method,
    v_order.inventory_finalized_at,
    v_finalized_now;
end;
$$;

grant execute on function public.finalize_paid_order(bigint) to authenticated;
