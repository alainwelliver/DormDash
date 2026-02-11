import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { haversineDistanceMiles } from "./utils/distance";

type TrackingSource = "foreground" | "background" | "manual";

const BACKGROUND_LOCATION_TASK = "dormdash-delivery-location-task";
const MIN_SEND_INTERVAL_MS = 5000;
const MIN_MOVE_MILES = 0.01;

const TRACKING_DELIVERY_KEY = "activeTrackingDeliveryOrderId";
const TRACKING_DASHER_KEY = "activeTrackingDasherId";

type LocationModule = any;
type TaskManagerModule = any;
type LocationObject = any;
type LocationSubscription = { remove: () => void };

let activeDeliveryOrderId: number | null = null;
let activeDasherId: string | null = null;
let lastSentAtMs = 0;
let lastSentLat: number | null = null;
let lastSentLng: number | null = null;
let foregroundSubscription: LocationSubscription | null = null;
let warnedAboutTrackingTable = false;

const loadLocationModule = (): LocationModule | null => {
  try {
    return require("expo-location");
  } catch {
    return null;
  }
};

const loadTaskManagerModule = (): TaskManagerModule | null => {
  try {
    return require("expo-task-manager");
  } catch {
    return null;
  }
};

const shouldSendLocation = (lat: number, lng: number) => {
  const now = Date.now();
  const elapsed = now - lastSentAtMs;

  if (lastSentLat == null || lastSentLng == null) return true;

  const movedMiles = haversineDistanceMiles(
    { lat: lastSentLat, lng: lastSentLng },
    { lat, lng },
  );

  if (elapsed >= MIN_SEND_INTERVAL_MS) return true;
  return movedMiles >= MIN_MOVE_MILES;
};

const rememberLastSentLocation = (lat: number, lng: number) => {
  lastSentAtMs = Date.now();
  lastSentLat = lat;
  lastSentLng = lng;
};

const persistTrackingIdentity = async (
  deliveryOrderId: number,
  dasherId: string,
) => {
  await AsyncStorage.multiSet([
    [TRACKING_DELIVERY_KEY, String(deliveryOrderId)],
    [TRACKING_DASHER_KEY, dasherId],
  ]);
};

const clearPersistedTrackingIdentity = async () => {
  await AsyncStorage.multiRemove([TRACKING_DELIVERY_KEY, TRACKING_DASHER_KEY]);
};

const hydrateTrackingIdentity = async () => {
  if (activeDeliveryOrderId && activeDasherId) return;
  const values = await AsyncStorage.multiGet([
    TRACKING_DELIVERY_KEY,
    TRACKING_DASHER_KEY,
  ]);

  const deliveryRaw = values.find(
    ([key]) => key === TRACKING_DELIVERY_KEY,
  )?.[1];
  const dasherRaw = values.find(([key]) => key === TRACKING_DASHER_KEY)?.[1];

  if (deliveryRaw && !Number.isNaN(Number(deliveryRaw))) {
    activeDeliveryOrderId = Number(deliveryRaw);
  }
  if (dasherRaw) {
    activeDasherId = dasherRaw;
  }
};

const upsertTrackingRow = async (
  location: LocationObject,
  source: TrackingSource,
) => {
  if (!activeDeliveryOrderId || !activeDasherId) return false;

  const { latitude, longitude, heading, speed, accuracy } = location.coords;
  const { error } = await supabase.from("delivery_tracking").upsert(
    {
      delivery_order_id: activeDeliveryOrderId,
      dasher_id: activeDasherId,
      lat: latitude,
      lng: longitude,
      heading: Number.isFinite(heading) ? heading : null,
      speed_mps: Number.isFinite(speed) ? speed : null,
      accuracy_m: Number.isFinite(accuracy) ? accuracy : null,
      updated_at: new Date(location.timestamp || Date.now()).toISOString(),
      source,
    } as any,
    { onConflict: "delivery_order_id" },
  );

  if (error) {
    if (!warnedAboutTrackingTable) {
      console.warn(
        "Location tracking upsert failed. Ensure delivery_tracking table exists.",
        error.message,
      );
      warnedAboutTrackingTable = true;
    }
    return false;
  }

  rememberLastSentLocation(latitude, longitude);
  return true;
};

const processLocation = async (
  location: LocationObject,
  source: TrackingSource,
) => {
  const { latitude, longitude } = location.coords;
  if (!shouldSendLocation(latitude, longitude)) return false;
  return upsertTrackingRow(location, source);
};

const stopForegroundSubscription = () => {
  if (!foregroundSubscription) return;
  foregroundSubscription.remove();
  foregroundSubscription = null;
};

const ensureBackgroundTaskDefined = () => {
  const TaskManager = loadTaskManagerModule();
  if (!TaskManager) return;
  if (TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) return;

  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({
      data,
      error,
    }: {
      data?: unknown;
      error?: { message?: string };
    }) => {
      if (error) {
        console.error("Background location task error:", error.message);
        return;
      }

      const locations = (data as { locations?: LocationObject[] })?.locations;
      if (!locations || locations.length === 0) return;

      await hydrateTrackingIdentity();
      if (!activeDeliveryOrderId || !activeDasherId) return;

      const latestLocation = locations[locations.length - 1];
      await processLocation(latestLocation, "background");
    },
  );
};

export const getCurrentDeviceLocation = async () => {
  if (Platform.OS === "web") return null;
  const Location = loadLocationModule();
  if (!Location) return null;
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: current.coords.latitude,
    lng: current.coords.longitude,
    accuracyM: current.coords.accuracy ?? null,
  };
};

export const syncLocationOnce = async (
  deliveryOrderId: number,
  dasherId: string,
) => {
  if (Platform.OS === "web") return false;
  const Location = loadLocationModule();
  if (!Location) return false;

  activeDeliveryOrderId = deliveryOrderId;
  activeDasherId = dasherId;
  await persistTrackingIdentity(deliveryOrderId, dasherId);

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return false;

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return processLocation(current, "manual");
};

export const startDeliveryTracking = async (
  deliveryOrderId: number,
  dasherId: string,
) => {
  if (Platform.OS === "web") {
    return { started: false, reason: "Location tracking is mobile-only." };
  }
  const Location = loadLocationModule();
  if (!Location) {
    return {
      started: false,
      reason: "expo-location is not installed yet.",
    };
  }

  ensureBackgroundTaskDefined();
  activeDeliveryOrderId = deliveryOrderId;
  activeDasherId = dasherId;
  await persistTrackingIdentity(deliveryOrderId, dasherId);

  const foregroundPermission =
    await Location.requestForegroundPermissionsAsync();
  if (!foregroundPermission.granted) {
    return { started: false, reason: "Location permission denied." };
  }

  const initialLocation = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  await processLocation(initialLocation, "manual");

  stopForegroundSubscription();
  foregroundSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Highest,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (location: LocationObject) => {
      void processLocation(location, "foreground");
    },
  );

  const backgroundPermission =
    await Location.requestBackgroundPermissionsAsync();
  if (backgroundPermission.granted) {
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      deferredUpdatesDistance: 20,
      deferredUpdatesInterval: 10000,
      distanceInterval: 20,
      timeInterval: 10000,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "DormDash tracking active",
        notificationBody: "Sharing your delivery location with customers.",
      },
    });
    return { started: true as const };
  }

  return {
    started: true as const,
    reason:
      "Background location was not granted. Tracking will pause if app is closed.",
  };
};

export const stopDeliveryTracking = async () => {
  const Location = loadLocationModule();
  stopForegroundSubscription();
  if (!Location) {
    await clearPersistedTrackingIdentity();
    return;
  }

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK,
    );
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (error) {
    console.warn("Failed to stop background tracking:", error);
  }

  activeDeliveryOrderId = null;
  activeDasherId = null;
  lastSentAtMs = 0;
  lastSentLat = null;
  lastSentLng = null;
  await clearPersistedTrackingIdentity();
};

export const getActiveTrackingDeliveryOrderId = async () => {
  await hydrateTrackingIdentity();
  return activeDeliveryOrderId;
};
