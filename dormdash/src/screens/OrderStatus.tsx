import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { OrderStatusTimeline } from "../components/order/OrderStatusTimeline";
import { OrderMapView } from "../components/order/OrderMapView";
import { STATUS_LABELS, STATUS_MESSAGES } from "../types/order";
import type { MapLocation } from "../types/order";

type OrderStatusNavigationProp = NativeStackNavigationProp<any>;

interface RouteParams {
  orderId: number;
}

const OrderStatus: React.FC = () => {
  const navigation = useNavigation<OrderStatusNavigationProp>();
  const route = useRoute();
  const { orderId } = (route.params as RouteParams) || { orderId: 0 };

  const { order, statusUpdates, loading, error } = useOrderTracking(orderId);

  const formatPrice = (priceCents: number) => {
    return (priceCents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const getEstimatedTime = () => {
    if (!order?.estimated_delivery_minutes) return null;

    if (order.seller_accepted_at) {
      const acceptedAt = new Date(order.seller_accepted_at);
      const estimatedArrival = new Date(
        acceptedAt.getTime() + order.estimated_delivery_minutes * 60 * 1000
      );
      const now = new Date();
      const minutesLeft = Math.max(
        0,
        Math.round((estimatedArrival.getTime() - now.getTime()) / 60000)
      );

      if (minutesLeft <= 0) {
        return "Arriving soon";
      }
      return `~${minutesLeft} min`;
    }

    return `~${order.estimated_delivery_minutes} min`;
  };

  const isMapAvailable =
    order?.status !== "pending" && order?.status !== "cancelled";

  const pickupLocation: MapLocation | undefined =
    order?.pickup_lat && order?.pickup_lng
      ? {
          latitude: order.pickup_lat,
          longitude: order.pickup_lng,
          address: order.pickup_address,
        }
      : undefined;

  const deliveryLocation: MapLocation | undefined =
    order?.delivery_lat && order?.delivery_lng
      ? {
          latitude: order.delivery_lat,
          longitude: order.delivery_lng,
          address: order.delivery_address,
        }
      : undefined;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Order Status</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Icon
            name="alert-circle-outline"
            type="material-community"
            color={Colors.mutedGray}
            size={64}
          />
          <Text style={styles.errorText}>
            {error || "Order not found"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Order #{order.order_number}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusIconContainer}>
            <Icon
              name={
                order.status === "delivered"
                  ? "check-circle"
                  : order.status === "cancelled"
                    ? "close-circle"
                    : "clock-outline"
              }
              type="material-community"
              color={Colors.white}
              size={24}
            />
          </View>
          <View style={styles.statusBannerContent}>
            <Text style={styles.statusBannerTitle}>
              {STATUS_LABELS[order.status]}
            </Text>
            <Text style={styles.statusBannerSubtext}>
              {STATUS_MESSAGES[order.status]}
            </Text>
          </View>
        </View>

        {/* Estimated Time Card */}
        {order.status !== "delivered" &&
          order.status !== "cancelled" &&
          order.estimated_delivery_minutes && (
            <View style={styles.etaCard}>
              <Icon
                name={order.delivery_type === "pickup" ? "walk" : "truck-delivery"}
                type="material-community"
                color={Colors.primary_blue}
                size={28}
              />
              <View style={styles.etaContent}>
                <Text style={styles.etaLabel}>
                  {order.delivery_type === "pickup"
                    ? "Estimated Ready Time"
                    : "Estimated Delivery"}
                </Text>
                <Text style={styles.etaValue}>{getEstimatedTime()}</Text>
              </View>
            </View>
          )}

        {/* Map Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {order.delivery_type === "pickup" ? "Pickup Location" : "Delivery Route"}
          </Text>
          <OrderMapView
            isMapAvailable={isMapAvailable}
            pickupLocation={pickupLocation}
            deliveryLocation={deliveryLocation}
            deliveryType={order.delivery_type}
          />
        </View>

        {/* Status Timeline */}
        <View style={styles.section}>
          <OrderStatusTimeline
            updates={statusUpdates}
            currentStatus={order.status}
            deliveryType={order.delivery_type}
          />
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Icon
                name="package-variant"
                type="material-community"
                color={Colors.primary_blue}
                size={20}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Item</Text>
                <Text style={styles.detailValue}>{order.listing_title}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Icon
                name="store"
                type="material-community"
                color={Colors.primary_green}
                size={20}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Pickup From</Text>
                <Text style={styles.detailValue}>{order.pickup_address}</Text>
              </View>
            </View>

            {order.delivery_type === "delivery" && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Icon
                    name="home"
                    type="material-community"
                    color={Colors.secondary}
                    size={20}
                  />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Deliver To</Text>
                    <Text style={styles.detailValue}>
                      {order.delivery_address}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Icon
                name="cash"
                type="material-community"
                color={Colors.darkTeal}
                size={20}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Total Paid</Text>
                <Text style={styles.detailValuePrice}>
                  {formatPrice(order.total_cents)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Delivery Type Badge */}
        <View style={styles.deliveryTypeBadge}>
          <Icon
            name={order.delivery_type === "pickup" ? "walk" : "truck-delivery"}
            type="material-community"
            color={Colors.primary_blue}
            size={16}
          />
          <Text style={styles.deliveryTypeText}>
            {order.delivery_type === "pickup" ? "Pickup Order" : "Delivery Order"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.base_bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    marginTop: Spacing.md,
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.medium,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.white,
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  statusBanner: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 12,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  statusBannerContent: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
  statusBannerSubtext: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  etaCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  etaContent: {
    marginLeft: Spacing.md,
  },
  etaLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  etaValue: {
    fontSize: 20,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  detailsCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  detailValue: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "500",
    color: Colors.darkTeal,
    marginTop: 2,
  },
  detailValuePrice: {
    fontSize: 18,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.base_bg,
    marginVertical: Spacing.md,
  },
  deliveryTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: "center",
  },
  deliveryTypeText: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
    marginLeft: Spacing.xs,
  },
});

export default OrderStatus;
