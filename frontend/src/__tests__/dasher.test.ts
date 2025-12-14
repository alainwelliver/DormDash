/**
 * Tests for Dasher-related functionality
 * Tests: dasher status, vehicle types, delivery assignments
 */

// Types
type VehicleType = "walk" | "bike" | "scooter" | "car";
type DasherStatus = "available" | "busy" | "offline";
type DeliveryStatus = "pending" | "accepted" | "picked_up" | "delivered";

interface Dasher {
  id: string;
  user_id: string;
  vehicle_type: VehicleType;
  is_active: boolean;
  total_deliveries: number;
  average_rating: number;
  current_status: DasherStatus;
}

interface DeliveryAssignment {
  id: number;
  order_id: number;
  dasher_id: string;
  status: DeliveryStatus;
  pickup_location?: string;
  delivery_location?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

// Vehicle type utilities
const vehicleTypeToLabel = (type: VehicleType): string => {
  const labels: Record<VehicleType, string> = {
    walk: "Walking",
    bike: "Bike",
    scooter: "Scooter",
    car: "Car",
  };
  return labels[type];
};

const vehicleTypeToIcon = (type: VehicleType): string => {
  const icons: Record<VehicleType, string> = {
    walk: "walk",
    bike: "bike",
    scooter: "electric-scooter",
    car: "car",
  };
  return icons[type];
};

const getEstimatedDeliveryTime = (
  vehicle: VehicleType,
  distanceMiles: number,
): number => {
  // Returns estimated time in minutes
  const speeds: Record<VehicleType, number> = {
    walk: 3, // mph
    bike: 10, // mph
    scooter: 15, // mph
    car: 25, // mph
  };
  return Math.ceil((distanceMiles / speeds[vehicle]) * 60);
};

// Dasher status utilities
const canAcceptDelivery = (dasher: Dasher): boolean => {
  return dasher.is_active && dasher.current_status === "available";
};

const getNextDeliveryStatus = (
  current: DeliveryStatus,
): DeliveryStatus | null => {
  const flow: Record<DeliveryStatus, DeliveryStatus | null> = {
    pending: "accepted",
    accepted: "picked_up",
    picked_up: "delivered",
    delivered: null,
  };
  return flow[current];
};

// Rating utilities
const calculateNewRating = (
  currentRating: number,
  totalDeliveries: number,
  newRating: number,
): number => {
  if (totalDeliveries === 0) return newRating;
  const totalRatingSum = currentRating * totalDeliveries;
  return (totalRatingSum + newRating) / (totalDeliveries + 1);
};

describe("Vehicle Types", () => {
  test("converts vehicle type to label", () => {
    expect(vehicleTypeToLabel("walk")).toBe("Walking");
    expect(vehicleTypeToLabel("bike")).toBe("Bike");
    expect(vehicleTypeToLabel("scooter")).toBe("Scooter");
    expect(vehicleTypeToLabel("car")).toBe("Car");
  });

  test("converts vehicle type to icon name", () => {
    expect(vehicleTypeToIcon("walk")).toBe("walk");
    expect(vehicleTypeToIcon("bike")).toBe("bike");
    expect(vehicleTypeToIcon("scooter")).toBe("electric-scooter");
    expect(vehicleTypeToIcon("car")).toBe("car");
  });
});

describe("Estimated Delivery Time", () => {
  const distance = 1.5; // 1.5 miles

  test("calculates walking time", () => {
    // 1.5 miles at 3 mph = 30 minutes
    expect(getEstimatedDeliveryTime("walk", distance)).toBe(30);
  });

  test("calculates bike time", () => {
    // 1.5 miles at 10 mph = 9 minutes
    expect(getEstimatedDeliveryTime("bike", distance)).toBe(9);
  });

  test("calculates scooter time", () => {
    // 1.5 miles at 15 mph = 6 minutes
    expect(getEstimatedDeliveryTime("scooter", distance)).toBe(6);
  });

  test("calculates car time", () => {
    // 1.5 miles at 25 mph = 3.6 minutes, rounded up to 4
    expect(getEstimatedDeliveryTime("car", distance)).toBe(4);
  });

  test("handles short distances", () => {
    expect(getEstimatedDeliveryTime("walk", 0.1)).toBe(2);
  });
});

describe("Dasher Status", () => {
  test("active and available dasher can accept delivery", () => {
    const dasher: Dasher = {
      id: "1",
      user_id: "user1",
      vehicle_type: "bike",
      is_active: true,
      total_deliveries: 10,
      average_rating: 4.5,
      current_status: "available",
    };
    expect(canAcceptDelivery(dasher)).toBe(true);
  });

  test("inactive dasher cannot accept delivery", () => {
    const dasher: Dasher = {
      id: "1",
      user_id: "user1",
      vehicle_type: "bike",
      is_active: false,
      total_deliveries: 10,
      average_rating: 4.5,
      current_status: "available",
    };
    expect(canAcceptDelivery(dasher)).toBe(false);
  });

  test("busy dasher cannot accept delivery", () => {
    const dasher: Dasher = {
      id: "1",
      user_id: "user1",
      vehicle_type: "bike",
      is_active: true,
      total_deliveries: 10,
      average_rating: 4.5,
      current_status: "busy",
    };
    expect(canAcceptDelivery(dasher)).toBe(false);
  });

  test("offline dasher cannot accept delivery", () => {
    const dasher: Dasher = {
      id: "1",
      user_id: "user1",
      vehicle_type: "bike",
      is_active: true,
      total_deliveries: 10,
      average_rating: 4.5,
      current_status: "offline",
    };
    expect(canAcceptDelivery(dasher)).toBe(false);
  });
});

describe("Delivery Status Flow", () => {
  test("pending -> accepted", () => {
    expect(getNextDeliveryStatus("pending")).toBe("accepted");
  });

  test("accepted -> picked_up", () => {
    expect(getNextDeliveryStatus("accepted")).toBe("picked_up");
  });

  test("picked_up -> delivered", () => {
    expect(getNextDeliveryStatus("picked_up")).toBe("delivered");
  });

  test("delivered -> null (end of flow)", () => {
    expect(getNextDeliveryStatus("delivered")).toBeNull();
  });
});

describe("Rating Calculations", () => {
  test("calculates new average rating correctly", () => {
    // Dasher with 4.5 rating after 10 deliveries, receives a 5-star rating
    const newRating = calculateNewRating(4.5, 10, 5);
    // (4.5 * 10 + 5) / 11 = 50/11 = 4.545...
    expect(newRating).toBeCloseTo(4.545, 2);
  });

  test("handles first rating", () => {
    const newRating = calculateNewRating(0, 0, 4);
    expect(newRating).toBe(4);
  });

  test("rating decreases with low score", () => {
    const newRating = calculateNewRating(5, 10, 1);
    // (5 * 10 + 1) / 11 = 51/11 = 4.636...
    expect(newRating).toBeCloseTo(4.636, 2);
  });
});

describe("Dasher Stats Display", () => {
  const formatDeliveryCount = (count: number): string => {
    if (count === 0) return "No deliveries yet";
    if (count === 1) return "1 delivery";
    return `${count} deliveries`;
  };

  const formatRating = (rating: number, totalDeliveries: number): string => {
    if (totalDeliveries === 0) return "No ratings yet";
    return `${rating.toFixed(1)} ★`;
  };

  test("formats delivery count - zero", () => {
    expect(formatDeliveryCount(0)).toBe("No deliveries yet");
  });

  test("formats delivery count - one", () => {
    expect(formatDeliveryCount(1)).toBe("1 delivery");
  });

  test("formats delivery count - multiple", () => {
    expect(formatDeliveryCount(25)).toBe("25 deliveries");
  });

  test("formats rating with deliveries", () => {
    expect(formatRating(4.5, 10)).toBe("4.5 ★");
  });

  test("formats rating without deliveries", () => {
    expect(formatRating(0, 0)).toBe("No ratings yet");
  });
});
