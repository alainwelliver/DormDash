import {
  getMapTileConfigFromEnv,
  getMapAttributionTextFromEnv,
  getMapTileUrlTemplateFromEnv,
} from "../lib/mapTiles";

describe("map tile template", () => {
  test("does not provide tile URL when no mapbox token", () => {
    expect(getMapTileUrlTemplateFromEnv({})).toBeUndefined();
    expect(getMapAttributionTextFromEnv({})).toBe("Native map data");
    expect(getMapTileConfigFromEnv({})).toEqual({
      provider: "none",
      attribution: "Native map data",
      hasToken: false,
    });
  });

  test("uses mapbox default style when token exists", () => {
    const env = { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "test-token" };
    expect(getMapTileUrlTemplateFromEnv(env)).toContain(
      "https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/",
    );
    expect(getMapTileUrlTemplateFromEnv(env)).toContain(
      "access_token=test-token",
    );
    expect(getMapAttributionTextFromEnv(env)).toBe("Mapbox / OpenStreetMap");
  });

  test("uses custom mapbox style when provided", () => {
    const env = {
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "test-token",
      EXPO_PUBLIC_MAPBOX_STYLE: "mapbox/navigation-day-v1",
    };
    expect(getMapTileUrlTemplateFromEnv(env)).toContain(
      "/styles/v1/mapbox/navigation-day-v1/tiles/256/",
    );
  });

  test("treats whitespace token as missing", () => {
    const env = { EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "   " };
    expect(getMapTileUrlTemplateFromEnv(env)).toBeUndefined();
    expect(getMapAttributionTextFromEnv(env)).toBe("Native map data");
  });
});
