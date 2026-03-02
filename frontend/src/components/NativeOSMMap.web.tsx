import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import mapboxgl from "mapbox-gl";

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapRegion = MapCoordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

type MarkerInfo = {
  coordinate: MapCoordinate;
  title: string;
  description?: string;
  pinColor?: string;
};

type NativeOSMMapProps = {
  initialRegion: MapRegion;
  tileUrlTemplate?: string;
  pickup?: MarkerInfo;
  dropoff?: MarkerInfo;
  dasher?: MarkerInfo;
  routeCoordinates?: MapCoordinate[];
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

const getColor = (pinColor?: string, fallback = "#2563EB") =>
  pinColor || fallback;

const NativeOSMMap: React.FC<NativeOSMMapProps> = ({
  initialRegion,
  pickup,
  dropoff,
  dasher,
  routeCoordinates,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<mapboxgl.Marker[]>([]);
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  const styleId =
    process.env.EXPO_PUBLIC_MAPBOX_STYLE?.trim() || "mapbox/streets-v12";

  const initialZoom = useMemo(() => {
    const latitudeDelta = Math.max(initialRegion.latitudeDelta, 0.001);
    return Math.max(1, Math.min(16, Math.log2(360 / latitudeDelta)));
  }, [initialRegion.latitudeDelta]);

  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: `mapbox://styles/${styleId}`,
      center: [initialRegion.longitude, initialRegion.latitude],
      zoom: initialZoom,
      attributionControl: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [
    initialRegion.latitude,
    initialRegion.longitude,
    initialZoom,
    mapboxToken,
    styleId,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [initialRegion.longitude, initialRegion.latitude],
      zoom: initialZoom,
      essential: true,
    });
  }, [initialRegion.latitude, initialRegion.longitude, initialZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    const points: Array<{ marker?: MarkerInfo; defaultColor: string }> = [
      { marker: pickup, defaultColor: "#F59E0B" },
      { marker: dropoff, defaultColor: "#22C55E" },
      { marker: dasher, defaultColor: "#2563EB" },
    ];

    for (const point of points) {
      if (!point.marker) continue;
      const marker = new mapboxgl.Marker({
        color: getColor(point.marker.pinColor, point.defaultColor),
      })
        .setLngLat([
          point.marker.coordinate.longitude,
          point.marker.coordinate.latitude,
        ])
        .setPopup(
          new mapboxgl.Popup({ offset: 24 }).setText(
            point.marker.description
              ? `${point.marker.title}: ${point.marker.description}`
              : point.marker.title,
          ),
        )
        .addTo(map);
      markerRefs.current.push(marker);
    }
  }, [pickup, dropoff, dasher]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateRoute = () => {
      const sourceId = "delivery-route-source";
      const layerId = "delivery-route-layer";
      const routePoints = routeCoordinates || [];
      const hasRoute = routePoints.length > 1;

      if (!hasRoute) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        return;
      }

      const routeGeoJson = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routePoints.map((coord) => [
            coord.longitude,
            coord.latitude,
          ]),
        },
      };

      const existingSource = map.getSource(sourceId) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (existingSource) {
        existingSource.setData(routeGeoJson);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: routeGeoJson,
        });
      }

      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#2563EB",
            "line-width": 4,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateRoute();
      return;
    }

    map.once("load", updateRoute);
    return () => {
      map.off("load", updateRoute);
    };
  }, [routeCoordinates]);

  if (!mapboxToken) {
    return (
      <View style={styles.warningContainer}>
        <Text style={styles.warningTitle}>Map unavailable</Text>
        <Text style={styles.warningBody}>
          Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to display the live map on web.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <div ref={mapContainerRef} style={styles.webMap} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 260,
  },
  webMap: {
    width: "100%",
    height: "100%",
  } as any,
  warningContainer: {
    minHeight: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 16,
    justifyContent: "center",
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  warningBody: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
});

export default NativeOSMMap;
