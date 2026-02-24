import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, MessageCircle } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { supabase } from "../lib/supabase";
import {
  ConversationListItem,
  messageQueryKeys,
  useInbox,
  useUnreadConversationCount,
} from "../lib/api/messages";

type InboxNavigationProp = NativeStackNavigationProp<any>;

const formatLastMessageTime = (iso: string | null) => {
  if (!iso) return "";
  const dt = new Date(iso);
  const now = new Date();
  const msDiff = now.getTime() - dt.getTime();
  const hours = msDiff / (1000 * 60 * 60);

  if (hours < 24) {
    return dt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (hours < 24 * 7) {
    return dt.toLocaleDateString("en-US", { weekday: "short" });
  }
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const Inbox: React.FC = () => {
  const navigation = useNavigation<InboxNavigationProp>();
  const queryClient = useQueryClient();
  const { data: inboxItems = [], isLoading, refetch } = useInbox();
  const { refetch: refetchUnread } = useUnreadConversationCount();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      channel = supabase
        .channel(`inbox-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversation_messages",
          },
          () => {
            queryClient.invalidateQueries({
              queryKey: messageQueryKeys.inbox(),
            });
            queryClient.invalidateQueries({
              queryKey: messageQueryKeys.unreadCount,
            });
          },
        )
        .subscribe();
    };

    void setupRealtime();

    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: ConversationListItem }) => {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate("Conversation", {
            conversationId: item.id,
            listingId: item.listing_id,
          })
        }
      >
        <View style={styles.avatarWrap}>
          {item.counterpart_avatar_url ? (
            <Image
              source={{ uri: item.counterpart_avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <MessageCircle color={Colors.primary_blue} size={18} />
            </View>
          )}
          {item.unread_count > 0 ? <View style={styles.unreadDot} /> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.counterpart_name}
            </Text>
            <Text style={styles.time}>
              {formatLastMessageTime(item.last_message_at)}
            </Text>
          </View>

          <Text style={styles.listingTitle} numberOfLines={1}>
            {item.listing_title}
          </Text>

          <Text
            style={[
              styles.preview,
              item.unread_count > 0 && styles.previewUnread,
            ]}
            numberOfLines={2}
          >
            {item.last_message_preview || "Start the conversation"}
          </Text>
        </View>

        <View style={styles.trailing}>
          {item.listing_image_url ? (
            <Image
              source={{ uri: item.listing_image_url }}
              style={styles.listingThumb}
            />
          ) : null}
          {item.unread_count > 0 ? (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const emptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <MessageCircle color={Colors.borderGray} size={64} />
        <Text style={styles.emptyTitle}>No messages yet</Text>
        <Text style={styles.emptySubtitle}>
          Start a conversation from any product page.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={Colors.darkTeal} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: Spacing.lg }}
        />
      ) : (
        <FlatList
          data={inboxItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={
            inboxItems.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={emptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGray,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.large,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatarWrap: {
    position: "relative",
    marginRight: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    backgroundColor: Colors.lightMint,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary_blue,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  body: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  time: {
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  listingTitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.primary_blue,
    fontWeight: "700",
  },
  preview: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    lineHeight: 18,
  },
  previewUnread: {
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  trailing: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 44,
    gap: Spacing.xs,
  },
  listingThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  unreadCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary_blue,
  },
  unreadCountText: {
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  emptySubtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    lineHeight: 20,
  },
});

export default Inbox;
