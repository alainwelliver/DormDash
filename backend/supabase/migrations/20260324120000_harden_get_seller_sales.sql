-- PostgreSQL does not allow CREATE OR REPLACE when the function return row type changes.
-- Drop first so upgrades from the pre-receipt get_seller_sales signature always succeed.

drop function if exists public.get_seller_sales(text);

create function public.get_seller_sales(p_status text default null)
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
