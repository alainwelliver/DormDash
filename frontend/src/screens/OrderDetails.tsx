import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Receipt, Ban } from "lucide-react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";

type OrderDetailsNavigationProp = NativeStackNavigationProp<any>;

type RouteParams = {
  orderId: number | string;
};

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
  delivery_address: string | null;
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
}

const formatPrice = (cents: number) =>
  (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending_payment":
      return "Pending payment";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getStatusColors = (status: string) => {
  switch (status) {
    case "paid":
      return { bg: `${Colors.primary_green}1A`, fg: Colors.primary_green };
    case "pending_payment":
      return { bg: `${Colors.primary_accent}1A`, fg: Colors.primary_accent };
    case "cancelled":
      return { bg: `${Colors.mutedGray}1A`, fg: Colors.mutedGray };
    default:
      return { bg: `${Colors.mutedGray}1A`, fg: Colors.mutedGray };
  }
};

const OrderDetails: React.FC = () => {
  const navigation = useNavigation<OrderDetailsNavigationProp>();
  const route = useRoute();
  const orderIdParam = (route.params as RouteParams)?.orderId ?? 0;
  const orderId = Number(orderIdParam) || 0;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const canCancel = useMemo(() => {
    if (!order) return false;
    return order.status === "paid" || order.status === "pending_payment";
  }, [order]);

  const fetchOrder = useCallback(async () => {
    setErrorMsg(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setOrder(null);
        setErrorMsg("Please log in to view this order.");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, delivery_method, delivery_address, subtotal_cents, tax_cents, delivery_fee_cents, total_cents, created_at, paid_at, order_items(id, title, price_cents, quantity)",
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
        setOrder(null);
        setErrorMsg("Couldn't load this order. Please try again.");
        return;
      }

      setOrder((data as any) || null);
    } catch (e) {
      console.error("Error fetching order:", e);
      setOrder(null);
      setErrorMsg("Couldn't load this order. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrder();
    }, [fetchOrder]),
  );

  const handleCancel = async () => {
    if (!order || !canCancel || cancelling) return;

    alert(
      "Cancel order?",
      "If you cancel, this order will be marked as cancelled.",
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Cancel order",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) {
                alert("Error", "Please log in to cancel this order.");
                return;
              }

              const { error: cancelError } = await supabase
                .from("orders")
                .update({ status: "cancelled" })
                .eq("id", order.id)
                .eq("user_id", user.id)
                .in("status", ["paid", "pending_payment"]);

              if (cancelError) {
                console.error("Error cancelling order:", cancelError);
                alert("Error", "Couldn't cancel this order. Please try again.");
                return;
              }

              if (order.delivery_method === "delivery") {
                try {
                  await supabase
                    .from("delivery_orders")
                    .update({ status: "cancelled", dasher_id: null })
                    .eq("order_id", order.id)
                    .in("status", ["pending", "accepted", "picked_up"]);
                } catch (deliveryCancelError) {
                  console.warn(
                    "Best-effort delivery cancel failed:",
                    deliveryCancelError,
                  );
                }
              }

              alert("Order cancelled", "Your order has been cancelled.");
              setOrder((prev) =>
                prev ? { ...prev, status: "cancelled" } : prev,
              );
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  const statusColors = order ? getStatusColors(order.status) : null;

  const renderLineItem = ({ item }: { item: OrderItem }) => (
    <View style={styles.lineItemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.lineItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.lineItemMeta}>
          {formatPrice(item.price_cents)} · Qty {item.quantity}
        </Text>
      </View>
      <Text style={styles.lineItemTotal}>
        {formatPrice(item.price_cents * item.quantity)}
      </Text>
    </View>
  );

  const summaryRows = useMemo(() => {
    if (!order) return [];
    const rows: Array<{ label: string; value: string; bold?: boolean }> = [
      { label: "Subtotal", value: formatPrice(order.subtotal_cents) },
      { label: "Tax", value: formatPrice(order.tax_cents) },
    ];
    if (order.delivery_fee_cents > 0) {
      rows.push({
        label: "Delivery fee",
        value: formatPrice(order.delivery_fee_cents),
      });
    }
    rows.push({
      label: "Total",
      value: formatPrice(order.total_cents),
      bold: true,
    });
    return rows;
  }, [order]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("PastOrders" as any)}
        >
          <ChevronLeft color={Colors.darkTeal} size={32} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Order Details</Text>
          {order?.id ? (
            <Text style={styles.headerSubtitle}>Order #{order.id}</Text>
          ) : null}
        </View>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary_blue}
          style={{ marginTop: 20 }}
        />
      ) : errorMsg ? (
        <View style={styles.emptyContainer}>
          <Receipt color={Colors.lightGray} size={80} />
          <Text style={styles.emptyText}>Unable to load order</Text>
          <Text style={styles.emptySubtext}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : !order ? (
        <View style={styles.emptyContainer}>
          <Receipt color={Colors.lightGray} size={80} />
          <Text style={styles.emptyText}>Order not found</Text>
          <Text style={styles.emptySubtext}>
            This order may have been removed.
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: statusColors?.bg },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColors?.fg }]}>
                  {getStatusLabel(order.status)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Placed</Text>
              <Text style={styles.metaValue}>
                {formatDateTime(order.created_at)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Method</Text>
              <Text style={styles.metaValue}>
                {order.delivery_method === "delivery" ? "Delivery" : "Pickup"}
              </Text>
            </View>

            {order.delivery_method === "delivery" && order.delivery_address ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Address</Text>
                <Text
                  style={[styles.metaValue, { flex: 1, textAlign: "right" }]}
                >
                  {order.delivery_address}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.card}>
            <FlatList
              data={order.order_items || []}
              renderItem={renderLineItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>

          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.card}>
            {summaryRows.map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text
                  style={[styles.summaryLabel, row.bold && styles.summaryBold]}
                >
                  {row.label}
                </Text>
                <Text
                  style={[styles.summaryValue, row.bold && styles.summaryBold]}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {canCancel ? (
            <TouchableOpacity
              style={[styles.cancelButton, cancelling && { opacity: 0.7 }]}
              onPress={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ban size={18} color={Colors.white} />
                  <Text style={styles.cancelButtonText}>Cancel order</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
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
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontSize: 16,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: `${Colors.mutedGray}22`,
    marginVertical: Spacing.sm,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  lineItemTitle: {
    fontSize: 15,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  lineItemMeta: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  lineItemTotal: {
    marginLeft: Spacing.md,
    fontSize: 15,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  summaryBold: {
    fontWeight: "800",
    color: Colors.darkTeal,
  },
  cancelButton: {
    marginTop: Spacing.xl,
    backgroundColor: "#EF4444",
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cancelButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
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
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.white,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
  },
});

export default OrderDetails;
