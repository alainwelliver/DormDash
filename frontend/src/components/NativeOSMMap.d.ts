import type { ComponentType } from "react";

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

declare const NativeOSMMap: ComponentType<NativeOSMMapProps>;

export default NativeOSMMap;
