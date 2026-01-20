import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Icon } from "@rneui/themed";
import { Colors, Typography, Spacing } from "../../assets/styles";
import type { OrderStatusUpdate, OrderStatus } from "../../types/order";
import { STATUS_LABELS } from "../../types/order";

interface OrderStatusTimelineProps {
  updates: OrderStatusUpdate[];
  currentStatus: OrderStatus;
  deliveryType: "pickup" | "delivery";
}

const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "ready",
  "on_the_way",
  "delivered",
];

const PICKUP_STATUS_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "ready",
  "delivered",
];

const getStatusIcon = (status: OrderStatus): string => {
  switch (status) {
    case "pending":
      return "clock-outline";
    case "accepted":
      return "check-circle-outline";
    case "ready":
      return "package-variant";
    case "on_the_way":
      return "truck-delivery-outline";
    case "delivered":
      return "check-circle";
    case "cancelled":
      return "close-circle-outline";
    default:
      return "circle-outline";
  }
};

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return "Today";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  updates,
  currentStatus,
  deliveryType,
}) => {
  const statusOrder =
    deliveryType === "pickup" ? PICKUP_STATUS_ORDER : STATUS_ORDER;
  const currentIndex = statusOrder.indexOf(currentStatus);

  // Create a map of status to update for quick lookup
  const updateMap = new Map<OrderStatus, OrderStatusUpdate>();
  updates.forEach((update) => {
    updateMap.set(update.status, update);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Updates</Text>
      <View style={styles.timeline}>
        {statusOrder.map((status, index) => {
          const update = updateMap.get(status);
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <View key={status} style={styles.timelineItem}>
              {/* Connector line */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted || isCurrent
                      ? styles.connectorCompleted
                      : styles.connectorPending,
                  ]}
                />
              )}

              {/* Status indicator */}
              <View style={styles.indicatorRow}>
                <View
                  style={[
                    styles.indicator,
                    isCompleted && styles.indicatorCompleted,
                    isCurrent && styles.indicatorCurrent,
                    isPending && styles.indicatorPending,
                  ]}
                >
                  <Icon
                    name={getStatusIcon(status)}
                    type="material-community"
                    color={
                      isCompleted
                        ? Colors.white
                        : isCurrent
                          ? Colors.white
                          : Colors.mutedGray
                    }
                    size={16}
                  />
                </View>

                {/* Status info */}
                <View style={styles.statusInfo}>
                  <Text
                    style={[
                      styles.statusLabel,
                      isPending && styles.statusLabelPending,
                    ]}
                  >
                    {STATUS_LABELS[status]}
                  </Text>
                  {update ? (
                    <View style={styles.updateDetails}>
                      <Text style={styles.updateTime}>
                        {formatDate(update.created_at)} at{" "}
                        {formatTime(update.created_at)}
                      </Text>
                      {update.message && (
                        <Text style={styles.updateMessage}>{update.message}</Text>
                      )}
                    </View>
                  ) : isPending ? (
                    <Text style={styles.pendingText}>Pending</Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.lg,
  },
  timeline: {
    paddingLeft: Spacing.xs,
  },
  timelineItem: {
    position: "relative",
    marginBottom: Spacing.lg,
  },
  connector: {
    position: "absolute",
    left: 13,
    top: -20,
    width: 2,
    height: 20,
  },
  connectorCompleted: {
    backgroundColor: Colors.primary_green,
  },
  connectorPending: {
    backgroundColor: Colors.mutedGray,
    opacity: 0.3,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  indicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  indicatorCompleted: {
    backgroundColor: Colors.primary_green,
  },
  indicatorCurrent: {
    backgroundColor: Colors.primary_blue,
  },
  indicatorPending: {
    backgroundColor: Colors.lightGray,
    borderWidth: 2,
    borderColor: Colors.mutedGray,
    opacity: 0.5,
  },
  statusInfo: {
    flex: 1,
    paddingTop: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  statusLabelPending: {
    color: Colors.mutedGray,
    opacity: 0.7,
  },
  updateDetails: {
    marginTop: 4,
  },
  updateTime: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  updateMessage: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.darkTeal,
    marginTop: 2,
  },
  pendingText: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    fontStyle: "italic",
    marginTop: 2,
  },
});

export default OrderStatusTimeline;
