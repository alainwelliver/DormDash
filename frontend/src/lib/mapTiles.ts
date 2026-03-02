const DEFAULT_MAPBOX_STYLE = "mapbox/streets-v12";

type EnvLike = Record<string, string | undefined>;

type MapProvider = "mapbox" | "none";

export type MapTileConfig = {
  provider: MapProvider;
  tileUrlTemplate?: string;
  attribution: string;
  hasToken: boolean;
};

export const getMapTileConfigFromEnv = (env: EnvLike): MapTileConfig => {
  const mapboxToken = env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN?.trim();
  if (mapboxToken) {
    const styleId =
      env.EXPO_PUBLIC_MAPBOX_STYLE?.trim() || DEFAULT_MAPBOX_STYLE;
    return {
      provider: "mapbox",
      tileUrlTemplate: `https://api.mapbox.com/styles/v1/${styleId}/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`,
      attribution: "Mapbox / OpenStreetMap",
      hasToken: true,
    };
  }

  return {
    provider: "none",
    attribution: "Native map data",
    hasToken: false,
  };
};

export const getMapTileUrlTemplateFromEnv = (env: EnvLike) =>
  getMapTileConfigFromEnv(env).tileUrlTemplate;

export const getMapAttributionTextFromEnv = (env: EnvLike) => {
  return getMapTileConfigFromEnv(env).attribution;
};
