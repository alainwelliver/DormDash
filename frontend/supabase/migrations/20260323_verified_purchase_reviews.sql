-- ══════════════════════════════════════════════════════════════════════════════
-- Verified Purchase Reviews
-- ══════════════════════════════════════════════════════════════════════════════
-- This migration adds verified purchase indicators to reviews by creating an RPC
-- function that computes purchase status in real-time based on paid orders.
--
-- Features:
-- - Returns reviews with verified_purchase boolean flag
-- - Includes reviewer names from auth.users or user_profiles
-- - Uses EXISTS subquery for efficient verification checking
-- - Leverages existing indexes on orders and order_items
-- ══════════════════════════════════════════════════════════════════════════════

-- ── RPC: get_reviews_with_verification ────────────────────────────────────────

create or replace function public.get_reviews_with_verification(p_listing_id bigint)
returns table (
  id                bigint,
  listing_id        bigint,
  reviewer_id       uuid,
  rating            integer,
  comment           text,
  created_at        timestamptz,
  reviewer_name     text,
  verified_purchase boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id,
    r.listing_id,
    r.reviewer_id::uuid,
    r.rating,
    r.comment,
    r.created_at,
    coalesce(
      (u.raw_user_meta_data->>'full_name'),
      up.display_name,
      'Anonymous'
    ) as reviewer_name,
    exists(
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.listing_id = r.listing_id
        and o.user_id = r.reviewer_id::uuid
        and o.status = 'paid'
    ) as verified_purchase
  from public.reviews r
  left join auth.users u on u.id = r.reviewer_id::uuid
  left join public.user_profiles up on up.id = r.reviewer_id::uuid
  where r.listing_id = p_listing_id
  order by r.created_at desc;
end;
$$;

grant execute on function public.get_reviews_with_verification(bigint) to anon, authenticated;

comment on function public.get_reviews_with_verification(bigint) is
  'Returns reviews for a listing with verified purchase status computed in real-time based on paid orders';

-- ── Performance Index ──────────────────────────────────────────────────────────

-- Composite index for verified-purchase EXISTS (listing_id + join to orders by order_id).
-- Partial indexes cannot use subqueries in PostgreSQL; filter o.status = 'paid' stays in the RPC.
create index if not exists idx_order_items_listing_verified_purchase
  on public.order_items (listing_id, order_id);

comment on index public.idx_order_items_listing_verified_purchase is
  'Supports verified purchase lookups: order_items by listing_id with order_id for join to orders';
