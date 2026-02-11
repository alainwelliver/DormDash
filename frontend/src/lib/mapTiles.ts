const DEFAULT_OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_MAPBOX_STYLE = "mapbox/streets-v12";

type EnvLike = Record<string, string | undefined>;

export const getMapTileUrlTemplateFromEnv = (env: EnvLike) => {
  const mapboxToken = env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  if (mapboxToken) {
    const styleId =
      env.EXPO_PUBLIC_MAPBOX_STYLE?.trim() || DEFAULT_MAPBOX_STYLE;
    return `https://api.mapbox.com/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`;
  }

  return env.EXPO_PUBLIC_OSM_TILE_URL_TEMPLATE || DEFAULT_OSM_TILE_URL;
};

export const getMapAttributionTextFromEnv = (env: EnvLike) => {
  return env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim()
    ? "Mapbox / OpenStreetMap"
    : "OpenStreetMap";
};
