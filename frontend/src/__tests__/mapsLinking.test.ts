import { buildOpenInMapsUrl } from "../lib/mapsLinking";

describe("buildOpenInMapsUrl", () => {
  test("builds iOS URL with address only", () => {
    const url = buildOpenInMapsUrl({
      platform: "ios",
      address: "3700 Walnut St, Philadelphia, PA",
    });
    expect(url).toBe(
      "http://maps.apple.com/?q=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA",
    );
  });

  test("builds iOS URL with address and coordinates", () => {
    const url = buildOpenInMapsUrl({
      platform: "ios",
      address: "3700 Walnut St, Philadelphia, PA",
      coordinate: { latitude: 39.9522, longitude: -75.1932 },
    });
    expect(url).toBe(
      "http://maps.apple.com/?q=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA&ll=39.9522,-75.1932",
    );
  });

  test("builds Android URL with address only", () => {
    const url = buildOpenInMapsUrl({
      platform: "android",
      address: "3700 Walnut St, Philadelphia, PA",
    });
    expect(url).toBe("geo:0,0?q=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA");
  });

  test("builds Android URL with address and coordinates", () => {
    const url = buildOpenInMapsUrl({
      platform: "android",
      address: "3700 Walnut St, Philadelphia, PA",
      coordinate: { latitude: 39.9522, longitude: -75.1932 },
    });
    expect(url).toBe(
      "geo:0,0?q=39.9522,-75.1932(3700%20Walnut%20St%2C%20Philadelphia%2C%20PA)",
    );
  });

  test("builds web Google Maps URL with coordinates", () => {
    const url = buildOpenInMapsUrl({
      platform: "web",
      address: "3700 Walnut St, Philadelphia, PA",
      coordinate: { latitude: 39.9522, longitude: -75.1932 },
    });
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA",
    );
  });

  test("builds web Google Maps URL without coordinates", () => {
    const url = buildOpenInMapsUrl({
      platform: "web",
      address: "3700 Walnut St, Philadelphia, PA",
    });
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA",
    );
  });

  test("trims address whitespace before encoding", () => {
    const url = buildOpenInMapsUrl({
      platform: "web",
      address: "   3700 Walnut St, Philadelphia, PA   ",
    });
    expect(url).toBe(
      "https://www.google.com/maps/search/?api=1&query=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA",
    );
  });

  test("falls back to address-only URL when coordinate is invalid", () => {
    const url = buildOpenInMapsUrl({
      platform: "android",
      address: "3700 Walnut St, Philadelphia, PA",
      coordinate: { latitude: Number.NaN, longitude: -75.1932 },
    });
    expect(url).toBe("geo:0,0?q=3700%20Walnut%20St%2C%20Philadelphia%2C%20PA");
  });
});
