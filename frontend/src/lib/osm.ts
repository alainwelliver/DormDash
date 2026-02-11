import {
  getMapAttributionTextFromEnv,
  getMapTileUrlTemplateFromEnv,
} from "./mapTiles";

export const getMapTileUrlTemplate = () => {
  return getMapTileUrlTemplateFromEnv(
    process.env as Record<string, string | undefined>,
  );
};

export const getMapAttributionText = () => {
  return getMapAttributionTextFromEnv(
    process.env as Record<string, string | undefined>,
  );
};

export const getOsmTileUrlTemplate = getMapTileUrlTemplate;
