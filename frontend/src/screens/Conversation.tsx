import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ImagePlus, Send, X } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert, pickSingleImage } from "../lib/utils/platform";
import { supabase } from "../lib/supabase";
import {
  ConversationMessage,
  markConversationRead,
  messageQueryKeys,
  sendConversationMessage,
  useConversationHeader,
  useConversationMessages,
} from "../lib/api/messages";

type ConversationNavigationProp = NativeStackNavigationProp<any>;

type RouteParams = {
  conversationId: number | string;
};

const formatMessageTime = (iso: string) => {
  const dt = new Date(iso);
  return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const Conversation: React.FC = () => {
  const navigation = useNavigation<ConversationNavigationProp>();
  const route = useRoute();
  const conversationIdParam = (route.params as RouteParams)?.conversationId;
  const conversationId = Number(conversationIdParam) || 0;
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<ConversationMessage>>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [attachedImageUri, setAttachedImageUri] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const imagePreviewWidth = Math.min(260, Math.max(170, viewportWidth * 0.58));
  const imagePreviewHeight = Math.min(
    220,
    Math.max(140, viewportHeight * 0.28),
  );

  const { data: header, isLoading: headerLoading } =
    useConversationHeader(conversationId);
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useConversationMessages(conversationId);

  const latestMessage = useMemo(
    () => (messages.length > 0 ? messages[messages.length - 1] : null),
    [messages],
  );

  const refreshMessageQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: messageQueryKeys.conversation(conversationId),
    });
    queryClient.invalidateQueries({
      queryKey: messageQueryKeys.inbox(),
    });
    queryClient.invalidateQueries({
      queryKey: messageQueryKeys.unreadCount,
    });
  }, [conversationId, queryClient]);

  const markLatestRead = useCallback(async () => {
    if (!latestMessage?.id || !conversationId) return;
    try {
      await markConversationRead(conversationId, latestMessage.id);
      queryClient.invalidateQueries({
        queryKey: messageQueryKeys.unreadCount,
      });
      queryClient.invalidateQueries({
        queryKey: messageQueryKeys.inbox(),
      });
    } catch (error) {
      console.error("Unable to mark conversation as read:", error);
    }
  }, [conversationId, latestMessage?.id, queryClient]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    void loadCurrentUser();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  useEffect(() => {
    if (!currentUserId || !latestMessage) return;
    if (latestMessage.sender_id !== currentUserId) {
      void markLatestRead();
    }
  }, [currentUserId, latestMessage, markLatestRead]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (!conversationId) return;

    channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          refreshMessageQueries();
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [conversationId, refreshMessageQueries]);

  const handleAttachImage = async () => {
    const uri = await pickSingleImage({
      allowsEditing: true,
      quality: 0.85,
    });
    if (uri) {
      setAttachedImageUri(uri);
    }
  };

  const handleSendMessage = async () => {
    const trimmedText = messageText.trim();
    if (!trimmedText) {
      alert("Message required", "Please type a message before sending.");
      return;
    }
    if (!conversationId || sending) return;

    setSending(true);
    try {
      await sendConversationMessage({
        conversationId,
        text: trimmedText,
        imageUri: attachedImageUri,
      });
      setMessageText("");
      setAttachedImageUri(null);
      await refetchMessages();
      await markLatestRead();
      refreshMessageQueries();
    } catch (error: any) {
      console.error("Unable to send message:", error);
      alert("Message failed", error?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const renderBubble = ({ item }: { item: ConversationMessage }) => {
    const isCurrentUser = item.sender_id === currentUserId;
    return (
      <View
        style={[
          styles.bubbleRow,
          isCurrentUser ? styles.bubbleRowMine : styles.bubbleRowOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isCurrentUser ? styles.myBubble : styles.otherBubble,
          ]}
        >
          {item.image_url ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setExpandedImageUrl(item.image_url)}
            >
              <Image
                source={{ uri: item.image_url }}
                style={[
                  styles.messageImage,
                  {
                    width: imagePreviewWidth,
                    height: imagePreviewHeight,
                  },
                ]}
                resizeMode="cover"
              />
              <Text
                style={[
                  styles.imageTapHint,
                  isCurrentUser
                    ? styles.myImageTapHint
                    : styles.otherImageTapHint,
                ]}
              >
                Tap to expand
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.myMessageText : styles.otherMessageText,
            ]}
          >
            {item.text_content}
          </Text>
          <Text
            style={[
              styles.messageTime,
              isCurrentUser ? styles.myMessageTime : styles.otherMessageTime,
            ]}
          >
            {formatMessageTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color={Colors.darkTeal} size={28} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {header?.counterpart_name || "Conversation"}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {header?.listing_title || "Listing"}
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {headerLoading || messagesLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.primary_blue}
            style={{ marginTop: Spacing.lg }}
          />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderBubble}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No messages yet.</Text>
              </View>
            }
            onRefresh={async () => {
              await refetchMessages();
              await markLatestRead();
            }}
            refreshing={false}
          />
        )}

        {attachedImageUri ? (
          <View style={styles.attachmentPreviewWrap}>
            <Image
              source={{ uri: attachedImageUri }}
              style={styles.attachmentPreview}
            />
            <TouchableOpacity
              style={styles.removeAttachmentButton}
              onPress={() => setAttachedImageUri(null)}
            >
              <X color={Colors.white} size={14} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.composer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={handleAttachImage}
          >
            <ImagePlus color={Colors.primary_blue} size={20} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type your message..."
            placeholderTextColor={Colors.borderGray}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Send color={Colors.white} size={16} />
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={Boolean(expandedImageUrl)}
          animationType="fade"
          transparent
          onRequestClose={() => setExpandedImageUrl(null)}
        >
          <Pressable
            style={styles.imageModalOverlay}
            onPress={() => setExpandedImageUrl(null)}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity
                style={styles.imageModalClose}
                onPress={() => setExpandedImageUrl(null)}
              >
                <X color={Colors.white} size={18} />
              </TouchableOpacity>
              {expandedImageUrl ? (
                <Image
                  source={{ uri: expandedImageUrl }}
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  keyboardWrap: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGray,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.primary_blue,
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  bubbleRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 18,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  myBubble: {
    backgroundColor: Colors.primary_blue,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: Colors.lightGray,
    borderBottomLeftRadius: 6,
  },
  messageImage: {
    borderRadius: 12,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.borderLight,
  },
  imageTapHint: {
    marginTop: -2,
    marginBottom: Spacing.xs,
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
  },
  myImageTapHint: {
    color: "rgba(255,255,255,0.9)",
  },
  otherImageTapHint: {
    color: Colors.mutedGray,
  },
  messageText: {
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    lineHeight: 20,
  },
  myMessageText: {
    color: Colors.white,
  },
  otherMessageText: {
    color: Colors.darkTeal,
  },
  messageTime: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  myMessageTime: {
    color: "rgba(255,255,255,0.85)",
    alignSelf: "flex-end",
  },
  otherMessageTime: {
    color: Colors.mutedGray,
    alignSelf: "flex-end",
  },
  attachmentPreviewWrap: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    alignSelf: "flex-start",
  },
  attachmentPreview: {
    width: 108,
    height: 108,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
  },
  removeAttachmentButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.darkTeal,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === "ios" ? Spacing.md : Spacing.sm,
    backgroundColor: Colors.white,
  },
  attachButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightMint,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.lightGray,
    color: Colors.darkTeal,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 15,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.borderGray,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalClose: {
    position: "absolute",
    top: 12,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  imageModalImage: {
    width: "100%",
    height: "100%",
  },
});

export default Conversation;
