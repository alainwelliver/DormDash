export type NativeMapPlatform = "ios" | "android" | "web";

type LatLng = {
  latitude: number;
  longitude: number;
};

type OpenInMapsInput = {
  platform: NativeMapPlatform;
  address: string;
  coordinate?: LatLng | null;
};

const encode = (value: string) => encodeURIComponent(value.trim());

export const buildOpenInMapsUrl = ({
  platform,
  address,
  coordinate,
}: OpenInMapsInput) => {
  const trimmedAddress = address.trim();
  const encodedAddress = encode(trimmedAddress);
  const hasCoordinate =
    coordinate != null &&
    Number.isFinite(coordinate.latitude) &&
    Number.isFinite(coordinate.longitude);

  if (platform === "ios") {
    if (hasCoordinate) {
      return `http://maps.apple.com/?q=${encodedAddress}&ll=${coordinate.latitude},${coordinate.longitude}`;
    }
    return `http://maps.apple.com/?q=${encodedAddress}`;
  }

  if (platform === "android") {
    if (hasCoordinate) {
      return `geo:0,0?q=${coordinate.latitude},${coordinate.longitude}(${encodedAddress})`;
    }
    return `geo:0,0?q=${encodedAddress}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
};
