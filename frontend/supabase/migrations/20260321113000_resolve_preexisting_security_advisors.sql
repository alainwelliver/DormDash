create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is 'Safe public-facing subset of user profile data mirrored from auth.users.';

alter table public.user_profiles enable row level security;

insert into public.user_profiles (id, display_name, username, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'username',
    split_part(u.email::text, '@', 1),
    'DormDash user'
  ) as display_name,
  nullif(u.raw_user_meta_data ->> 'username', '') as username,
  nullif(u.raw_user_meta_data ->> 'avatar_url', '') as avatar_url
from auth.users u
on conflict (id) do update
set
  display_name = excluded.display_name,
  username = excluded.username,
  avatar_url = excluded.avatar_url,
  updated_at = now();

drop policy if exists "user_profiles_public_read" on public.user_profiles;
drop policy if exists "user_profiles_insert_own" on public.user_profiles;
drop policy if exists "user_profiles_update_own" on public.user_profiles;

create policy "user_profiles_public_read"
on public.user_profiles
for select
to anon, authenticated
using (true);

create policy "user_profiles_insert_own"
on public.user_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to anon, authenticated;
grant insert, update on table public.user_profiles to authenticated;

create or replace function public.sync_user_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'username',
      split_part(new.email::text, '@', 1),
      'DormDash user'
    ),
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
  set
    display_name = excluded.display_name,
    username = excluded.username,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;

create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_user_profile_from_auth();

drop view if exists public.seller_profiles;

create view public.seller_profiles
with (security_invoker = on)
as
select
  up.id,
  up.display_name,
  up.username,
  up.avatar_url,
  coalesce(seller_stats.avg_rating, 0::numeric) as avg_rating,
  coalesce(seller_stats.total_reviews, 0::bigint) as total_reviews
from public.user_profiles up
left join (
  select
    l.user_id,
    avg(r.rating)::numeric(3, 2) as avg_rating,
    count(r.id) as total_reviews
  from public.listings l
  join public.reviews r on r.listing_id = l.id
  group by l.user_id
) seller_stats on seller_stats.user_id = up.id;

revoke all on table public.seller_profiles from anon, authenticated;
grant select on table public.seller_profiles to anon, authenticated;

create or replace function public.normalize_tag()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := lower(trim(new.name));
  return new;
end;
$$;

create or replace function public.touch_message_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.delivery_orders enable row level security;
alter table public.order_status_updates enable row level security;

drop policy if exists "delivery_orders_select_authorized" on public.delivery_orders;
drop policy if exists "delivery_orders_update_buyer" on public.delivery_orders;
drop policy if exists "delivery_orders_update_dasher" on public.delivery_orders;

create policy "delivery_orders_select_authorized"
on public.delivery_orders
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
    or dasher_id = (select auth.uid())
    or (
      status = 'pending'
      and dasher_id is null
      and exists (
        select 1
        from public.dashers d
        where d.id = (select auth.uid())
      )
    )
  )
);

create policy "delivery_orders_update_buyer"
on public.delivery_orders
for update
to authenticated
using (
  (select auth.uid()) is not null
  and buyer_id = (select auth.uid())
  and status in ('pending', 'accepted', 'picked_up')
)
with check (
  (select auth.uid()) is not null
  and buyer_id = (select auth.uid())
  and status = 'cancelled'
  and dasher_id is null
);

create policy "delivery_orders_update_dasher"
on public.delivery_orders
for update
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.dashers d
    where d.id = (select auth.uid())
  )
  and (
    (status = 'pending' and dasher_id is null)
    or dasher_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.dashers d
    where d.id = (select auth.uid())
  )
  and (
    (status = 'accepted' and dasher_id = (select auth.uid()))
    or (
      dasher_id = (select auth.uid())
      and status in ('accepted', 'picked_up', 'delivered', 'cancelled')
    )
  )
);

drop policy if exists "order_status_updates_select_authorized" on public.order_status_updates;

create policy "order_status_updates_select_authorized"
on public.order_status_updates
for select
to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.delivery_orders d
    where d.id = public.order_status_updates.order_id
      and (
        d.buyer_id = (select auth.uid())
        or d.seller_id = (select auth.uid())
        or d.dasher_id = (select auth.uid())
      )
  )
);

revoke all on table public.delivery_orders from anon, authenticated;
grant select on table public.delivery_orders to authenticated;
grant update (status, dasher_id) on table public.delivery_orders to authenticated;

revoke all on table public.order_status_updates from anon, authenticated;
grant select on table public.order_status_updates to authenticated;

drop policy if exists "tags_insert_auth" on public.tags;

create policy "tags_insert_auth"
on public.tags
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and name = lower(trim(name))
  and char_length(trim(name)) between 1 and 32
);
