import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import { uploadImageToSupabase } from "../utils/platform";

const MESSAGE_IMAGES_BUCKET = "message-images";
const MESSAGE_IMAGE_URL_TTL_SECONDS = 60 * 60;

export interface ConversationListItem {
  id: number;
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface ConversationHeader {
  id: number;
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  counterpart_id: string;
  counterpart_name: string;
  counterpart_avatar_url: string | null;
}

export interface ConversationMessage {
  id: number;
  conversation_id: number;
  sender_id: string;
  text_content: string;
  image_path: string | null;
  image_url: string | null;
  created_at: string;
}

export interface SendConversationMessageInput {
  conversationId: number;
  text: string;
  imageUri?: string | null;
}

export const messageQueryKeys = {
  inbox: (limit = 50) => ["messages", "inbox", limit] as const,
  unreadCount: ["messages", "unreadCount"] as const,
  conversation: (conversationId: number) =>
    ["messages", "conversation", conversationId] as const,
  conversationHeader: (conversationId: number) =>
    ["messages", "conversationHeader", conversationId] as const,
};

const getCurrentUserId = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const getListingImageUrl = (
  listingImages:
    | Array<{ url?: string; sort_order?: number }>
    | null
    | undefined,
) => {
  if (!listingImages || listingImages.length === 0) return null;
  const sorted = [...listingImages].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return sorted[0]?.url || null;
};

const getSignedImageUrlMap = async (paths: string[]) => {
  if (paths.length === 0) return new Map<string, string | null>();

  const uniquePaths = Array.from(new Set(paths));
  const { data, error } = await supabase.storage
    .from(MESSAGE_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, MESSAGE_IMAGE_URL_TTL_SECONDS);

  if (error) {
    console.error("Unable to create signed message image URLs:", error);
    return new Map(uniquePaths.map((path) => [path, null]));
  }

  const output = new Map<string, string | null>();
  uniquePaths.forEach((path, index) => {
    output.set(path, data?.[index]?.signedUrl ?? null);
  });
  return output;
};

const normalizeImageExtension = (uri: string) => {
  const raw = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase() || "";
  if (raw === "png") return { ext: "png", contentType: "image/png" };
  if (raw === "webp") return { ext: "webp", contentType: "image/webp" };
  return { ext: "jpg", contentType: "image/jpeg" };
};

export const getOrCreateConversation = async (listingId: number) => {
  const { data, error } = await supabase.rpc("get_or_create_conversation", {
    p_listing_id: listingId,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) {
    throw new Error("Failed to create conversation");
  }
  return row as {
    id: number;
    listing_id: number;
    buyer_id: string;
    seller_id: string;
  };
};

export const fetchInbox = async (
  limit = 50,
): Promise<ConversationListItem[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("conversation_participants")
    .select(
      `
      conversation_id,
      unread_count,
      conversations!inner(
        id,
        listing_id,
        buyer_id,
        seller_id,
        last_message_at,
        last_message_preview,
        updated_at,
        listings(title, listing_images(url, sort_order))
      )
    `,
    )
    .eq("user_id", userId)
    .limit(limit);

  if (error) throw error;

  const participantRows = (data || []) as any[];
  if (participantRows.length === 0) return [];

  const normalized = participantRows
    .map((row) => {
      const conversation = Array.isArray(row.conversations)
        ? row.conversations[0]
        : row.conversations;
      if (!conversation) return null;
      const counterpartId =
        conversation.buyer_id === userId
          ? conversation.seller_id
          : conversation.buyer_id;

      return {
        conversationId: Number(conversation.id),
        listingId: Number(conversation.listing_id),
        listingTitle: conversation.listings?.title || "Listing",
        listingImageUrl: getListingImageUrl(
          conversation.listings?.listing_images,
        ),
        counterpartId,
        lastMessagePreview: conversation.last_message_preview || null,
        lastMessageAt: conversation.last_message_at || null,
        updatedAt: conversation.updated_at || null,
        unreadCount: Number(row.unread_count || 0),
      };
    })
    .filter(Boolean) as Array<{
    conversationId: number;
    listingId: number;
    listingTitle: string;
    listingImageUrl: string | null;
    counterpartId: string;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    updatedAt: string | null;
    unreadCount: number;
  }>;

  const counterpartIds = Array.from(
    new Set(normalized.map((item) => item.counterpartId).filter(Boolean)),
  );

  let profileMap = new Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >();
  if (counterpartIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("seller_profiles")
      .select("id, display_name, avatar_url")
      .in("id", counterpartIds);

    if (profilesError) {
      console.error(
        "Unable to load message counterpart profiles:",
        profilesError,
      );
    } else {
      profileMap = new Map(
        (profiles || []).map((row: any) => [
          row.id,
          {
            display_name: row.display_name || null,
            avatar_url: row.avatar_url || null,
          },
        ]),
      );
    }
  }

  return normalized
    .map((item) => {
      const profile = profileMap.get(item.counterpartId);
      return {
        id: item.conversationId,
        listing_id: item.listingId,
        listing_title: item.listingTitle,
        listing_image_url: item.listingImageUrl,
        counterpart_id: item.counterpartId,
        counterpart_name: profile?.display_name || "DormDash user",
        counterpart_avatar_url: profile?.avatar_url || null,
        last_message_preview: item.lastMessagePreview,
        last_message_at: item.lastMessageAt,
        unread_count: item.unreadCount,
      };
    })
    .sort((a, b) => {
      const aTime = a.last_message_at
        ? new Date(a.last_message_at).getTime()
        : Number.MIN_SAFE_INTEGER;
      const bTime = b.last_message_at
        ? new Date(b.last_message_at).getTime()
        : Number.MIN_SAFE_INTEGER;
      return bTime - aTime;
    });
};

export const fetchUnreadConversationCount = async (): Promise<number> => {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const { data, error } = await supabase
    .from("conversation_participants")
    .select("unread_count")
    .eq("user_id", userId);

  if (error) throw error;
  return (data || []).reduce((sum: number, row: any) => {
    return sum + Math.max(0, Number(row.unread_count || 0));
  }, 0);
};

export const fetchConversationHeader = async (
  conversationId: number,
): Promise<ConversationHeader> => {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      id,
      listing_id,
      buyer_id,
      seller_id,
      listings(title, listing_images(url, sort_order))
    `,
    )
    .eq("id", conversationId)
    .single();

  if (error) throw error;

  const counterpartId =
    data.buyer_id === userId ? data.seller_id : data.buyer_id;
  const listingRelation = Array.isArray((data as any).listings)
    ? (data as any).listings[0]
    : (data as any).listings;
  const { data: profileData } = await supabase
    .from("seller_profiles")
    .select("id, display_name, avatar_url")
    .eq("id", counterpartId)
    .maybeSingle();

  return {
    id: Number(data.id),
    listing_id: Number(data.listing_id),
    listing_title: listingRelation?.title || "Listing",
    listing_image_url: getListingImageUrl(listingRelation?.listing_images),
    counterpart_id: counterpartId,
    counterpart_name: profileData?.display_name || "DormDash user",
    counterpart_avatar_url: profileData?.avatar_url || null,
  };
};

export const fetchConversationMessages = async (
  conversationId: number,
  limit = 100,
): Promise<ConversationMessage[]> => {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select(
      "id, conversation_id, sender_id, text_content, image_path, created_at",
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data || []) as Array<{
    id: number;
    conversation_id: number;
    sender_id: string;
    text_content: string;
    image_path: string | null;
    created_at: string;
  }>;

  const imagePaths = rows
    .map((row) => row.image_path)
    .filter((path): path is string => Boolean(path));

  const imageUrlMap = await getSignedImageUrlMap(imagePaths);

  return rows.map((row) => ({
    ...row,
    image_url: row.image_path
      ? (imageUrlMap.get(row.image_path) ?? null)
      : null,
  }));
};

export const sendConversationMessage = async (
  input: SendConversationMessageInput,
) => {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error("Message text is required.");
  }

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  let uploadedImagePath: string | null = null;
  if (input.imageUri) {
    const fileMeta = normalizeImageExtension(input.imageUri);
    uploadedImagePath = `conversation/${input.conversationId}/${userId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 10)}.${fileMeta.ext}`;

    await uploadImageToSupabase(
      supabase,
      MESSAGE_IMAGES_BUCKET,
      input.imageUri,
      uploadedImagePath,
      fileMeta.contentType,
    );
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: input.conversationId,
      sender_id: userId,
      text_content: trimmedText,
      image_path: uploadedImagePath,
    })
    .select(
      "id, conversation_id, sender_id, text_content, image_path, created_at",
    )
    .single();

  if (error) throw error;

  let signedUrl: string | null = null;
  if (uploadedImagePath) {
    const signedMap = await getSignedImageUrlMap([uploadedImagePath]);
    signedUrl = signedMap.get(uploadedImagePath) ?? null;
  }

  return {
    ...(data as Omit<ConversationMessage, "image_url">),
    image_url: signedUrl,
  } as ConversationMessage;
};

export const markConversationRead = async (
  conversationId: number,
  lastMessageId: number | null,
) => {
  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
    p_last_message_id: lastMessageId,
  });
  if (error) throw error;
};

export const useInbox = (limit = 50) => {
  return useQuery({
    queryKey: messageQueryKeys.inbox(limit),
    queryFn: () => fetchInbox(limit),
  });
};

export const useUnreadConversationCount = () => {
  return useQuery({
    queryKey: messageQueryKeys.unreadCount,
    queryFn: fetchUnreadConversationCount,
  });
};

export const useConversationHeader = (conversationId: number) => {
  return useQuery({
    queryKey: messageQueryKeys.conversationHeader(conversationId),
    queryFn: () => fetchConversationHeader(conversationId),
    enabled: Number.isFinite(conversationId) && conversationId > 0,
  });
};

export const useConversationMessages = (
  conversationId: number,
  limit = 100,
) => {
  return useQuery({
    queryKey: messageQueryKeys.conversation(conversationId),
    queryFn: () => fetchConversationMessages(conversationId, limit),
    enabled: Number.isFinite(conversationId) && conversationId > 0,
  });
};
