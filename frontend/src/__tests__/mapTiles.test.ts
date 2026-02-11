import {
  getMapAttributionTextFromEnv,
  getMapTileUrlTemplateFromEnv,
} from "../lib/mapTiles";

describe("map tile template", () => {
  test("falls back to default OSM template when no mapbox token", () => {
    expect(getMapTileUrlTemplateFromEnv({})).toBe(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    );
    expect(getMapAttributionTextFromEnv({})).toBe("OpenStreetMap");
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

  test("falls back to OSM when mapbox token is whitespace", () => {
    const env = {
      EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN: "   ",
      EXPO_PUBLIC_OSM_TILE_URL_TEMPLATE:
        "https://tiles.example.com/{z}/{x}/{y}.png",
    };
    expect(getMapTileUrlTemplateFromEnv(env)).toBe(
      "https://tiles.example.com/{z}/{x}/{y}.png",
    );
    expect(getMapAttributionTextFromEnv(env)).toBe("OpenStreetMap");
  });
});
