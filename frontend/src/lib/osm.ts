import {
  getMapTileConfigFromEnv,
  getMapAttributionTextFromEnv,
  getMapTileUrlTemplateFromEnv,
} from "./mapTiles";

const env = process.env as Record<string, string | undefined>;

export const getMapConfig = () => {
  return getMapTileConfigFromEnv(env);
};

export const getMapTileUrlTemplate = () => {
  return getMapTileUrlTemplateFromEnv(env);
};

export const getMapAttributionText = () => {
  return getMapAttributionTextFromEnv(env);
};

export const getOsmTileUrlTemplate = getMapTileUrlTemplate;
