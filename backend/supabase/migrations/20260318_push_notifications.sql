-- Push Notifications Schema for DormDash
-- Stores Expo push tokens and notification logs

-- ============================================================================
-- PUSH TOKENS TABLE
-- ============================================================================

create table if not exists public.push_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  device_id text,
  platform text not null check (platform in ('ios', 'android', 'web')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,

  unique (user_id, token)
);

-- Indexes for efficient lookups
create index if not exists idx_push_tokens_user_active
  on public.push_tokens(user_id, is_active)
  where is_active = true;

create index if not exists idx_push_tokens_token
  on public.push_tokens(token);

-- Enable RLS
alter table public.push_tokens enable row level security;

-- RLS Policies: Users can only manage their own tokens
drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
using (user_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
with check (user_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
using (user_id = auth.uid());

-- Grant permissions
grant select, insert, update, delete on public.push_tokens to authenticated;
grant usage, select on sequence public.push_tokens_id_seq to authenticated;

-- ============================================================================
-- NOTIFICATION LOG TABLE
-- ============================================================================

create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_order_id bigint references public.delivery_orders(id) on delete set null,
  notification_type text not null,
  title text not null,
  body text not null,
  data jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'delivered')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_notification_log_user_created
  on public.notification_log(user_id, created_at desc);

create index if not exists idx_notification_log_delivery_order
  on public.notification_log(delivery_order_id)
  where delivery_order_id is not null;

-- Enable RLS
alter table public.notification_log enable row level security;

-- Users can only view their own notification history
drop policy if exists "notification_log_select_own" on public.notification_log;
create policy "notification_log_select_own"
on public.notification_log
for select
using (user_id = auth.uid());

-- Service role can insert (for edge functions)
-- Note: Edge functions use service_role key which bypasses RLS

grant select on public.notification_log to authenticated;

-- ============================================================================
-- RPC: UPSERT PUSH TOKEN
-- ============================================================================

create or replace function public.upsert_push_token(
  p_token text,
  p_platform text,
  p_device_id text default null
)
returns public.push_tokens
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.push_tokens;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_token is null or trim(p_token) = '' then
    raise exception 'Token is required';
  end if;

  if p_platform not in ('ios', 'android', 'web') then
    raise exception 'Invalid platform. Must be ios, android, or web';
  end if;

  -- Deactivate this token if it belongs to another user (token migration scenario)
  update public.push_tokens
  set is_active = false, updated_at = now()
  where token = p_token
    and user_id <> v_user_id;

  -- Upsert the token for current user
  insert into public.push_tokens (user_id, token, platform, device_id, is_active, updated_at)
  values (v_user_id, p_token, p_platform, p_device_id, true, now())
  on conflict (user_id, token)
  do update set
    platform = excluded.platform,
    device_id = coalesce(excluded.device_id, push_tokens.device_id),
    is_active = true,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.upsert_push_token(text, text, text) to authenticated;

-- ============================================================================
-- RPC: DEACTIVATE PUSH TOKEN
-- ============================================================================

create or replace function public.deactivate_push_token(p_token text)
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

  update public.push_tokens
  set is_active = false, updated_at = now()
  where user_id = v_user_id
    and token = p_token;
end;
$$;

grant execute on function public.deactivate_push_token(text) to authenticated;

-- ============================================================================
-- RPC: GET ACTIVE TOKENS FOR USER (for edge function use)
-- ============================================================================

create or replace function public.get_active_push_tokens(p_user_id uuid)
returns table (token text, platform text)
language sql
security definer
set search_path = public
as $$
  select token, platform
  from public.push_tokens
  where user_id = p_user_id
    and is_active = true;
$$;

-- Only service role should call this (bypasses RLS)

-- ============================================================================
-- TRIGGER: Notify on delivery_order changes (for pg_notify)
-- ============================================================================
-- Note: In production, use Supabase Database Webhooks instead of pg_notify.
-- This trigger is here for local development/testing.

create or replace function public.notify_delivery_order_change()
returns trigger
language plpgsql
security definer
as $$
begin
  perform pg_notify(
    'delivery_order_changes',
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW),
      'old_record', case when TG_OP = 'UPDATE' then row_to_json(OLD) else null end
    )::text
  );

  return NEW;
end;
$$;

drop trigger if exists on_delivery_order_change on public.delivery_orders;
create trigger on_delivery_order_change
  after insert or update on public.delivery_orders
  for each row
  execute function public.notify_delivery_order_change();
