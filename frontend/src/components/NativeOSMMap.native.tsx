import React from "react";
import { Platform, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, UrlTile } from "react-native-maps";

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
  tileUrlTemplate: string;
  pickup?: MarkerInfo;
  dropoff?: MarkerInfo;
  dasher?: MarkerInfo;
  routeCoordinates?: MapCoordinate[];
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

const NativeOSMMap: React.FC<NativeOSMMapProps> = ({
  initialRegion,
  tileUrlTemplate,
  pickup,
  dropoff,
  dasher,
  routeCoordinates,
  showsUserLocation = false,
  showsMyLocationButton = false,
}) => {
  return (
    <MapView
      style={styles.map}
      initialRegion={initialRegion}
      mapType={Platform.OS === "android" ? "none" : "standard"}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={showsMyLocationButton}
    >
      <UrlTile
        urlTemplate={tileUrlTemplate}
        maximumZ={19}
        shouldReplaceMapContent={Platform.OS === "android"}
      />
      {pickup ? (
        <Marker
          coordinate={pickup.coordinate}
          title={pickup.title}
          description={pickup.description}
          pinColor={pickup.pinColor}
        />
      ) : null}
      {dropoff ? (
        <Marker
          coordinate={dropoff.coordinate}
          title={dropoff.title}
          description={dropoff.description}
          pinColor={dropoff.pinColor}
        />
      ) : null}
      {dasher ? (
        <Marker
          coordinate={dasher.coordinate}
          title={dasher.title}
          description={dasher.description}
          pinColor={dasher.pinColor}
        />
      ) : null}
      {routeCoordinates && routeCoordinates.length > 1 ? (
        <Polyline coordinates={routeCoordinates} strokeWidth={4} />
      ) : null}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

export default NativeOSMMap;
