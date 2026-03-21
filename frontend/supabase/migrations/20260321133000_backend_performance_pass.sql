alter table public.listings
add column if not exists listing_tags bigint[] not null default '{}'::bigint[];

alter table public.listings
add column if not exists condition_rank smallint generated always as (
  case condition
    when 'new' then 5
    when 'like_new' then 4
    when 'good' then 3
    when 'fair' then 2
    when 'poor' then 1
    else 3
  end
) stored;

create or replace function public.refresh_listing_tag_cache(p_listing_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.listings l
  set listing_tags = coalesce(
    (
      select array_agg(lt.tag_id order by lt.tag_id)
      from public.listing_tags lt
      where lt.listing_id = p_listing_id
    ),
    '{}'::bigint[]
  )
  where l.id = p_listing_id;
end;
$$;

create or replace function public.sync_listing_tag_cache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_listing_tag_cache(old.listing_id);
    return null;
  end if;

  if tg_op = 'UPDATE' and old.listing_id is distinct from new.listing_id then
    perform public.refresh_listing_tag_cache(old.listing_id);
  end if;

  perform public.refresh_listing_tag_cache(new.listing_id);
  return null;
end;
$$;

drop trigger if exists trg_listing_tags_sync_cache on public.listing_tags;

create trigger trg_listing_tags_sync_cache
after insert or update or delete on public.listing_tags
for each row
execute function public.sync_listing_tag_cache();

update public.listings l
set listing_tags = coalesce(
  (
    select array_agg(lt.tag_id order by lt.tag_id)
    from public.listing_tags lt
    where lt.listing_id = l.id
  ),
  '{}'::bigint[]
);

drop view if exists public.listing_cards;

create view public.listing_cards
with (security_invoker = on)
as
select
  l.id,
  l.user_id,
  l.title,
  l.description,
  l.price_cents,
  l.created_at,
  l.available_quantity,
  l.condition,
  l.condition_rank,
  l.status,
  l.category_id,
  l.listing_tags,
  c.name as category_name,
  img.url as primary_image_url,
  coalesce(img.sort_order, 0) as primary_image_sort_order
from public.listings l
left join public.categories c on c.id = l.category_id
left join lateral (
  select li.url, li.sort_order
  from public.listing_images li
  where li.listing_id = l.id
  order by li.sort_order asc, li.id asc
  limit 1
) img on true;

revoke all on table public.listing_cards from anon, authenticated;
grant select on table public.listing_cards to anon, authenticated;

drop view if exists public.seller_profiles;

create view public.seller_profiles
with (security_invoker = on)
as
select
  up.id,
  up.display_name,
  up.username,
  up.avatar_url,
  coalesce(review_stats.avg_rating, 0::numeric) as avg_rating,
  coalesce(review_stats.total_reviews, 0::bigint) as total_reviews,
  coalesce(listing_stats.active_listings_count, 0::bigint) as active_listings_count,
  listing_stats.member_since
from public.user_profiles up
left join (
  select
    l.user_id,
    avg(r.rating)::numeric(3, 2) as avg_rating,
    count(r.id) as total_reviews
  from public.listings l
  join public.reviews r on r.listing_id = l.id
  group by l.user_id
) review_stats on review_stats.user_id = up.id
left join (
  select
    l.user_id,
    count(*) filter (where l.status = 'active') as active_listings_count,
    min(l.created_at) as member_since
  from public.listings l
  group by l.user_id
) listing_stats on listing_stats.user_id = up.id;

revoke all on table public.seller_profiles from anon, authenticated;
grant select on table public.seller_profiles to anon, authenticated;

create or replace function public.get_saved_cart_summaries()
returns table (
  id bigint,
  name text,
  icon text,
  created_at timestamptz,
  updated_at timestamptz,
  last_used_at timestamptz,
  item_count integer,
  preview_titles text[]
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
    sc.id,
    sc.name,
    sc.icon,
    sc.created_at,
    sc.updated_at,
    sc.last_used_at,
    coalesce(item_stats.item_count, 0)::integer as item_count,
    coalesce(item_stats.preview_titles, array[]::text[]) as preview_titles
  from public.saved_carts sc
  left join lateral (
    select
      count(*)::integer as item_count,
      array(
        select coalesce(l.title, 'Listing')
        from public.saved_cart_items sci2
        left join public.listings l on l.id = sci2.listing_id
        where sci2.saved_cart_id = sc.id
        order by sci2.created_at asc, sci2.listing_id asc
        limit 3
      ) as preview_titles
    from public.saved_cart_items sci
    where sci.saved_cart_id = sc.id
  ) item_stats on true
  where sc.user_id = v_user_id
  order by sc.last_used_at desc nulls last, sc.created_at desc;
end;
$$;

grant execute on function public.get_saved_cart_summaries() to authenticated;

create or replace function public.get_buy_again_listing_cards(p_limit integer default 8)
returns table (
  id bigint,
  user_id uuid,
  title text,
  description text,
  price_cents integer,
  created_at timestamptz,
  available_quantity integer,
  condition text,
  condition_rank smallint,
  status text,
  category_id bigint,
  listing_tags bigint[],
  category_name text,
  primary_image_url text,
  primary_image_sort_order integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 24));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  with recent_orders as (
    select o.id, o.created_at
    from public.orders o
    where o.user_id = v_user_id
      and o.status = 'paid'
    order by o.created_at desc
    limit 25
  ),
  ranked_listings as (
    select
      oi.listing_id,
      max(ro.created_at) as last_ordered_at,
      sum(oi.quantity)::integer as total_qty
    from recent_orders ro
    join public.order_items oi on oi.order_id = ro.id
    group by oi.listing_id
  )
  select
    lc.id,
    lc.user_id,
    lc.title,
    lc.description,
    lc.price_cents,
    lc.created_at,
    lc.available_quantity,
    lc.condition,
    lc.condition_rank,
    lc.status,
    lc.category_id,
    lc.listing_tags,
    lc.category_name,
    lc.primary_image_url,
    lc.primary_image_sort_order
  from ranked_listings rl
  join public.listing_cards lc on lc.id = rl.listing_id
  order by rl.last_ordered_at desc, rl.total_qty desc
  limit v_limit;
end;
$$;

grant execute on function public.get_buy_again_listing_cards(integer) to authenticated;

create or replace function public.get_inbox_threads(p_limit integer default 50)
returns table (
  id bigint,
  listing_id bigint,
  listing_title text,
  listing_image_url text,
  counterpart_id uuid,
  counterpart_name text,
  counterpart_avatar_url text,
  last_message_preview text,
  last_message_at timestamptz,
  unread_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    c.id,
    c.listing_id,
    coalesce(lc.title, 'Listing') as listing_title,
    lc.primary_image_url as listing_image_url,
    case
      when c.buyer_id = v_user_id then c.seller_id
      else c.buyer_id
    end as counterpart_id,
    coalesce(
      up.display_name,
      case
        when c.buyer_id = v_user_id then 'Seller'
        else 'DormDash user'
      end
    ) as counterpart_name,
    up.avatar_url as counterpart_avatar_url,
    c.last_message_preview,
    c.last_message_at,
    cp.unread_count
  from public.conversation_participants cp
  join public.conversations c on c.id = cp.conversation_id
  left join public.listing_cards lc on lc.id = c.listing_id
  left join public.user_profiles up
    on up.id = case
      when c.buyer_id = v_user_id then c.seller_id
      else c.buyer_id
    end
  where cp.user_id = v_user_id
  order by c.last_message_at desc nulls last, c.updated_at desc
  limit v_limit;
end;
$$;

grant execute on function public.get_inbox_threads(integer) to authenticated;

create or replace function public.get_conversation_header_details(p_conversation_id bigint)
returns table (
  id bigint,
  listing_id bigint,
  listing_title text,
  listing_image_url text,
  counterpart_id uuid,
  counterpart_name text,
  counterpart_avatar_url text
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
    c.id,
    c.listing_id,
    coalesce(lc.title, 'Listing') as listing_title,
    lc.primary_image_url as listing_image_url,
    case
      when c.buyer_id = v_user_id then c.seller_id
      else c.buyer_id
    end as counterpart_id,
    coalesce(
      up.display_name,
      case
        when c.buyer_id = v_user_id then 'Seller'
        else 'DormDash user'
      end
    ) as counterpart_name,
    up.avatar_url as counterpart_avatar_url
  from public.conversations c
  left join public.listing_cards lc on lc.id = c.listing_id
  left join public.user_profiles up
    on up.id = case
      when c.buyer_id = v_user_id then c.seller_id
      else c.buyer_id
    end
  where c.id = p_conversation_id
    and (c.buyer_id = v_user_id or c.seller_id = v_user_id)
  limit 1;
end;
$$;

grant execute on function public.get_conversation_header_details(bigint) to authenticated;

create index if not exists idx_listings_listing_tags_gin
on public.listings using gin (listing_tags);

create index if not exists idx_listings_active_available_created_desc
on public.listings (created_at desc)
where status = 'active' and available_quantity > 0;

create index if not exists idx_listings_active_available_category_created_desc
on public.listings (category_id, created_at desc)
where status = 'active' and available_quantity > 0;

create index if not exists idx_listings_active_available_category_price_created_desc
on public.listings (category_id, price_cents, created_at desc)
where status = 'active' and available_quantity > 0;

create index if not exists idx_listings_active_available_condition_rank_created_desc
on public.listings (condition_rank desc, created_at desc)
where status = 'active' and available_quantity > 0;

create index if not exists idx_listings_user_created_at_asc
on public.listings (user_id, created_at asc);

create index if not exists idx_listings_user_active
on public.listings (user_id)
where status = 'active';

create index if not exists idx_listing_images_listing_sort
on public.listing_images (listing_id, sort_order, id);

create index if not exists idx_orders_paid_user_created_desc
on public.orders (user_id, created_at desc)
where status = 'paid';

create index if not exists idx_conversation_participants_user_conversation
on public.conversation_participants (user_id, conversation_id);

drop policy if exists "Anon users can view reviews" on public.reviews;
drop policy if exists "Users can view all reviews" on public.reviews;
drop policy if exists "Users can insert their own reviews" on public.reviews;
drop policy if exists "Users can delete their own reviews" on public.reviews;
drop policy if exists "Users can update their own reviews" on public.reviews;
