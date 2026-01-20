import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Icon } from "@rneui/themed";
import * as Linking from "expo-linking";
import { Colors, Typography, Spacing } from "../../assets/styles";
import type { MapLocation, DeliveryType } from "../../types/order";

interface OrderMapViewProps {
  isMapAvailable: boolean;
  pickupLocation?: MapLocation;
  deliveryLocation?: MapLocation;
  deliveryType: DeliveryType;
  estimatedDistance?: string;
}

export const OrderMapView: React.FC<OrderMapViewProps> = ({
  isMapAvailable,
  pickupLocation,
  deliveryLocation,
  deliveryType,
  estimatedDistance,
}) => {
  const openDirections = () => {
    if (!pickupLocation) return;

    const { latitude, longitude } = pickupLocation;
    const label = pickupLocation.address || "Pickup Location";

    const scheme = Platform.select({
      ios: "maps:",
      android: "geo:",
    });

    const url = Platform.select({
      ios: `maps:?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  if (!isMapAvailable) {
    return (
      <View style={styles.placeholderContainer}>
        <View style={styles.placeholderContent}>
          <Icon
            name="map-marker-off"
            type="material-community"
            color={Colors.mutedGray}
            size={48}
          />
          <Text style={styles.placeholderTitle}>Map details unavailable</Text>
          <Text style={styles.placeholderSubtext}>
            Map will appear once seller accepts your order
          </Text>
        </View>
      </View>
    );
  }

  // Determine the region to show
  const getRegion = () => {
    if (deliveryType === "pickup" && pickupLocation) {
      return {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }

    if (deliveryType === "delivery" && pickupLocation && deliveryLocation) {
      // Center between pickup and delivery
      const centerLat =
        (pickupLocation.latitude + deliveryLocation.latitude) / 2;
      const centerLng =
        (pickupLocation.longitude + deliveryLocation.longitude) / 2;
      const latDelta =
        Math.abs(pickupLocation.latitude - deliveryLocation.latitude) * 1.5;
      const lngDelta =
        Math.abs(pickupLocation.longitude - deliveryLocation.longitude) * 1.5;

      return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lngDelta, 0.02),
      };
    }

    // Default fallback (Penn campus area)
    return {
      latitude: 39.9522,
      longitude: -75.1932,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getRegion()}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {pickupLocation && (
          <Marker
            coordinate={{
              latitude: pickupLocation.latitude,
              longitude: pickupLocation.longitude,
            }}
            title="Pickup Location"
            description={pickupLocation.address}
          >
            <View style={styles.markerPickup}>
              <Icon
                name="store"
                type="material-community"
                color={Colors.white}
                size={16}
              />
            </View>
          </Marker>
        )}

        {deliveryType === "delivery" && deliveryLocation && (
          <Marker
            coordinate={{
              latitude: deliveryLocation.latitude,
              longitude: deliveryLocation.longitude,
            }}
            title="Delivery Location"
            description={deliveryLocation.address}
          >
            <View style={styles.markerDelivery}>
              <Icon
                name="home"
                type="material-community"
                color={Colors.white}
                size={16}
              />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Overlay info */}
      {deliveryType === "pickup" && (
        <View style={styles.overlayContainer}>
          <View style={styles.distanceCard}>
            {estimatedDistance && (
              <View style={styles.distanceInfo}>
                <Icon
                  name="map-marker-distance"
                  type="material-community"
                  color={Colors.primary_blue}
                  size={20}
                />
                <Text style={styles.distanceText}>{estimatedDistance}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={openDirections}
            >
              <Icon
                name="directions"
                type="material-community"
                color={Colors.white}
                size={18}
              />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    height: 200,
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  placeholderTitle: {
    fontSize: 16,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginTop: Spacing.md,
  },
  placeholderSubtext: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    color: Colors.mutedGray,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerPickup: {
    backgroundColor: Colors.primary_green,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  markerDelivery: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  overlayContainer: {
    position: "absolute",
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  distanceCard: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  distanceInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    fontSize: 14,
    fontFamily: Typography.bodyMedium.fontFamily,
    fontWeight: "600",
    color: Colors.darkTeal,
    marginLeft: Spacing.xs,
  },
  directionsButton: {
    backgroundColor: Colors.primary_blue,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  directionsButtonText: {
    fontSize: 14,
    fontFamily: Typography.bodySmall.fontFamily,
    fontWeight: "600",
    color: Colors.white,
    marginLeft: 4,
  },
});

export default OrderMapView;
