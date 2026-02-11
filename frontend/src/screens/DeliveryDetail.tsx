import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  CheckCircle2,
} from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Typography, Spacing, BorderRadius } from "../assets/styles";
import NativeOSMMap from "../components/NativeOSMMap";
import { supabase } from "../lib/supabase";
import { alert } from "../lib/utils/platform";
import { getMapTileUrlTemplate } from "../lib/osm";
import { buildOpenInMapsUrl } from "../lib/mapsLinking";
import {
  getCurrentDeviceLocation,
  startDeliveryTracking,
  stopDeliveryTracking,
  syncLocationOnce,
} from "../lib/locationTracking";
import { estimateEtaMinutes, formatDistanceMiles } from "../lib/utils/distance";
import type { DeliveryOrder, DeliveryOrderStatus } from "../types/dasher";

type RouteParams = {
  deliveryOrderId: number;
};

type DeliveryDetailNavigation = NativeStackNavigationProp<any>;

type LatLng = {
  latitude: number;
  longitude: number;
};

type TrackingLocation = {
  lat: number;
  lng: number;
  updatedAt: string | null;
};

type DeliveryPickup = {
  pickup_address: string;
  pickup_building_name?: string | null;
  pickup_lat: number;
  pickup_lng: number;
};

const toLatLng = (
  lat?: number | null,
  lng?: number | null,
): LatLng | null => {
  if (lat == null || lng == null) return null;
  return { latitude: lat, longitude: lng };
};

const distanceBetweenMiles = (
  from: LatLng | null,
  to: LatLng | null,
): number | null => {
  if (!from || !to) return null;

  const dx = (from.latitude - to.latitude) * 69;
  const dy =
    (from.longitude - to.longitude) * 54.6 * Math.cos((from.latitude * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
};

const statusToTitle = (status: string) => {
  switch (status) {
    case "pending":
      return "Ready to Accept";
    case "accepted":
      return "Head to Pickup";
    case "picked_up":
      return "Deliver to Customer";
    case "delivered":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
};

const getPickupForOrder = (order: DeliveryOrder | null): DeliveryPickup | null => {
  if (!order?.delivery_pickups) return null;
  if (Array.isArray(order.delivery_pickups)) {
    return (order.delivery_pickups[0] as DeliveryPickup | undefined) ?? null;
  }
  return order.delivery_pickups as DeliveryPickup;
};

const DeliveryDetail: React.FC = () => {
  const navigation = useNavigation<DeliveryDetailNavigation>();
  const route = useRoute();
  const deliveryOrderId = Number((route.params as RouteParams)?.deliveryOrderId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryOrder, setDeliveryOrder] = useState<DeliveryOrder | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [trackingLocation, setTrackingLocation] = useState<TrackingLocation | null>(
    null,
  );
  const mapTileUrlTemplate = useMemo(() => getMapTileUrlTemplate(), []);
  const deliveryPickup = useMemo(() => getPickupForOrder(deliveryOrder), [deliveryOrder]);
  const pickupAddress = useMemo(
    () => deliveryPickup?.pickup_address || deliveryOrder?.pickup_address || "",
    [deliveryPickup, deliveryOrder?.pickup_address],
  );

  const pickupLatLng = useMemo(
    () =>
      toLatLng(
        deliveryPickup?.pickup_lat ?? deliveryOrder?.pickup_lat,
        deliveryPickup?.pickup_lng ?? deliveryOrder?.pickup_lng,
      ),
    [
      deliveryPickup?.pickup_lat,
      deliveryPickup?.pickup_lng,
      deliveryOrder?.pickup_lat,
      deliveryOrder?.pickup_lng,
    ],
  );

  const dropoffLatLng = useMemo(
    () => toLatLng(deliveryOrder?.delivery_lat, deliveryOrder?.delivery_lng),
    [deliveryOrder?.delivery_lat, deliveryOrder?.delivery_lng],
  );

  const destination = useMemo(() => {
    if (!deliveryOrder) return null;
    if (deliveryOrder.status === "picked_up") return dropoffLatLng;
    if (deliveryOrder.status === "accepted") return pickupLatLng;
    return pickupLatLng || dropoffLatLng;
  }, [deliveryOrder, pickupLatLng, dropoffLatLng]);

  const dasherMarker = useMemo(() => {
    if (trackingLocation) {
      return {
        latitude: trackingLocation.lat,
        longitude: trackingLocation.lng,
      };
    }
    return currentLocation;
  }, [trackingLocation, currentLocation]);

  const distanceToDestinationMiles = useMemo(
    () => distanceBetweenMiles(dasherMarker, destination),
    [dasherMarker, destination],
  );

  const routePreviewLine = useMemo(() => {
    if (deliveryOrder?.status === "pending" && pickupLatLng && dropoffLatLng) {
      return [pickupLatLng, dropoffLatLng];
    }
    if (dasherMarker && destination) {
      return [dasherMarker, destination];
    }
    return [];
  }, [deliveryOrder?.status, pickupLatLng, dropoffLatLng, dasherMarker, destination]);

  const fetchDeliveryOrder = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("delivery_orders")
        .select(
          "*, delivery_pickups(pickup_address, pickup_building_name, pickup_lat, pickup_lng)",
        )
        .eq("id", deliveryOrderId)
        .single();

      if (error) throw error;
      setDeliveryOrder((data || null) as DeliveryOrder | null);
    } catch (error) {
      console.error("Error loading delivery details:", error);
      alert("Error", "Could not load this delivery.");
    } finally {
      setLoading(false);
    }
  }, [deliveryOrderId]);

  const refreshCurrentLocation = useCallback(async () => {
    try {
      const location = await getCurrentDeviceLocation();
      if (!location) return;
      setCurrentLocation({
        latitude: location.lat,
        longitude: location.lng,
      });
    } catch (error) {
      console.warn("Unable to load current location:", error);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchDeliveryOrder();
    void refreshCurrentLocation();
  }, [fetchDeliveryOrder, refreshCurrentLocation]);

  useEffect(() => {
    const channel = supabase
      .channel(`delivery-order-${deliveryOrderId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_orders",
          filter: `id=eq.${deliveryOrderId}`,
        },
        (payload: any) => {
          if (payload.new) {
            void fetchDeliveryOrder();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [deliveryOrderId]);

  useEffect(() => {
    if (!deliveryOrder?.id) return;

    let didCancel = false;
    const loadLatestTracking = async () => {
      const { data } = await supabase
        .from("delivery_tracking")
        .select("*")
        .eq("delivery_order_id", deliveryOrder.id)
        .limit(1)
        .maybeSingle();

      if (didCancel || !data) return;
      setTrackingLocation({
        lat: data.lat,
        lng: data.lng,
        updatedAt: data.updated_at || null,
      });
    };
    void loadLatestTracking();

    const channel = supabase
      .channel(`delivery-tracking-${deliveryOrder.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_tracking",
          filter: `delivery_order_id=eq.${deliveryOrder.id}`,
        },
        (payload: any) => {
          if (!payload.new) return;
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
  }, [deliveryOrder?.id]);

  useEffect(() => {
    if (!deliveryOrder || !["accepted", "picked_up"].includes(deliveryOrder.status))
      return;

    const interval = setInterval(() => {
      void refreshCurrentLocation();
    }, 12000);

    return () => clearInterval(interval);
  }, [deliveryOrder, refreshCurrentLocation]);

  const handleAccept = async () => {
    if (!deliveryOrder || submitting) return;
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Error", "Please log in to accept deliveries.");
        return;
      }

      const rpcResult = await supabase.rpc("accept_delivery_order", {
        p_order_id: deliveryOrder.id,
      } as any);

      if (rpcResult.error) {
        const { error } = await supabase
          .from("delivery_orders")
          .update({
            dasher_id: user.id,
            status: "accepted",
          } as any)
          .eq("id", deliveryOrder.id)
          .eq("status", "pending");
        if (error) throw error;
      }

      await supabase
        .from("dashers")
        .update({ status: "busy" } as any)
        .eq("id", user.id);

      const trackingResult = await startDeliveryTracking(deliveryOrder.id, user.id);
      if (!trackingResult.started && trackingResult.reason) {
        alert("Accepted", trackingResult.reason);
      } else if (trackingResult.reason) {
        alert("Accepted", trackingResult.reason);
      } else {
        alert("Delivery Accepted", "Start heading to the pickup location.");
      }

      await fetchDeliveryOrder();
    } catch (error) {
      console.error("Error accepting delivery:", error);
      alert("Error", "Unable to accept this delivery right now.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (nextStatus: DeliveryOrderStatus) => {
    if (!deliveryOrder || submitting) return;
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Error", "Please log in to update this delivery.");
        return;
      }

      const rpcResult = await supabase.rpc("set_delivery_status", {
        p_order_id: deliveryOrder.id,
        p_status: nextStatus,
      } as any);

      if (rpcResult.error) {
        const { error } = await supabase
          .from("delivery_orders")
          .update({ status: nextStatus } as any)
          .eq("id", deliveryOrder.id)
          .eq("dasher_id", user.id);
        if (error) throw error;
      }

      if (nextStatus === "picked_up") {
        await syncLocationOnce(deliveryOrder.id, user.id);
        alert("Pickup Confirmed", "Now deliver the order to the customer.");
      }

      if (nextStatus === "delivered") {
        await stopDeliveryTracking();
        const { data: dasherStats } = await supabase
          .from("dashers")
          .select("total_deliveries, total_earnings_cents")
          .eq("id", user.id)
          .maybeSingle();

        await supabase
          .from("dashers")
          .update({
            status: "online",
            total_deliveries: (dasherStats?.total_deliveries || 0) + 1,
            total_earnings_cents:
              (dasherStats?.total_earnings_cents || 0) +
              (deliveryOrder.delivery_fee_cents || 0),
          } as any)
          .eq("id", user.id);

        alert("Delivery Completed", "Nice work, this order is marked delivered.");
      }

      await fetchDeliveryOrder();
    } catch (error) {
      console.error("Error updating delivery status:", error);
      alert("Error", "Unable to update delivery status.");
    } finally {
      setSubmitting(false);
    }
  };

  const openNativeNavigation = async () => {
    if (!deliveryOrder) return;

    const isDropoffPhase = deliveryOrder.status === "picked_up";
    const selectedAddress = isDropoffPhase
      ? deliveryOrder.delivery_address?.trim() || ""
      : pickupAddress.trim();
    const selectedCoordinate = isDropoffPhase ? dropoffLatLng : pickupLatLng;

    if (!selectedAddress) {
      alert(
        "Error",
        isDropoffPhase
          ? "Dropoff address is unavailable for this order."
          : "Pickup address is unavailable for this order.",
      );
      return;
    }

    const mapPlatform =
      Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
    const url = buildOpenInMapsUrl({
      platform: mapPlatform,
      address: selectedAddress,
      coordinate: selectedCoordinate,
    });

    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open map app:", error);
      alert("Error", "Could not open maps.");
    }
  };

  const initialRegion = useMemo(() => {
    const anchor = pickupLatLng || dropoffLatLng || dasherMarker;
    if (!anchor) return null;
    return {
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }, [pickupLatLng, dropoffLatLng, dasherMarker]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary_blue} />
        </View>
      </SafeAreaView>
    );
  }

  if (!deliveryOrder) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color={Colors.darkTeal} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>This delivery is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canAccept = deliveryOrder.status === "pending";
  const canConfirmPickup = deliveryOrder.status === "accepted";
  const canConfirmDelivered = deliveryOrder.status === "picked_up";
  const mapButtonLabel =
    deliveryOrder.status === "picked_up"
      ? "Open Dropoff in Maps"
      : "Open Pickup in Maps";

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={Colors.darkTeal} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerTitle}>Delivery #{deliveryOrder.id}</Text>
          <Text style={styles.headerSubtitle}>{statusToTitle(deliveryOrder.status)}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Distance</Text>
          <Text style={styles.metricValue}>
            {formatDistanceMiles(distanceToDestinationMiles)}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>ETA</Text>
          <Text style={styles.metricValue}>
            {estimateEtaMinutes(distanceToDestinationMiles)} min
          </Text>
        </View>
      </View>

      {Platform.OS !== "web" && initialRegion ? (
        <View style={styles.mapWrapper}>
          <NativeOSMMap
            initialRegion={initialRegion}
            tileUrlTemplate={mapTileUrlTemplate}
            showsUserLocation
            showsMyLocationButton
            pickup={
              pickupLatLng
                ? {
                    coordinate: pickupLatLng,
                    title: "Pickup",
                    description: pickupAddress || "Pickup",
                  }
                : undefined
            }
            dropoff={
              dropoffLatLng
                ? {
                    coordinate: dropoffLatLng,
                    title: "Dropoff",
                    description: deliveryOrder.delivery_address,
                    pinColor: Colors.primary_green,
                  }
                : undefined
            }
            dasher={
              dasherMarker
                ? {
                    coordinate: dasherMarker,
                    title: "Your Location",
                    pinColor: Colors.primary_blue,
                  }
                : undefined
            }
            routeCoordinates={
              routePreviewLine.length > 1 ? routePreviewLine : undefined
            }
          />
        </View>
      ) : (
        <View style={styles.mapFallback}>
          <MapPin size={20} color={Colors.primary_blue} />
          <Text style={styles.mapFallbackText}>
            Live map is available on iOS/Android and uses in-app map tiles.
          </Text>
        </View>
      )}

      <View style={styles.addressCard}>
        <View style={styles.addressRow}>
          <Package size={18} color={Colors.primary_blue} />
          <Text style={styles.addressLabel}>Pickup</Text>
        </View>
        <Text style={styles.addressValue}>{pickupAddress || "Private pickup"}</Text>

        <View style={[styles.addressRow, { marginTop: Spacing.md }]}>
          <MapPin size={18} color={Colors.primary_green} />
          <Text style={styles.addressLabel}>Dropoff</Text>
        </View>
        <Text style={styles.addressValue}>{deliveryOrder.delivery_address}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={openNativeNavigation}>
          <Navigation size={18} color={Colors.primary_blue} />
          <Text style={styles.secondaryButtonText}>{mapButtonLabel}</Text>
        </TouchableOpacity>

        {canAccept ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAccept}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <PackageCheck size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Accept Delivery</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canConfirmPickup ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleStatusUpdate("picked_up")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <PackageCheck size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Confirm Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canConfirmDelivered ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: Colors.primary_green }]}
            onPress={() => handleStatusUpdate("delivered")}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <CheckCircle2 size={18} color={Colors.white} />
                <Text style={styles.primaryButtonText}>Mark Delivered</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.lightGray,
  },
  headerSpacer: {
    width: 40,
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
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    padding: Spacing.md,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    color: Colors.darkTeal,
    fontWeight: "700",
    fontFamily: Typography.bodyMedium.fontFamily,
  },
  mapWrapper: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.lightGray,
    height: 260,
  },
  mapFallback: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  mapFallbackText: {
    flex: 1,
    fontSize: 14,
    color: Colors.mutedGray,
    fontFamily: Typography.bodySmall.fontFamily,
  },
  addressCard: {
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: 4,
  },
  addressLabel: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.darkTeal,
    fontWeight: "600",
  },
  addressValue: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    lineHeight: 20,
  },
  actions: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.buttonText.fontFamily,
  },
  secondaryButton: {
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    borderColor: Colors.primary_blue,
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    backgroundColor: Colors.white,
  },
  secondaryButtonText: {
    color: Colors.primary_blue,
    fontSize: 16,
    fontWeight: "600",
    fontFamily: Typography.buttonText.fontFamily,
  },
  errorCard: {
    margin: Spacing.lg,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.lightGray,
    padding: Spacing.lg,
  },
  errorText: {
    fontSize: 15,
    color: Colors.mutedGray,
    fontFamily: Typography.bodyMedium.fontFamily,
  },
});

export default DeliveryDetail;
