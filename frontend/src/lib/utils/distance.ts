const EARTH_RADIUS_MILES = 3958.8;

type Coord = {
  lat: number;
  lng: number;
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export const haversineDistanceMiles = (from: Coord, to: Coord): number => {
  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lng);
  const lat2 = toRadians(to.lat);
  const lon2 = toRadians(to.lng);

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
};

export const formatDistanceMiles = (miles: number | null | undefined) => {
  if (miles == null || Number.isNaN(miles)) return "N/A";
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
};

export const estimateEtaMinutes = (
  miles: number | null | undefined,
  mph = 12,
) => {
  if (miles == null || Number.isNaN(miles) || miles <= 0) return 0;
  return Math.max(1, Math.ceil((miles / mph) * 60));
};
