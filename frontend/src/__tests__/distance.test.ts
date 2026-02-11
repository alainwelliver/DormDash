import {
  estimateEtaMinutes,
  formatDistanceMiles,
  haversineDistanceMiles,
} from "../lib/utils/distance";

describe("distance utils", () => {
  test("haversineDistanceMiles returns ~0 for identical points", () => {
    const miles = haversineDistanceMiles(
      { lat: 39.9522, lng: -75.1932 },
      { lat: 39.9522, lng: -75.1932 },
    );
    expect(miles).toBeCloseTo(0, 5);
  });

  test("haversineDistanceMiles estimates realistic campus distance", () => {
    const miles = haversineDistanceMiles(
      { lat: 39.9522, lng: -75.1932 },
      { lat: 39.9535, lng: -75.1915 },
    );
    expect(miles).toBeGreaterThan(0.1);
    expect(miles).toBeLessThan(0.2);
  });

  test("formatDistanceMiles formats short and long values", () => {
    expect(formatDistanceMiles(0.05)).toBe("<0.1 mi");
    expect(formatDistanceMiles(1.26)).toBe("1.3 mi");
    expect(formatDistanceMiles(12.4)).toBe("12 mi");
    expect(formatDistanceMiles(null)).toBe("N/A");
  });

  test("estimateEtaMinutes derives rounded-up minutes", () => {
    expect(estimateEtaMinutes(0.1, 6)).toBe(1);
    expect(estimateEtaMinutes(1.2, 12)).toBe(6);
    expect(estimateEtaMinutes(null, 12)).toBe(0);
  });

  test("estimateEtaMinutes default uses walking pace", () => {
    expect(estimateEtaMinutes(0.4)).toBe(8);
  });
});
