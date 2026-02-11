import React, { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Package,
  ArrowDown,
  MapPin,
  PackageCheck,
  CheckCircle,
  Bike,
  ArrowRight,
  Power,
  Info,
  Navigation,
} from "lucide-react-native";
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
import {
  getActiveTrackingDeliveryOrderId,
  getCurrentDeviceLocation,
  startDeliveryTracking,
  stopDeliveryTracking,
} from "../lib/locationTracking";
import {
  formatDistanceMiles,
  haversineDistanceMiles,
} from "../lib/utils/distance";
import type { DasherInfo, DasherStatus, DeliveryOrder } from "../types/dasher";

type DasherDashboardNavigationProp = NativeStackNavigationProp<{
  DasherRegister: undefined;
  DeliveryDetail: { deliveryOrderId: number };
}>;

const DasherDashboard: React.FC = () => {
  const navigation = useNavigation<DasherDashboardNavigationProp>();
  const isWeb = Platform.OS === "web";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dasherInfo, setDasherInfo] = useState<DasherInfo | null>(null);
  const [availableDeliveries, setAvailableDeliveries] = useState<
    DeliveryOrder[]
  >([]);
  const [myDeliveries, setMyDeliveries] = useState<DeliveryOrder[]>([]);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const realtimeRefreshTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const fetchDasherDataRef = useRef<() => Promise<void>>(async () => {});

  const getPickupDetails = useCallback((order: DeliveryOrder) => {
    const relation = (order as any).delivery_pickups;
    const pickupRow = Array.isArray(relation) ? relation[0] : relation;
    return {
      address:
        pickupRow?.pickup_address ||
        order.pickup_address ||
        "Private pickup location",
      lat:
        pickupRow?.pickup_lat != null
          ? Number(pickupRow.pickup_lat)
          : order.pickup_lat != null
            ? Number(order.pickup_lat)
            : null,
      lng:
        pickupRow?.pickup_lng != null
          ? Number(pickupRow.pickup_lng)
          : order.pickup_lng != null
            ? Number(order.pickup_lng)
            : null,
    };
  }, []);

  const refreshCurrentLocation = useCallback(async () => {
    const location = await getCurrentDeviceLocation();
    if (location) {
      setCurrentLocation({ lat: location.lat, lng: location.lng });
    }
  }, []);

  const fetchDasherData = useCallback(async () => {
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

      const [availableResult, mineResult] = await Promise.all([
        supabase
          .from("delivery_orders")
          .select(
            "*, delivery_pickups(pickup_address, pickup_building_name, pickup_lat, pickup_lng)",
          )
          .eq("status", "pending")
          .is("dasher_id", null)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("delivery_orders")
          .select(
            "*, delivery_pickups(pickup_address, pickup_building_name, pickup_lat, pickup_lng)",
          )
          .eq("dasher_id", user.id)
          .in("status", ["accepted", "picked_up"])
          .order("created_at", { ascending: false }),
      ]);

      setAvailableDeliveries(availableResult.data || []);
      setMyDeliveries(mineResult.data || []);

      if (!hasLoadedOnce) {
        setHasLoadedOnce(true);
      }

      // Non-blocking on mobile to avoid delaying dashboard render.
      if (!currentLocation) {
        void refreshCurrentLocation();
      }
    } catch (error) {
      console.error("Error fetching dasher data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentLocation, hasLoadedOnce, refreshCurrentLocation]);

  useEffect(() => {
    fetchDasherDataRef.current = fetchDasherData;
  }, [fetchDasherData]);

  const queueRealtimeRefresh = useCallback(() => {
    if (realtimeRefreshTimeoutRef.current) {
      clearTimeout(realtimeRefreshTimeoutRef.current);
    }

    realtimeRefreshTimeoutRef.current = setTimeout(() => {
      void fetchDasherDataRef.current();
    }, 350);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedOnce) {
        setLoading(true);
      }
      void fetchDasherData();
      if (hasLoadedOnce) {
        void refreshCurrentLocation();
      }
    }, [fetchDasherData, hasLoadedOnce, refreshCurrentLocation]),
  );

  useEffect(() => {
    if (!dasherInfo || myDeliveries.length === 0) return;
    const activeDelivery = myDeliveries[0];
    if (!activeDelivery?.id) return;

    const startTrackingIfNeeded = async () => {
      const currentTrackingId = await getActiveTrackingDeliveryOrderId();
      if (currentTrackingId === activeDelivery.id) return;
      const result = await startDeliveryTracking(
        activeDelivery.id,
        dasherInfo.id,
      );
      if (!result.started && result.reason) {
        console.warn(
          "Unable to start active delivery tracking:",
          result.reason,
        );
      }
    };

    void startTrackingIfNeeded();
  }, [myDeliveries, dasherInfo]);

  useEffect(() => {
    if (!dasherInfo) return;
    if (myDeliveries.length > 0) return;
    void stopDeliveryTracking();
  }, [myDeliveries.length, dasherInfo]);

  useEffect(() => {
    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const watchRealtimeUpdates = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted || !user) return;

      channel = supabase
        .channel(`dasher-dashboard-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "delivery_orders" },
          (payload: any) => {
            const relevantStatuses = new Set([
              "pending",
              "accepted",
              "picked_up",
              "delivered",
              "cancelled",
            ]);

            const newStatus = payload?.new?.status as string | undefined;
            const oldStatus = payload?.old?.status as string | undefined;

            if (
              relevantStatuses.has(newStatus || "") ||
              relevantStatuses.has(oldStatus || "")
            ) {
              queueRealtimeRefresh();
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "dashers",
            filter: `id=eq.${user.id}`,
          },
          () => {
            queueRealtimeRefresh();
          },
        )
        .subscribe();
    };

    void watchRealtimeUpdates();

    return () => {
      isMounted = false;
      if (realtimeRefreshTimeoutRef.current) {
        clearTimeout(realtimeRefreshTimeoutRef.current);
        realtimeRefreshTimeoutRef.current = null;
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [queueRealtimeRefresh]);

  const onRefresh = () => {
    setRefreshing(true);
    void fetchDasherData();
    void refreshCurrentLocation();
  };

  const toggleOnlineStatus = async () => {
    if (!dasherInfo) return;
    if (dasherInfo.status === "busy") {
      alert(
        "You're currently on a delivery",
        "Complete your active delivery before changing your availability.",
      );
      return;
    }

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

  const acceptDelivery = async (order: DeliveryOrder) => {
    if (!dasherInfo) return;

    try {
      const { data: acceptedOrder, error } = await supabase.rpc(
        "accept_delivery_order",
        { p_order_id: order.id },
      );

      if (error) throw error;

      setDasherInfo({ ...dasherInfo, status: "busy" });

      const trackingResult = await startDeliveryTracking(
        acceptedOrder?.id ?? order.id,
        dasherInfo.id,
      );

      if (trackingResult.reason) {
        alert("Delivery Accepted!", trackingResult.reason);
      } else {
        alert(
          "Delivery Accepted!",
          "Head to the pickup location to collect the item.",
        );
      }
      void fetchDasherData();
    } catch (error: any) {
      console.error("Error accepting delivery:", error);
      alert("Error", "Failed to accept delivery. It may have been taken.");
      void fetchDasherData();
    }
  };

  const updateDeliveryStatus = async (
    order: DeliveryOrder,
    newStatus: string,
  ) => {
    try {
      const { error: statusError } = await supabase.rpc("set_delivery_status", {
        p_order_id: order.id,
        p_status: newStatus,
      });

      if (statusError) throw statusError;

      if (newStatus === "delivered" && dasherInfo) {
        const { error: dasherError } = await supabase
          .from("dashers")
          .update({
            total_deliveries: (dasherInfo.total_deliveries || 0) + 1,
            total_earnings_cents:
              (dasherInfo.total_earnings_cents || 0) + order.delivery_fee_cents,
          })
          .eq("id", dasherInfo.id);

        if (dasherError) {
          console.error("Error updating dasher stats:", dasherError);
        }

        await stopDeliveryTracking();
        setDasherInfo({
          ...dasherInfo,
          status: "online",
          total_deliveries: (dasherInfo.total_deliveries || 0) + 1,
          total_earnings_cents:
            (dasherInfo.total_earnings_cents || 0) + order.delivery_fee_cents,
        });
        alert(
          "Delivery Complete!",
          `You earned ${formatPrice(order.delivery_fee_cents)}!`,
        );
      } else if (newStatus === "picked_up") {
        alert("Item Picked Up", "Now deliver it to the buyer's location.");
      }

      void fetchDasherData();
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

  const getStatusLabel = (status: DasherStatus | undefined) => {
    if (status === "online") return "Online";
    if (status === "busy") return "Busy";
    return "Offline";
  };

  const getDistanceToPickup = useCallback(
    (order: DeliveryOrder) => {
      const pickup = getPickupDetails(order);
      if (!currentLocation || pickup.lat == null || pickup.lng == null) {
        return null;
      }

      return haversineDistanceMiles(
        { lat: currentLocation.lat, lng: currentLocation.lng },
        { lat: pickup.lat, lng: pickup.lng },
      );
    },
    [currentLocation, getPickupDetails],
  );

  const openDeliveryDetail = (order: DeliveryOrder) => {
    navigation.navigate("DeliveryDetail", {
      deliveryOrderId: order.id,
    });
  };

  const renderAvailableDelivery = ({ item }: { item: DeliveryOrder }) => (
    <View style={styles.deliveryCard}>
      <View style={styles.deliveryHeader}>
        <View style={styles.earningsBadge}>
          <Text style={styles.earningsText}>
            {formatPrice(item.delivery_fee_cents)}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.deliveryTime}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.distanceText}>
            {`Pickup ${formatDistanceMiles(getDistanceToPickup(item))}`}
          </Text>
        </View>
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <Package color={Colors.primary_blue} size={20} />
          <Text style={styles.routeLabel}>Pickup</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {getPickupDetails(item).address}
        </Text>
      </View>

      <View style={styles.routeDivider}>
        <View style={styles.routeLine} />
        <ArrowDown color={Colors.mutedGray} size={16} />
        <View style={styles.routeLine} />
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <MapPin color={Colors.primary_green} size={20} />
          <Text style={styles.routeLabel}>Deliver</Text>
        </View>
        <Text style={styles.routeAddress} numberOfLines={2}>
          {item.delivery_address}
        </Text>
      </View>

      <View style={styles.deliveryActionRow}>
        <TouchableOpacity
          style={[styles.mapButton, styles.deliveryActionButtonHalf]}
          onPress={() => openDeliveryDetail(item)}
        >
          <Navigation color={Colors.primary_blue} size={16} />
          <Text style={styles.mapButtonText}>View Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => acceptDelivery(item)}
        >
          <Text style={styles.acceptButtonText}>Accept Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMyDelivery = ({ item }: { item: DeliveryOrder }) => (
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
          <Package
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
          {getPickupDetails(item).address}
        </Text>
      </View>

      <View style={styles.routeDivider}>
        <View style={styles.routeLine} />
        <ArrowDown color={Colors.mutedGray} size={16} />
        <View style={styles.routeLine} />
      </View>

      <View style={styles.deliveryRoute}>
        <View style={styles.routePoint}>
          <MapPin
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

      <TouchableOpacity
        style={[styles.mapButton, styles.mapButtonStandalone]}
        onPress={() => openDeliveryDetail(item)}
      >
        <Navigation color={Colors.primary_blue} size={16} />
        <Text style={styles.mapButtonText}>Open Live Map</Text>
      </TouchableOpacity>

      {item.status === "accepted" ? (
        <TouchableOpacity
          style={[styles.actionButton, styles.pickedUpButton]}
          onPress={() => updateDeliveryStatus(item, "picked_up")}
        >
          <PackageCheck color={Colors.white} size={20} />
          <Text style={styles.actionButtonText}>Confirm Pickup</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, styles.deliveredButton]}
          onPress={() => updateDeliveryStatus(item, "delivered")}
        >
          <CheckCircle color={Colors.white} size={20} />
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
            <Bike color={Colors.primary_green} size={80} />
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
            <ArrowRight color={Colors.white} size={20} />
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
            dasherInfo?.status === "busy" && styles.statusToggleBusy,
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
                  {
                    backgroundColor: getStatusColor(
                      dasherInfo?.status || "offline",
                    ),
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusToggleText,
                  dasherInfo?.status === "online" &&
                    styles.statusToggleTextOnline,
                  dasherInfo?.status === "busy" && styles.statusToggleTextBusy,
                ]}
              >
                {getStatusLabel(dasherInfo?.status)}
              </Text>
              <Power
                color={
                  dasherInfo?.status === "online" ||
                  dasherInfo?.status === "busy"
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
              {dasherInfo?.status === "offline" ? (
                <View style={styles.offlineMessage}>
                  <Info color={Colors.mutedGray} size={24} />
                  <Text style={styles.offlineMessageText}>
                    Go online to see and accept deliveries
                  </Text>
                </View>
              ) : dasherInfo?.status === "busy" ? (
                <View style={styles.offlineMessage}>
                  <Info color={Colors.mutedGray} size={24} />
                  <Text style={styles.offlineMessageText}>
                    You are on an active delivery. Complete it before accepting
                    a new one.
                  </Text>
                </View>
              ) : availableDeliveries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package color={Colors.lightGray} size={60} />
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
  statusToggleBusy: {
    backgroundColor: Colors.warning,
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
  statusToggleTextBusy: {
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
  distanceText: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.primary_blue,
    fontWeight: "600",
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
  deliveryActionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  mapButton: {
    borderColor: Colors.primary_blue,
    borderWidth: 1,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    backgroundColor: Colors.white,
  },
  mapButtonStandalone: {
    marginTop: Spacing.md,
  },
  deliveryActionButtonHalf: {
    flex: 1,
  },
  mapButtonText: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.primary_blue,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
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
