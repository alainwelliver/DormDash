import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Icon } from "@rneui/themed";
import { supabase } from "../lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing } from "../assets/styles";
import type { DeliveryOrder, OrderStatus } from "../types/order";
import { STATUS_LABELS } from "../types/order";

type PastOrdersNavigationProp = NativeStackNavigationProp<{
  OrderStatus: { orderId: number };
}>;

const PastOrders: React.FC = () => {
  const navigation = useNavigation<PastOrdersNavigationProp>();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "accepted":
        return Colors.primary_blue;
      case "ready":
      case "on_the_way":
        return Colors.secondary;
      case "delivered":
        return Colors.primary_green;
      case "cancelled":
        return Colors.mutedGray;
      default:
        return Colors.mutedGray;
    }
  };

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case "pending":
        return "clock-outline";
      case "accepted":
        return "check-circle-outline";
      case "ready":
        return "package-variant";
      case "on_the_way":
        return "truck-delivery";
      case "delivered":
        return "check-circle";
      case "cancelled":
        return "close-circle-outline";
      default:
        return "circle-outline";
    }
  };

  const renderOrderItem = ({ item }: { item: DeliveryOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderStatus", { orderId: item.id })}
    >
      <View style={styles.orderHeader}>
        <View style={styles.iconContainer}>
          <Icon
            name={getStatusIcon(item.status)}
            type="material-community"
            color={getStatusColor(item.status)}
            size={28}
          />
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {item.listing_title}
          </Text>
          <Text style={styles.orderNumber}>Order #{item.order_number}</Text>
          <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.orderRight}>
          <Text style={styles.orderPrice}>{formatPrice(item.total_cents)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Text
              style={[styles.statusText, { color: getStatusColor(item.status) }]}
            >
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.deliveryTypeTag}>
          <Icon
            name={item.delivery_type === "pickup" ? "walk" : "truck-delivery"}
            type="material-community"
            color={Colors.mutedGray}
            size={14}
          />
          <Text style={styles.deliveryTypeText}>
            {item.delivery_type === "pickup" ? "Pickup" : "Delivery"}
          </Text>
        </View>
        <Icon
          name="chevron-right"
          type="material-community"
          color={Colors.mutedGray}
          size={24}
        />
      </View>
    </TouchableOpacity>
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
          <Icon
            name="receipt"
            type="material-community"
            color={Colors.lightGray}
            size={80}
          />
          <Text style={styles.emptyText}>No past orders</Text>
          <Text style={styles.emptySubtext}>
            Your order history will appear here
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-left"
            type="material-community"
            color={Colors.darkTeal}
            size={32}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
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
    paddingBottom: Spacing.xxxl,
  },
  orderCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.base_bg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  orderDate: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 2,
  },
  orderRight: {
    alignItems: "flex-end",
  },
  orderPrice: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
  },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.base_bg,
  },
  deliveryTypeTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryTypeText: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginLeft: 4,
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
