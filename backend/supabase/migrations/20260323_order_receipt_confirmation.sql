-- Order receipt confirmation: buyer can confirm receipt or flag an issue
-- within 48 hours of payment. Sellers are notified via a disputed indicator
-- on their My Sales screen.

-- ── Schema ────────────────────────────────────────────────────────────────────

-- buyer_confirmed: null = pending, true = confirmed, false = flagged/disputed
-- seller_dispute_seen: defaults true so existing orders produce no noise;
--   set to false when a buyer flags, resetting the seller's indicator.
alter table public.orders
  add column if not exists buyer_confirmed     boolean,
  add column if not exists buyer_confirmed_at  timestamptz,
  add column if not exists buyer_flag_reason   text,
  add column if not exists seller_dispute_seen boolean not null default true;

-- ── Index ─────────────────────────────────────────────────────────────────────

create index if not exists idx_orders_buyer_confirmation
  on public.orders(user_id, buyer_confirmed);

-- ── RPC: confirm_order_receipt ────────────────────────────────────────────────
-- Called by the buyer to confirm they received their order as expected.
-- Only callable within 48 hours of paid_at; buyer_confirmed must be null.

create or replace function public.confirm_order_receipt(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order   record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id, status, paid_at, buyer_confirmed
  into   v_order
  from   public.orders
  where  id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id <> v_user_id then
    raise exception 'Not authorized';
  end if;

  if v_order.status <> 'paid' then
    raise exception 'Order is not in a confirmable state';
  end if;

  if v_order.buyer_confirmed is not null then
    raise exception 'Order has already been confirmed or flagged';
  end if;

  if v_order.paid_at is null or v_order.paid_at < now() - interval '48 hours' then
    raise exception 'Confirmation window has closed (48 hours after payment)';
  end if;

  update public.orders
  set    buyer_confirmed    = true,
         buyer_confirmed_at = now()
  where  id = p_order_id;
end;
$$;

grant execute on function public.confirm_order_receipt(bigint) to authenticated;

-- ── RPC: flag_order_issue ─────────────────────────────────────────────────────
-- Called by the buyer to report a problem with their order.
-- Sets seller_dispute_seen = false to surface the disputed indicator for
-- the seller in their My Sales screen.

create or replace function public.flag_order_issue(p_order_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_order   record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id, user_id, status, paid_at, buyer_confirmed
  into   v_order
  from   public.orders
  where  id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id <> v_user_id then
    raise exception 'Not authorized';
  end if;

  if v_order.status <> 'paid' then
    raise exception 'Order is not in a reportable state';
  end if;

  if v_order.buyer_confirmed is not null then
    raise exception 'Order has already been confirmed or flagged';
  end if;

  if v_order.paid_at is null or v_order.paid_at < now() - interval '48 hours' then
    raise exception 'Confirmation window has closed (48 hours after payment)';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'A reason is required';
  end if;

  update public.orders
  set    buyer_confirmed     = false,
         buyer_confirmed_at  = now(),
         buyer_flag_reason   = p_reason,
         seller_dispute_seen = false
  where  id = p_order_id;
end;
$$;

grant execute on function public.flag_order_issue(bigint, text) to authenticated;

-- ── RPC: get_seller_sales (updated) ──────────────────────────────────────────
-- Now returns buyer_confirmed, buyer_flag_reason, seller_dispute_seen so
-- sellers can see disputed orders in their My Sales screen.

create or replace function public.get_seller_sales(p_status text default null)
returns table (
  order_item_id       bigint,
  order_id            bigint,
  listing_id          bigint,
  listing_title       text,
  quantity            integer,
  price_cents         integer,
  line_total_cents    integer,
  delivery_method     text,
  paid_at             timestamptz,
  seller_seen         boolean,
  buyer_id            uuid,
  buyer_name          text,
  buyer_confirmed     boolean,
  buyer_flag_reason   text,
  seller_dispute_seen boolean
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

  return query
  select
    oi.id                                   as order_item_id,
    oi.order_id                             as order_id,
    oi.listing_id                           as listing_id,
    oi.title                                as listing_title,
    oi.quantity                             as quantity,
    oi.price_cents                          as price_cents,
    (oi.price_cents * oi.quantity)::integer as line_total_cents,
    o.delivery_method                       as delivery_method,
    o.paid_at                               as paid_at,
    oi.seller_seen                          as seller_seen,
    o.user_id                               as buyer_id,
    coalesce(
      (u.raw_user_meta_data->>'full_name'),
      'DormDash user'
    )                                       as buyer_name,
    o.buyer_confirmed                       as buyer_confirmed,
    o.buyer_flag_reason                     as buyer_flag_reason,
    o.seller_dispute_seen                   as seller_dispute_seen
  from public.order_items oi
  join public.listings     l  on l.id  = oi.listing_id
  join public.orders       o  on o.id  = oi.order_id
  join auth.users          u  on u.id  = o.user_id
  where l.user_id   = v_user_id
    and o.status    = 'paid'
    and (
      p_status is null
      or (p_status = 'unseen' and oi.seller_seen = false)
    )
  order by o.paid_at desc nulls last, oi.id desc;
end;
$$;

grant execute on function public.get_seller_sales(text) to authenticated;

-- ── RPC: mark_disputes_seen ───────────────────────────────────────────────────
-- Called from MySalesScreen on focus to clear the seller_dispute_seen = false
-- flag on all orders where the seller has items. Mirrors mark_seller_sales_seen.

create or replace function public.mark_disputes_seen()
returns void
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

  update public.orders o
  set    seller_dispute_seen = true
  from (
    select distinct oi.order_id
    from   public.order_items oi
    join   public.listings    l on l.id = oi.listing_id
    where  l.user_id = v_user_id
  ) seller_orders
  where  o.id                   = seller_orders.order_id
    and  o.seller_dispute_seen  = false;
end;
$$;

grant execute on function public.mark_disputes_seen() to authenticated;
