import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "@rneui/themed";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  WebLayout,
} from "../assets/styles";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";

type DasherDashboardNavigationProp = NativeStackNavigationProp<{
  DasherRegister: undefined;
  DeliveryDetail: { assignmentId: number };
}>;

type DasherStatus = "offline" | "online" | "busy";

interface DasherInfo {
  id: string;
  status: DasherStatus;
  vehicle_type: string;
  total_deliveries: number;
  total_earnings_cents: number;
}

interface DeliveryAssignment {
  id: number;
  pickup_address: string;
  delivery_address: string;
  status: string;
  delivery_fee_cents: number;
  created_at: string;
  seller_id: string;
  buyer_id: string;
}

const DasherDashboard: React.FC = () => {
  const navigation = useNavigation<DasherDashboardNavigationProp>();
  const isWeb = Platform.OS === "web";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dasherInfo, setDasherInfo] = useState<DasherInfo | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<
    DeliveryAssignment[]
  >([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryAssignment[]>([]);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const fetchDasherData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch dasher info
      const { data: dasher, error: dasherError } = await supabase
        .from("dashers")
        .select("*")
        .eq("id", user.id)
        .single();

      if (dasherError) {
        // Not registered as dasher
        setDasherInfo(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setDasherInfo(dasher);

      // Fetch available deliveries (pending, not assigned)
      const { data: available } = await supabase
        .from("delivery_assignments")
        .select("*")
        .eq("status", "pending")
        .is("dasher_id", null)
        .order("created_at", { ascending: false });

      setAvailableDeliveries(available || []);

      // Fetch my active deliveries
      const { data: mine } = await supabase
        .from("delivery_assignments")
        .select("*")
        .eq("dasher_id", user.id)
        .in("status", ["accepted", "picked_up"])
        .order("created_at", { ascending: false });

      setMyDeliveries(mine || []);
    } catch (error) {
      console.error("Error fetching dasher data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDasherData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDasherData();
  };

  const toggleOnlineStatus = async () => {
    if (!dasherInfo) return;

    const newStatus: DasherStatus =
      dasherInfo.status === "offline" ? "online" : "offline";

    setTogglingStatus(true);
    try {
      const { error } = await supabase
        .from("dashers")
        .update({ status: newStatus })
        .eq("id", dasherInfo.id);

      if (error) throw error;

      setDasherInfo({ ...dasherInfo, status: newStatus });

      if (newStatus === "online") {
        alert("You're Online!", "You'll now see available deliveries.");
      } else {
        alert("You're Offline", "You won't receive new delivery requests.");
      }
    } catch (error: any) {
      console.error("Error toggling status:", error);
      alert("Error", "Failed to update status");
    } finally {
      setTogglingStatus(false);
    }
  };

  const acceptDelivery = async (assignment: DeliveryAssignment) => {
    if (!dasherInfo) return;

    try {
      const { error } = await supabase
        .from("delivery_assignments")
        .update({
          dasher_id: dasherInfo.id,
          status: "accepted",
        })
        .eq("id", assignment.id)
        .eq("status", "pending"); // Only update if still pending

      if (error) throw error;

      alert(
        "Delivery Accepted!",
        "Head to the pickup location to collect the item.",
      );
      fetchDasherData();
    } catch (error: any) {
      console.error("Error accepting delivery:", error);
      alert("Error", "Failed to accept delivery. It may have been taken.");
      fetchDasherData();
    }
  };

  const updateDeliveryStatus = async (
    assignment: DeliveryAssignment,
    newStatus: string,
  ) => {
    try {
      const updates: any = { status: newStatus };

      // If completing delivery, update dasher stats
      if (newStatus === "delivered" && dasherInfo) {
        // Update delivery status
        const { error: deliveryError } = await supabase
          .from("delivery_assignments")
          .update(updates)
          .eq("id", assignment.id);

        if (deliveryError) throw deliveryError;

        // Update dasher stats
        const { error: dasherError } = await supabase
          .from("dashers")
          .update({
            total_deliveries: (dasherInfo.total_deliveries || 0) + 1,
            total_earnings_cents:
              (dasherInfo.total_earnings_cents || 0) +
              assignment.delivery_fee_cents,
            status: "online",
          })
          .eq("id", dasherInfo.id);

        if (dasherError) throw dasherError;

        alert(
          "Delivery Complete!",
          `You earned ${formatPrice(assignment.delivery_fee_cents)}!`,
        );
      } else {
        const { error } = await supabase
          .from("delivery_assignments")
          .update(updates)
          .eq("id", assignment.id);

        if (error) throw error;

        if (newStatus === "picked_up") {
          alert("Item Picked Up", "Now deliver it to the buyer's location.");
        }
      }

      fetchDasherData();
    } catch (error: any) {
      console.error("Error updating delivery:", error);
      alert("Error", "Failed to update delivery status");
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  };

  const getStatusColor = (status: DasherStatus) => {
    switch (status) {
      case "online":
        return Colors.primary_green;
      case "busy":
        return Colors.warning;
      default:
        return Colors.mutedGray;
    }
  };

  const renderAvailableDelivery = ({ item }: { item: DeliveryAssignment }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <View style={styles.earningsBadge}>
          <Text style={styles.earningsText}>
            {formatPrice(item.delivery_fee_cents)}
          </Text>
        </View>
        <Text style={styles.deliveryTime}>
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <Icon
            name="package-variant"
            type="material-community"
            color={Colors.primary_blue}
            size={20}
          />
          <Text style={styles.routeLabel}>Pickup</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {item.pickup_address}
        </Text>
      </View>

      <View style={styles.routeDivider}>
        <View style={styles.routeLine} />
        <Icon
          name="arrow-down"
          type="material-community"
          color={Colors.mutedGray}
          size={16}
        />
        <View style={styles.routeLine} />
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <Icon
            name="map-marker"
            type="material-community"
            color={Colors.primary_green}
            size={20}
          />
          <Text style={styles.routeLabel}>Deliver</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {item.delivery_address}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => acceptDelivery(item)}
      >
        <Text style={styles.acceptButtonText}>Accept Delivery</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMyDelivery = ({ item }: { item: DeliveryAssignment }) => (
    <View style={[styles.deliveryCard, styles.myDeliveryCard]}>
      <View style={styles.deliveryHeader}>
        <View
          style={[
            styles.statusBadge,
            item.status === "picked_up" && styles.statusBadgeActive,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "picked_up" && styles.statusTextActive,
            ]}
          >
            {item.status === "accepted" ? "Pickup Required" : "In Transit"}
          </Text>
        </View>
        <Text style={styles.deliveryEarnings}>
          {formatPrice(item.delivery_fee_cents)}
        </Text>
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <Icon
            name="package-variant"
            type="material-community"
            color={
              item.status === "accepted"
                ? Colors.primary_blue
                : Colors.mutedGray
            }
            size={20}
          />
          <Text style={styles.routeLabel}>Pickup</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {item.pickup_address}
        </Text>
      </View>

      <View style={styles.routeDivider}>
        <View style={styles.routeLine} />
        <Icon
          name="arrow-down"
          type="material-community"
          color={Colors.mutedGray}
          size={16}
        />
        <View style={styles.routeLine} />
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <Icon
            name="map-marker"
            type="material-community"
            color={
              item.status === "picked_up"
                ? Colors.primary_green
                : Colors.mutedGray
            }
            size={20}
          />
          <Text style={styles.routeLabel}>Deliver</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {item.delivery_address}
        </Text>
      </View>

      {item.status === "accepted" ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.pickedUpButton]}
          onPress={() => updateDeliveryStatus(item, "picked_up")}
        >
          <Icon
            name="package-variant-closed-check"
            type="material-community"
            color={Colors.white}
            size={20}
          />
          <Text style={styles.actionButtonText}>Confirm Pickup</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, styles.deliveredButton]}
          onPress={() => updateDeliveryStatus(item, "delivered")}
        >
          <Icon
            name="check-circle"
            type="material-community"
            color={Colors.white}
            size={20}
          />
          <Text style={styles.actionButtonText}>Mark as Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Not registered as dasher
  if (!loading && !dasherInfo) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.notDasherContainer}>
          <View style={styles.notDasherIcon}>
            <Icon
              name="bike-fast"
              type="material-community"
              color={Colors.primary_green}
              size={80}
            />
          </View>
          <Text style={styles.notDasherTitle}>Become a Dasher</Text>
          <Text style={styles.notDasherSubtitle}>
            Earn money by delivering items to fellow Penn students. Set your own
            schedule and dash when it works for you.
          </Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate("DasherRegister")}
          >
            <Text style={styles.registerButtonText}>Get Started</Text>
            <Icon
              name="arrow-right"
              type="material-community"
              color={Colors.white}
              size={20}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Stats Header */}
      <View style={[styles.statsHeader, isWeb && styles.statsHeaderWeb]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {dasherInfo?.total_deliveries || 0}
            </Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatPrice(dasherInfo?.total_earnings_cents || 0)}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>

        {/* Online Toggle */}
        <TouchableOpacity
          style={[
            styles.statusToggle,
            dasherInfo?.status === "online" && styles.statusToggleOnline,
          ]}
          onPress={toggleOnlineStatus}
          disabled={togglingStatus}
        >
          {togglingStatus ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(dasherInfo?.status || "offline") },
                ]}
              />
              <Text
                style={[
                  styles.statusToggleText,
                  dasherInfo?.status === "online" &&
                    styles.statusToggleTextOnline,
                ]}
              >
                {dasherInfo?.status === "online" ? "Online" : "Offline"}
              </Text>
              <Icon
                name="power"
                type="material-community"
                color={
                  dasherInfo?.status === "online"
                    ? Colors.white
                    : Colors.mutedGray
                }
                size={20}
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* My Active Deliveries */}
            {myDeliveries.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Active Deliveries</Text>
                {myDeliveries.map((delivery) => (
                  <View key={delivery.id}>
                    {renderMyDelivery({ item: delivery })}
                  </View>
                ))}
              </View>
            )}

            {/* Available Deliveries */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Available Deliveries
                {availableDeliveries.length > 0 &&
                  ` (${availableDeliveries.length})`}
              </Text>
              {dasherInfo?.status !== "online" ? (
                <View style={styles.offlineMessage}>
                  <Icon
                    name="information-outline"
                    type="material-community"
                    color={Colors.mutedGray}
                    size={24}
                  />
                  <Text style={styles.offlineMessageText}>
                    Go online to see and accept deliveries
                  </Text>
                </View>
              ) : availableDeliveries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon
                    name="package-variant"
                    type="material-community"
                    color={Colors.lightGray}
                    size={60}
                  />
                  <Text style={styles.emptyStateText}>
                    No deliveries available right now
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Pull down to refresh
                  </Text>
                </View>
              ) : (
                availableDeliveries.map((delivery) => (
                  <View key={delivery.id}>
                    {renderAvailableDelivery({ item: delivery })}
                  </View>
                ))
              )}
            </View>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />
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
  // Stats Header
  statsHeader: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  statsHeaderWeb: {
    maxWidth: WebLayout.maxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    fontSize: 24,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.lightGray,
  },
  // Status Toggle
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.large,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  statusToggleOnline: {
    backgroundColor: Colors.primary_green,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusToggleText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  statusToggleTextOnline: {
    color: Colors.white,
  },
  // List Content
  listContent: {
    paddingBottom: Spacing.xxxl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Typography.heading4.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.md,
  },
  // Delivery Card
  deliveryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.large,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  myDeliveryCard: {
    borderColor: Colors.primary_green,
    borderWidth: 2,
  },
  deliveryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  earningsBadge: {
    backgroundColor: Colors.lightMint,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  earningsText: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_green,
  },
  deliveryTime: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  deliveryEarnings: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "700",
    color: Colors.primary_green,
  },
  statusBadge: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.small,
  },
  statusBadgeActive: {
    backgroundColor: Colors.primary_green,
  },
  statusText: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  statusTextActive: {
    color: Colors.white,
  },
  deliveryRoute: {
    marginBottom: Spacing.sm,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 4,
  },
  routeLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
  },
  routeAddress: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginLeft: 28,
  },
  routeDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 9,
    marginVertical: Spacing.xs,
  },
  routeLine: {
    width: 1,
    height: 8,
    backgroundColor: Colors.lightGray,
  },
  acceptButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  acceptButtonText: {
    fontSize: 16,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  pickedUpButton: {
    backgroundColor: Colors.primary_blue,
  },
  deliveredButton: {
    backgroundColor: Colors.primary_green,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "600",
    color: Colors.white,
  },
  // Empty/Offline States
  offlineMessage: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  offlineMessageText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: Typography.bodyLarge.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    marginTop: Spacing.xs,
  },
  // Not Dasher
  notDasherContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xxxl,
  },
  notDasherIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.lightMint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  notDasherTitle: {
    fontSize: 28,
    fontFamily: Typography.heading3.fontFamily,
    fontWeight: "700",
    color: Colors.darkTeal,
    marginBottom: Spacing.sm,
  },
  notDasherSubtitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  registerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary_green,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  registerButtonText: {
    fontSize: 18,
    fontFamily: Typography.buttonText.fontFamily,
    fontWeight: "700",
    color: Colors.white,
  },
});

export default DasherDashboard;
