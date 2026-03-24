-- Seller sales visibility: schema changes, RLS, and RPCs.
-- Gives sellers a view of their sales history, unseen count badge, and
-- push-token storage for out-of-app notifications.

-- ── Schema ────────────────────────────────────────────────────────────────────

-- seller_seen flag on order_items: tracks whether the seller has viewed this
-- sale on the My Sales screen.  Defaults false so new rows trigger the badge,
-- but we immediately backfill all pre-existing rows to true so sellers don't
-- see a flood of "new" badges the first time they open the screen.
alter table public.order_items
  add column if not exists seller_seen boolean not null default false;

update public.order_items
set seller_seen = true
where seller_seen = false;

-- Push token registry: stores Expo push tokens for sending out-of-app
-- notifications when a sale occurs.
create table if not exists public.user_push_tokens (
  user_id    uuid    not null references auth.users(id) on delete cascade,
  token      text    not null,
  platform   text    not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

create index if not exists idx_order_items_listing_id
  on public.order_items(listing_id);

-- Partial index: only unseen rows, used by get_unseen_sales_count.
create index if not exists idx_order_items_unseen_seller
  on public.order_items(listing_id, seller_seen)
  where seller_seen = false;

create index if not exists idx_user_push_tokens_user_id
  on public.user_push_tokens(user_id);

-- ── Realtime publication ──────────────────────────────────────────────────────

-- Add order_items to the Realtime publication so the SaleNotificationContext
-- can subscribe to INSERT events for in-app sale toasts.
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end; $$;

-- ── RLS: user_push_tokens ─────────────────────────────────────────────────────

alter table public.user_push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.user_push_tokens;
create policy "push_tokens_select_own"
on public.user_push_tokens
for select
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.user_push_tokens;
create policy "push_tokens_insert_own"
on public.user_push_tokens
for insert
with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.user_push_tokens;
create policy "push_tokens_update_own"
on public.user_push_tokens
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.user_push_tokens;
create policy "push_tokens_delete_own"
on public.user_push_tokens
for delete
using (user_id = auth.uid());

grant select, insert, update, delete on public.user_push_tokens to authenticated;

-- ── RPC: get_seller_sales ─────────────────────────────────────────────────────
-- Returns all paid order_items whose listing belongs to auth.uid().
-- Joins auth.users (via SECURITY DEFINER) to surface the buyer's display name.
-- p_status: null → all sales; 'unseen' → only unseen sales.

create or replace function public.get_seller_sales(p_status text default null)
returns table (
  order_item_id    bigint,
  order_id         bigint,
  listing_id       bigint,
  listing_title    text,
  quantity         integer,
  price_cents      integer,
  line_total_cents integer,
  delivery_method  text,
  paid_at          timestamptz,
  seller_seen      boolean,
  buyer_id         uuid,
  buyer_name       text
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
    )                                       as buyer_name
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

-- ── RPC: get_unseen_sales_count ───────────────────────────────────────────────
-- Lightweight scalar used by the useUnseenSalesCount() hook to drive the
-- badge on the Profile "My Sales" menu item.  Mirrors fetchUnreadConversationCount.

create or replace function public.get_unseen_sales_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid    := auth.uid();
  v_count   integer;
begin
  if v_user_id is null then
    return 0;
  end if;

  select count(*)::integer
  into v_count
  from public.order_items oi
  join public.listings l on l.id = oi.listing_id
  where l.user_id      = v_user_id
    and oi.seller_seen = false;

  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.get_unseen_sales_count() to authenticated;

-- ── RPC: mark_seller_sales_seen ───────────────────────────────────────────────
-- Called from MySalesScreen on focus to reset the badge and remove the "unseen"
-- visual highlight from sale cards.

create or replace function public.mark_seller_sales_seen()
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

  update public.order_items oi
  set    seller_seen = true
  from   public.listings l
  where  l.id            = oi.listing_id
    and  l.user_id       = v_user_id
    and  oi.seller_seen  = false;
end;
$$;

grant execute on function public.mark_seller_sales_seen() to authenticated;
