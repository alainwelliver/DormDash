-- Optimize messaging RLS policies and fix participant correlation predicates.

alter table if exists public.conversations enable row level security;
alter table if exists public.conversation_messages enable row level security;
alter table if exists public.conversation_participants enable row level security;

drop policy if exists "conversations_select_participants" on public.conversations;
create policy "conversations_select_participants"
on public.conversations
for select
to authenticated
using (
  (select auth.uid()) = buyer_id
  or (select auth.uid()) = seller_id
);

drop policy if exists "conversations_insert_buyer_only" on public.conversations;
create policy "conversations_insert_buyer_only"
on public.conversations
for insert
to authenticated
with check (
  (select auth.uid()) = buyer_id
  and (select auth.uid()) <> seller_id
  and exists (
    select 1
    from public.listings l
    where l.id = conversations.listing_id
      and l.user_id = conversations.seller_id
  )
);

drop policy if exists "conversations_update_participants" on public.conversations;
create policy "conversations_update_participants"
on public.conversations
for update
to authenticated
using (
  (select auth.uid()) = buyer_id
  or (select auth.uid()) = seller_id
)
with check (
  (select auth.uid()) = buyer_id
  or (select auth.uid()) = seller_id
);

drop policy if exists "conversation_messages_select_participants" on public.conversation_messages;
create policy "conversation_messages_select_participants"
on public.conversation_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
);

drop policy if exists "conversation_messages_insert_participants" on public.conversation_messages;
create policy "conversation_messages_insert_participants"
on public.conversation_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = conversation_messages.conversation_id
      and cp.user_id = (select auth.uid())
  )
);

drop policy if exists "conversation_participants_select_own" on public.conversation_participants;
create policy "conversation_participants_select_own"
on public.conversation_participants
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists "conversation_participants_update_own" on public.conversation_participants;
create policy "conversation_participants_update_own"
on public.conversation_participants
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);
