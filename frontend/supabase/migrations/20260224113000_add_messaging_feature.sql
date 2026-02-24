-- Buyer <-> seller messaging for listing-centric conversations.
-- Text is required for every message. Image attachments are optional.

BEGIN;

CREATE TABLE IF NOT EXISTS public.conversations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  listing_id bigint NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_distinct_participants CHECK (buyer_id <> seller_id),
  CONSTRAINT conversations_listing_buyer_seller_unique UNIQUE (listing_id, buyer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text_content text NOT NULL,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_messages_text_required CHECK (
    char_length(btrim(text_content)) > 0
    AND char_length(text_content) <= 2000
  )
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id bigint NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id bigint REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  last_read_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0 CHECK (unread_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_buyer_last_message
  ON public.conversations (buyer_id, last_message_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_seller_last_message
  ON public.conversations (seller_id, last_message_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_created
  ON public.conversation_messages (conversation_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_unread
  ON public.conversation_participants (user_id, unread_count DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation
  ON public.conversation_participants (conversation_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'conversations_select_participants'
  ) THEN
    CREATE POLICY conversations_select_participants
      ON public.conversations
      FOR SELECT
      TO authenticated
      USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'conversations_insert_buyer_only'
  ) THEN
    CREATE POLICY conversations_insert_buyer_only
      ON public.conversations
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = buyer_id
        AND auth.uid() <> seller_id
        AND EXISTS (
          SELECT 1
          FROM public.listings l
          WHERE l.id = listing_id
            AND l.user_id = seller_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversations'
      AND policyname = 'conversations_update_participants'
  ) THEN
    CREATE POLICY conversations_update_participants
      ON public.conversations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
      WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_messages'
      AND policyname = 'conversation_messages_select_participants'
  ) THEN
    CREATE POLICY conversation_messages_select_participants
      ON public.conversation_messages
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_messages'
      AND policyname = 'conversation_messages_insert_participants'
  ) THEN
    CREATE POLICY conversation_messages_insert_participants
      ON public.conversation_messages
      FOR INSERT
      TO authenticated
      WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = conversation_id
            AND cp.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_participants'
      AND policyname = 'conversation_participants_select_own'
  ) THEN
    CREATE POLICY conversation_participants_select_own
      ON public.conversation_participants
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversation_participants'
      AND policyname = 'conversation_participants_update_own'
  ) THEN
    CREATE POLICY conversation_participants_update_own
      ON public.conversation_participants
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.touch_message_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_conversations_touch_updated_at
  ON public.conversations;
CREATE TRIGGER trg_conversations_touch_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.touch_message_updated_at();

DROP TRIGGER IF EXISTS trg_conversation_participants_touch_updated_at
  ON public.conversation_participants;
CREATE TRIGGER trg_conversation_participants_touch_updated_at
BEFORE UPDATE ON public.conversation_participants
FOR EACH ROW
EXECUTE FUNCTION public.touch_message_updated_at();

CREATE OR REPLACE FUNCTION public.sync_conversation_after_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.conversation_participants (
    conversation_id,
    user_id,
    last_read_message_id,
    last_read_at,
    unread_count
  )
  SELECT
    c.id,
    p.user_id,
    CASE WHEN p.user_id = NEW.sender_id THEN NEW.id ELSE NULL END,
    CASE WHEN p.user_id = NEW.sender_id THEN now() ELSE NULL END,
    CASE WHEN p.user_id = NEW.sender_id THEN 0 ELSE 1 END
  FROM public.conversations c
  CROSS JOIN LATERAL (
    VALUES (c.buyer_id), (c.seller_id)
  ) AS p(user_id)
  WHERE c.id = NEW.conversation_id
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE
  SET
    unread_count = CASE
      WHEN conversation_participants.user_id = NEW.sender_id THEN 0
      ELSE conversation_participants.unread_count + 1
    END,
    last_read_message_id = CASE
      WHEN conversation_participants.user_id = NEW.sender_id THEN NEW.id
      ELSE conversation_participants.last_read_message_id
    END,
    last_read_at = CASE
      WHEN conversation_participants.user_id = NEW.sender_id THEN now()
      ELSE conversation_participants.last_read_at
    END;

  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = left(NEW.text_content, 160),
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_conversation_after_message_insert
  ON public.conversation_messages;
CREATE TRIGGER trg_sync_conversation_after_message_insert
AFTER INSERT ON public.conversation_messages
FOR EACH ROW
EXECUTE FUNCTION public.sync_conversation_after_message_insert();

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_listing_id bigint)
RETURNS public.conversations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_seller_id uuid;
  v_conversation public.conversations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT l.user_id
  INTO v_seller_id
  FROM public.listings l
  WHERE l.id = p_listing_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF v_seller_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot create a conversation with your own listing';
  END IF;

  INSERT INTO public.conversations (listing_id, buyer_id, seller_id)
  VALUES (p_listing_id, v_user_id, v_seller_id)
  ON CONFLICT (listing_id, buyer_id, seller_id)
  DO UPDATE
  SET updated_at = now()
  RETURNING * INTO v_conversation;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation.id, v_conversation.buyer_id),
    (v_conversation.id, v_conversation.seller_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conversation;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_conversation(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(
  p_conversation_id bigint,
  p_last_message_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_last_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.conversation_messages m
    WHERE m.id = p_last_message_id
      AND m.conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Message does not belong to this conversation';
  END IF;

  UPDATE public.conversation_participants
  SET
    last_read_message_id = p_last_message_id,
    last_read_at = now(),
    unread_count = 0
  WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(bigint, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(bigint, bigint) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.conversation_messages TO authenticated;
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.conversations_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.conversation_messages_id_seq TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-images',
  'message-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'message_images_select_participants'
  ) THEN
    CREATE POLICY message_images_select_participants
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'message-images'
        AND (storage.foldername(name))[1] = 'conversation'
        AND COALESCE((storage.foldername(name))[2], '') ~ '^[0-9]+$'
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = ((storage.foldername(name))[2])::bigint
            AND cp.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'message_images_insert_sender_only'
  ) THEN
    CREATE POLICY message_images_insert_sender_only
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'message-images'
        AND (storage.foldername(name))[1] = 'conversation'
        AND COALESCE((storage.foldername(name))[2], '') ~ '^[0-9]+$'
        AND (storage.foldername(name))[3] = auth.uid()::text
        AND EXISTS (
          SELECT 1
          FROM public.conversation_participants cp
          WHERE cp.conversation_id = ((storage.foldername(name))[2])::bigint
            AND cp.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

COMMIT;
