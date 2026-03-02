-- Add covering indexes for messaging foreign keys flagged by Supabase advisor.

create index if not exists idx_conversation_messages_sender_id
  on public.conversation_messages(sender_id);

create index if not exists idx_conversation_participants_last_read_message_id
  on public.conversation_participants(last_read_message_id)
  where last_read_message_id is not null;
