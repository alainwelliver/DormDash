import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { Icon } from "@rneui/themed";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import type { DeliveryOrder, OrderStatus } from "../types/order";
import { STATUS_LABELS } from "../types/order";

type SellerOrdersNavigationProp = NativeStackNavigationProp<any>;

const ETA_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "1.5 hours", value: 90 },
  { label: "2 hours", value: 120 },
];

const SellerOrders: React.FC = () => {
  const navigation = useNavigation<SellerOrdersNavigationProp>();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null);
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Custom time picker state
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDateTime, setCustomDateTime] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");

  const fetchOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("seller_id", user.id)
        .in("status", ["pending", "accepted", "ready", "on_the_way"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Failed to fetch seller orders:", err);
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

  useEffect(() => {
    // Subscribe to real-time updates
    const subscription = supabase
      .channel("seller-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleAcceptOrder = (order: DeliveryOrder) => {
    setSelectedOrder(order);
    setShowEtaModal(true);
    // Reset custom picker state
    setShowCustomPicker(false);
    setCustomDateTime(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hour from now
    setPickerMode("date");
  };

  const handleOtherOption = () => {
    setShowCustomPicker(true);
    setPickerMode("date");
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      if (event.type === "dismissed") {
        setShowCustomPicker(false);
        return;
      }
      if (selectedDate) {
        if (pickerMode === "date") {
          // After selecting date, show time picker
          setCustomDateTime(selectedDate);
          setPickerMode("time");
        } else {
          // After selecting time, calculate and confirm
          setCustomDateTime(selectedDate);
          setShowCustomPicker(false);
          confirmCustomTime(selectedDate);
        }
      }
    } else {
      // iOS - continuous updates
      if (selectedDate) {
        setCustomDateTime(selectedDate);
      }
    }
  };

  const confirmCustomTime = (dateTime: Date) => {
    const now = new Date();
    const diffMs = dateTime.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (diffMinutes <= 0) {
      Alert.alert("Invalid Time", "Please select a time in the future.");
      return;
    }

    confirmAcceptOrder(diffMinutes);
  };

  const formatCustomDateTime = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));

    if (diffMinutes <= 0) return "Select a future time";

    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;

    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
    return `${hours}h ${mins}m`;
  };

  const confirmAcceptOrder = async (etaMinutes: number) => {
    if (!selectedOrder) return;
    setUpdating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update order
      const { error: updateError } = await supabase
        .from("delivery_orders")
        .update({
          status: "accepted",
          estimated_delivery_minutes: etaMinutes,
          seller_accepted_at: new Date().toISOString(),
        })
        .eq("id", selectedOrder.id);

      if (updateError) throw updateError;

      // Add status update
      await supabase.from("order_status_updates").insert({
        order_id: selectedOrder.id,
        status: "accepted",
        message: `Order accepted. Estimated time: ${etaMinutes} minutes`,
        updated_by: user.id,
        updated_by_role: "seller",
      });

      setShowEtaModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err) {
      console.error("Failed to accept order:", err);
      Alert.alert("Error", "Failed to accept order. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const updateOrderStatus = async (order: DeliveryOrder, newStatus: OrderStatus) => {
    setUpdating(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("delivery_orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // Add status update
      await supabase.from("order_status_updates").insert({
        order_id: order.id,
        status: newStatus,
        message: STATUS_LABELS[newStatus],
        updated_by: user.id,
        updated_by_role: "seller",
      });

      fetchOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
      Alert.alert("Error", "Failed to update order. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case "accepted":
        return "ready";
      case "ready":
        return "on_the_way";
      case "on_the_way":
        return "delivered";
      default:
        return null;
    }
  };

  const getActionButtonText = (status: OrderStatus): string => {
    switch (status) {
      case "accepted":
        return "Mark Ready";
      case "ready":
        return "Mark On the Way";
      case "on_the_way":
        return "Mark Delivered";
      default:
        return "";
    }
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
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case "pending":
        return "#FFA500";
      case "accepted":
        return Colors.primary_blue;
      case "ready":
        return Colors.primary_green;
      case "on_the_way":
        return Colors.secondary;
      default:
        return Colors.mutedGray;
    }
  };

  const renderOrderItem = ({ item }: { item: DeliveryOrder }) => {
    const nextStatus = getNextStatus(item.status);

    return (
      <View style={styles.orderCard}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Icon
            name="package-variant"
            type="material-community"
            color={Colors.darkTeal}
            size={20}
          />
          <Text style={styles.itemTitle}>{item.listing_title}</Text>
        </View>

        {/* Delivery Type */}
        <View style={styles.deliveryInfo}>
          <Icon
            name={item.delivery_type === "pickup" ? "walk" : "truck-delivery"}
            type="material-community"
            color={Colors.mutedGray}
            size={16}
          />
          <Text style={styles.deliveryType}>
            {item.delivery_type === "pickup" ? "Pickup" : "Delivery"}
          </Text>
          <Text style={styles.totalPrice}>{formatPrice(item.total_cents)}</Text>
        </View>

        {/* Address */}
        <View style={styles.addressInfo}>
          <Icon
            name="map-marker"
            type="material-community"
            color={Colors.primary_blue}
            size={16}
          />
          <Text style={styles.addressText} numberOfLines={1}>
            {item.delivery_type === "pickup"
              ? item.pickup_address
              : item.delivery_address}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {item.status === "pending" ? (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAcceptOrder(item)}
              disabled={updating}
            >
              <Icon
                name="check"
                type="material-community"
                color={Colors.white}
                size={18}
              />
              <Text style={styles.acceptButtonText}>Accept Order</Text>
            </TouchableOpacity>
          ) : nextStatus ? (
            <TouchableOpacity
              style={styles.updateButton}
              onPress={() => updateOrderStatus(item, nextStatus)}
              disabled={updating}
            >
              <Text style={styles.updateButtonText}>
                {getActionButtonText(item.status)}
              </Text>
              <Icon
                name="arrow-right"
                type="material-community"
                color={Colors.white}
                size={18}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name="inbox"
        type="material-community"
        color={Colors.lightGray}
        size={80}
      />
      <Text style={styles.emptyText}>No active orders</Text>
      <Text style={styles.emptySubtext}>
        Orders from buyers will appear here
      </Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Seller Orders</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            orders.length === 0 && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* ETA Selection Modal */}
      <Modal
        visible={showEtaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEtaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Estimated Time</Text>
            <Text style={styles.modalSubtitle}>
              How long until the order is ready?
            </Text>

            {!showCustomPicker ? (
              <>
                <View style={styles.etaOptions}>
                  {ETA_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.etaOption}
                      onPress={() => confirmAcceptOrder(option.value)}
                      disabled={updating}
                    >
                      <Text style={styles.etaOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Other Option */}
                <TouchableOpacity
                  style={styles.otherOption}
                  onPress={handleOtherOption}
                  disabled={updating}
                >
                  <Icon
                    name="clock-edit-outline"
                    type="material-community"
                    color={Colors.primary_blue}
                    size={20}
                  />
                  <Text style={styles.otherOptionText}>Other (Custom Time)</Text>
                  <Icon
                    name="chevron-right"
                    type="material-community"
                    color={Colors.mutedGray}
                    size={20}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.customPickerContainer}>
                <Text style={styles.customPickerLabel}>
                  Select date and time for delivery/pickup:
                </Text>

                {Platform.OS === "ios" ? (
                  <>
                    <DateTimePicker
                      value={customDateTime}
                      mode="datetime"
                      display="spinner"
                      onChange={handleDateTimeChange}
                      minimumDate={new Date()}
                      style={styles.iosPicker}
                    />
                    <View style={styles.customTimePreview}>
                      <Text style={styles.customTimePreviewLabel}>
                        Estimated duration:
                      </Text>
                      <Text style={styles.customTimePreviewValue}>
                        {formatCustomDateTime(customDateTime)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.confirmCustomButton}
                      onPress={() => confirmCustomTime(customDateTime)}
                      disabled={updating}
                    >
                      <Text style={styles.confirmCustomButtonText}>
                        Confirm Time
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.androidPickerRow}>
                      <TouchableOpacity
                        style={styles.androidPickerButton}
                        onPress={() => {
                          setPickerMode("date");
                        }}
                      >
                        <Icon
                          name="calendar"
                          type="material-community"
                          color={Colors.primary_blue}
                          size={20}
                        />
                        <Text style={styles.androidPickerButtonText}>
                          {customDateTime.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.androidPickerButton}
                        onPress={() => {
                          setPickerMode("time");
                        }}
                      >
                        <Icon
                          name="clock-outline"
                          type="material-community"
                          color={Colors.primary_blue}
                          size={20}
                        />
                        <Text style={styles.androidPickerButtonText}>
                          {customDateTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={customDateTime}
                      mode={pickerMode}
                      display="default"
                      onChange={handleDateTimeChange}
                      minimumDate={new Date()}
                    />
                    <View style={styles.customTimePreview}>
                      <Text style={styles.customTimePreviewLabel}>
                        Estimated duration:
                      </Text>
                      <Text style={styles.customTimePreviewValue}>
                        {formatCustomDateTime(customDateTime)}
                      </Text>
                    </View>
                  </>
                )}

                <TouchableOpacity
                  style={styles.backToOptionsButton}
                  onPress={() => setShowCustomPicker(false)}
                >
                  <Icon
                    name="arrow-left"
                    type="material-community"
                    color={Colors.mutedGray}
                    size={18}
                  />
                  <Text style={styles.backToOptionsText}>Back to presets</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowEtaModal(false);
                setSelectedOrder(null);
                setShowCustomPicker(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {updating && (
              <ActivityIndicator
                style={styles.modalLoader}
                color={Colors.primary_blue}
              />
            )}
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  emptyListContent: {
    flex: 1,
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
  },
  emptySubtext: {
    fontFamily: Typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  orderCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  orderNumber: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  orderDate: {
    fontSize: 13,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  deliveryInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  deliveryType: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginLeft: 4,
    flex: 1,
  },
  totalPrice: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  addressInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  addressText: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.darkTeal,
    marginLeft: 4,
    flex: 1,
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: Colors.base_bg,
    paddingTop: Spacing.md,
  },
  acceptButton: {
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  updateButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  updateButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.white,
    marginRight: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  etaOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  etaOption: {
    width: "48%",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  etaOptionText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  cancelButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.mutedGray,
  },
  modalLoader: {
    marginTop: Spacing.md,
  },
  // Custom picker styles
  otherOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.base_bg,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary_blue,
    borderStyle: "dashed",
  },
  otherOptionText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
    marginHorizontal: Spacing.sm,
  },
  customPickerContainer: {
    marginBottom: Spacing.md,
  },
  customPickerLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  iosPicker: {
    height: 180,
    marginBottom: Spacing.md,
  },
  androidPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  androidPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flex: 0.48,
    justifyContent: "center",
  },
  androidPickerButtonText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginLeft: Spacing.sm,
  },
  customTimePreview: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  customTimePreviewLabel: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    marginRight: Spacing.sm,
  },
  customTimePreviewValue: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "700",
    color: Colors.primary_blue,
  },
  confirmCustomButton: {
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  confirmCustomButtonText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  backToOptionsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  backToOptionsText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    marginLeft: Spacing.xs,
  },
});

export default SellerOrders;
