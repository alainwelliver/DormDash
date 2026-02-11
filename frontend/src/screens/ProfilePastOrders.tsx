import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronRight,
  Receipt,
  ChevronLeft,
  Ban,
  ShoppingCart,
} from "lucide-react-native";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";
import { addOrderToCart, summarizeBatchResults } from "../lib/api/repeatBuying";

type PastOrdersNavigationProp = NativeStackNavigationProp<any>;

interface OrderItem {
  id: number;
  title: string;
  price_cents: number;
  quantity: number;
}

interface Order {
  id: number;
  status: string;
  delivery_method: string;
  total_cents: number;
  created_at: string;
  order_items: OrderItem[];
}

const PastOrders: React.FC = () => {
  const navigation = useNavigation<PastOrdersNavigationProp>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reorderingOrderId, setReorderingOrderId] = useState<number | null>(
    null,
  );

  const buildReorderMessage = (rows: any[]) => {
    const summary = summarizeBatchResults(rows);
    if (summary.total === 0 || summary.skipped === summary.total) {
      return "No available items from this order could be added to cart.";
    }
    return [
      `${summary.added + summary.merged} item${summary.added + summary.merged === 1 ? "" : "s"} added.`,
      summary.skipped > 0
        ? `${summary.skipped} unavailable item${summary.skipped === 1 ? "" : "s"} skipped.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const fetchOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, delivery_method, total_cents, created_at, order_items(id, title, price_cents, quantity)",
        )
        .eq("user_id", user.id)
        .in("status", ["paid", "cancelled"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders:", error);
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleOrderAgain = async (orderId: number) => {
    if (reorderingOrderId) return;
    try {
      setReorderingOrderId(orderId);
      const rows = await addOrderToCart(orderId);
      const message = buildReorderMessage(rows);
      alert("Added to cart", message, [
        { text: "Stay here", style: "cancel" },
        {
          text: "Open cart",
          onPress: () =>
            navigation.navigate("MainTabs" as any, { screen: "CartTab" }),
        },
      ]);
    } catch (error) {
      console.error("Order-again failed:", error);
      alert("Error", "Couldn't reorder this past order.");
    } finally {
      setReorderingOrderId(null);
    }
  };

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderOrderItem = ({ item }: { item: Order }) => {
    const itemNames = item.order_items.map((oi) => oi.title).join(", ");
    const isCancelled = item.status === "cancelled";
    return (
      <TouchableOpacity
        style={[styles.orderCard, isCancelled && styles.cancelledCard]}
        onPress={() =>
          navigation.navigate("OrderDetails", { orderId: item.id })
        }
      >
        <View style={styles.iconContainer}>
          {isCancelled ? (
            <Ban color="#DC2626" size={32} />
          ) : (
            <Receipt color={Colors.darkTeal} size={32} />
          )}
        </View>
        <View style={styles.orderInfo}>
          <Text
            style={[styles.orderTitle, isCancelled && styles.cancelledTitle]}
            numberOfLines={1}
          >
            {itemNames || "Order"}
          </Text>
          <Text
            style={[styles.orderNumber, isCancelled && styles.cancelledSubtext]}
          >
            Order #{item.id} · {formatDate(item.created_at)}
          </Text>
          <Text
            style={[
              styles.orderNumber,
              { marginTop: 2 },
              isCancelled && styles.cancelledSubtext,
            ]}
          >
            {formatPrice(item.total_cents)} ·{" "}
            {item.delivery_method === "delivery" ? "Delivery" : "Pickup"}
            {isCancelled ? " · Cancelled" : ""}
          </Text>
          {!isCancelled && (
            <TouchableOpacity
              style={[
                styles.reorderButton,
                reorderingOrderId === item.id && styles.reorderButtonDisabled,
              ]}
              onPress={(event: any) => {
                event?.stopPropagation?.();
                void handleOrderAgain(item.id);
              }}
              disabled={reorderingOrderId === item.id}
            >
              {reorderingOrderId === item.id ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <ShoppingCart color={Colors.white} size={14} />
                  <Text style={styles.reorderButtonText}>Order Again</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <ChevronRight
          color={isCancelled ? "#DC2626" : Colors.mutedGray}
          size={24}
        />
      </TouchableOpacity>
    );
  };

  const completedOrders = orders.filter((o) => o.status !== "cancelled");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  const sections = [
    ...(completedOrders.length > 0
      ? [{ title: "Completed", data: completedOrders }]
      : []),
    ...(cancelledOrders.length > 0
      ? [{ title: "Cancelled", data: cancelledOrders }]
      : []),
  ];

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text
        style={[
          styles.sectionHeader,
          section.title === "Cancelled" && styles.cancelledSectionHeader,
        ]}
      >
        {section.title}
      </Text>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 20 }}
        />
      );
    }

    if (orders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Receipt color={Colors.lightGray} size={80} />
          <Text style={styles.emptyText}>No past orders</Text>
          <Text style={styles.emptySubtext}>
            Your order history will appear here
          </Text>
        </View>
      );
    }

    return (
      <SectionList
        sections={sections}
        renderItem={renderOrderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.navigate("MainTabs" as any, { screen: "ProfileTab" })
          }
        >
          <ChevronLeft color={Colors.darkTeal} size={32} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Past Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>
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
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.base_bg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  orderCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium, // 8px
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cancelledCard: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  iconContainer: {
    marginRight: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: 4,
  },
  cancelledTitle: {
    color: "#DC2626",
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  reorderButton: {
    marginTop: Spacing.sm,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: Colors.primary_blue,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  reorderButtonDisabled: {
    opacity: 0.75,
  },
  reorderButtonText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.white,
    fontWeight: "700",
  },
  cancelledSubtext: {
    color: "#B91C1C",
  },
  sectionHeaderContainer: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  cancelledSectionHeader: {
    color: "#DC2626",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
  },
  emptyText: {
    fontFamily: Typography.heading4.fontFamily,
    fontSize: 20,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: Colors.mutedGray,
    textAlign: "center",
  },
});

export default PastOrders;
