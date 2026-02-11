import React from "react";

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

const NativeOSMMap: React.FC<NativeOSMMapProps> = () => null;

export default NativeOSMMap;
