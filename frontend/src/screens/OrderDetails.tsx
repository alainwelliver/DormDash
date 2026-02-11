import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Receipt, Ban, MapPin, Bike } from "lucide-react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { alert } from "../lib/utils/platform";
import NativeOSMMap from "../components/NativeOSMMap";
import { getMapTileUrlTemplate } from "../lib/osm";

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
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
}

interface DeliveryOrder {
  id: number;
  status: string;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  dasher_id: string | null;
  created_at: string;
}

interface TrackingLocation {
  lat: number;
  lng: number;
  updatedAt: string | null;
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

const getDeliveryTrackingLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Searching for a dasher";
    case "accepted":
      return "Dasher heading to pickup";
    case "picked_up":
      return "Out for delivery";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const pickActiveDelivery = (deliveries: DeliveryOrder[]) => {
  return (
    deliveries.find((delivery) => delivery.status === "picked_up") ||
    deliveries.find((delivery) => delivery.status === "accepted") ||
    deliveries.find((delivery) => delivery.status === "pending") ||
    deliveries[0] ||
    null
  );
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
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [trackingLocation, setTrackingLocation] = useState<TrackingLocation | null>(
    null,
  );
  const mapTileUrlTemplate = useMemo(() => getMapTileUrlTemplate(), []);

  const canCancel = useMemo(() => {
    if (!order) return false;
    return order.status === "paid" || order.status === "pending_payment";
  }, [order]);

  const activeDelivery = useMemo(
    () => pickActiveDelivery(deliveryOrders),
    [deliveryOrders],
  );

  const loadTrackingForDelivery = useCallback(async (deliveryOrderId: number) => {
    const { data } = await supabase
      .from("delivery_tracking")
      .select("*")
      .eq("delivery_order_id", deliveryOrderId)
      .limit(1)
      .maybeSingle();

    if (!data) {
      setTrackingLocation(null);
      return;
    }

    setTrackingLocation({
      lat: data.lat,
      lng: data.lng,
      updatedAt: data.updated_at || null,
    });
  }, []);

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

      const withCoordsSelect =
        "id, status, delivery_method, delivery_address, delivery_lat, delivery_lng, subtotal_cents, tax_cents, delivery_fee_cents, total_cents, created_at, paid_at, order_items(id, title, price_cents, quantity)";
      const withoutCoordsSelect =
        "id, status, delivery_method, delivery_address, subtotal_cents, tax_cents, delivery_fee_cents, total_cents, created_at, paid_at, order_items(id, title, price_cents, quantity)";

      let orderData: any = null;
      let orderError: any = null;
      const withCoordsResult = await supabase
        .from("orders")
        .select(withCoordsSelect)
        .eq("id", orderId)
        .eq("user_id", user.id)
        .single();

      orderData = withCoordsResult.data;
      orderError = withCoordsResult.error;

      if (orderError && /delivery_lat|delivery_lng/i.test(orderError.message || "")) {
        const fallbackResult = await supabase
          .from("orders")
          .select(withoutCoordsSelect)
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();
        orderData = fallbackResult.data;
        orderError = fallbackResult.error;
      }

      if (orderError) {
        console.error("Error fetching order:", orderError);
        setOrder(null);
        setErrorMsg("Couldn't load this order. Please try again.");
        return;
      }

      setOrder((orderData as Order) || null);

      if (orderData?.delivery_method === "delivery") {
        const { data: deliveries, error: deliveriesError } = await supabase
          .from("delivery_orders")
          .select("*")
          .eq("order_id", orderId)
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: true });

        if (!deliveriesError) {
          const rows = (deliveries || []) as DeliveryOrder[];
          setDeliveryOrders(rows);
          const selected = pickActiveDelivery(rows);
          if (selected) {
            await loadTrackingForDelivery(selected.id);
          } else {
            setTrackingLocation(null);
          }
        }
      } else {
        setDeliveryOrders([]);
        setTrackingLocation(null);
      }
    } catch (e) {
      console.error("Error fetching order:", e);
      setOrder(null);
      setErrorMsg("Couldn't load this order. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [orderId, loadTrackingForDelivery]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void fetchOrder();
    }, [fetchOrder]),
  );

  useEffect(() => {
    if (!order || order.delivery_method !== "delivery") return;

    const channel = supabase
      .channel(`order-delivery-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
          filter: `order_id=eq.${orderId}`,
        },
        (payload: any) => {
          const updated = payload.new as DeliveryOrder | null;
          if (!updated) return;
          setDeliveryOrders((prev) => {
            const index = prev.findIndex((item) => item.id === updated.id);
            if (index === -1) return [...prev, updated];
            const next = [...prev];
            next[index] = updated;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId, order]);

  useEffect(() => {
    if (!activeDelivery?.id) return;

    let didCancel = false;
    void loadTrackingForDelivery(activeDelivery.id);

    const channel = supabase
      .channel(`order-tracking-${activeDelivery.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_tracking",
          filter: `delivery_order_id=eq.${activeDelivery.id}`,
        },
        (payload: any) => {
          if (!payload.new) return;
          if (didCancel) return;
          setTrackingLocation({
            lat: payload.new.lat,
            lng: payload.new.lng,
            updatedAt: payload.new.updated_at || null,
          });
        },
      )
      .subscribe();

    return () => {
      didCancel = true;
      void supabase.removeChannel(channel);
    };
  }, [activeDelivery?.id, loadTrackingForDelivery]);

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

  const dropoffLat = (order as any)?.delivery_lat ?? activeDelivery?.delivery_lat ?? null;
  const dropoffLng = (order as any)?.delivery_lng ?? activeDelivery?.delivery_lng ?? null;

  const mapCenter = useMemo(() => {
    if (trackingLocation) {
      return {
        latitude: trackingLocation.lat,
        longitude: trackingLocation.lng,
      };
    }
    if (dropoffLat != null && dropoffLng != null) {
      return { latitude: dropoffLat, longitude: dropoffLng };
    }
    return null;
  }, [trackingLocation, dropoffLat, dropoffLng]);

  const routeLine = useMemo(() => {
    if (trackingLocation && dropoffLat != null && dropoffLng != null) {
      return [
        { latitude: trackingLocation.lat, longitude: trackingLocation.lng },
        { latitude: dropoffLat, longitude: dropoffLng },
      ];
    }
    return [];
  }, [trackingLocation, dropoffLat, dropoffLng]);

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
          {order?.id ? <Text style={styles.headerSubtitle}>Order #{order.id}</Text> : null}
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
          <Text style={styles.emptySubtext}>This order may have been removed.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
        >
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
              <Text style={styles.metaValue}>{formatDateTime(order.created_at)}</Text>
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
                <Text style={[styles.metaValue, { flex: 1, textAlign: "right" }]}>
                  {order.delivery_address}
                </Text>
              </View>
            ) : null}
          </View>

          {order.delivery_method === "delivery" ? (
            <>
              <Text style={styles.sectionTitle}>Delivery Tracking</Text>
              <View style={styles.card}>
                <View style={styles.trackingHeader}>
                  <Bike size={18} color={Colors.primary_blue} />
                  <Text style={styles.trackingStatusText}>
                    {activeDelivery
                      ? getDeliveryTrackingLabel(activeDelivery.status)
                      : "Preparing delivery"}
                  </Text>
                </View>
                {trackingLocation?.updatedAt ? (
                  <Text style={styles.trackingUpdatedText}>
                    Updated {formatDateTime(trackingLocation.updatedAt)}
                  </Text>
                ) : null}

                {Platform.OS !== "web" && mapCenter ? (
                  <View style={styles.mapContainer}>
                    <NativeOSMMap
                      initialRegion={{
                        latitude: mapCenter.latitude,
                        longitude: mapCenter.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      }}
                      tileUrlTemplate={mapTileUrlTemplate}
                      dropoff={
                        dropoffLat != null && dropoffLng != null
                          ? {
                              coordinate: {
                                latitude: dropoffLat,
                                longitude: dropoffLng,
                              },
                              title: "Dropoff",
                              description: order.delivery_address || "Dropoff",
                              pinColor: Colors.primary_green,
                            }
                          : undefined
                      }
                      dasher={
                        trackingLocation
                          ? {
                              coordinate: {
                                latitude: trackingLocation.lat,
                                longitude: trackingLocation.lng,
                              },
                              title: "Dasher",
                              pinColor: Colors.primary_blue,
                            }
                          : undefined
                      }
                      routeCoordinates={routeLine.length > 1 ? routeLine : undefined}
                    />
                  </View>
                ) : (
                  <View style={styles.mapFallback}>
                    <MapPin size={16} color={Colors.primary_blue} />
                    <Text style={styles.mapFallbackText}>
                      Tracking map appears on iOS/Android using in-app map tiles.
                    </Text>
                  </View>
                )}

                {deliveryOrders.length > 0 ? (
                  <View style={styles.deliveryList}>
                    {deliveryOrders.map((delivery) => (
                      <View key={delivery.id} style={styles.deliveryRow}>
                        <Text style={styles.deliveryRowTitle}>Delivery #{delivery.id}</Text>
                        <Text style={styles.deliveryRowStatus}>
                          {getDeliveryTrackingLabel(delivery.status)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.trackingUpdatedText}>
                    Waiting for delivery assignment.
                  </Text>
                )}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.card}>
            {(order.order_items || []).map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.separator} /> : null}
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
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.card}>
            {summaryRows.map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, row.bold && styles.summaryBold]}>
                  {row.label}
                </Text>
                <Text style={[styles.summaryValue, row.bold && styles.summaryBold]}>
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
        </ScrollView>
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
  },
  card: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontSize: 17,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "700",
  },
  trackingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  trackingStatusText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  trackingUpdatedText: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  mapContainer: {
    marginTop: Spacing.md,
    height: 220,
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  mapFallback: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.white,
  },
  mapFallbackText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    lineHeight: 18,
  },
  deliveryList: {
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  deliveryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  deliveryRowTitle: {
    fontSize: 13,
    color: Colors.darkTeal,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
  },
  deliveryRowStatus: {
    fontSize: 12,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  lineItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  lineItemTitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  lineItemMeta: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  lineItemTotal: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
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
  },
  summaryBold: {
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  cancelButton: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.medium,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 15,
    color: Colors.white,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 20,
    color: Colors.darkTeal,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    fontSize: 14,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: Typography.buttonText.fontFamily,
  },
});

export default OrderDetails;
