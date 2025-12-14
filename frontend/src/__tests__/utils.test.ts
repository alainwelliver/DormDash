/**
 * Unit tests for utility functions
 * Tests: price formatting, address display, calculations
 */

// Price formatting utility (inline for testing)
const formatPrice = (priceCents: number): string => {
  return (priceCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
};

// Phone number formatting utility
const formatPhoneNumber = (text: string): string => {
  const cleaned = text.replace(/\D/g, "");
  const limited = cleaned.slice(0, 10);

  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 6) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
};

// File extension and MIME type utilities
const guessExt = (uri: string): string => {
  const m = uri.match(/\.(\w+)(?:\?|$)/);
  return (m ? m[1] : "jpg").toLowerCase();
};

const guessMime = (ext: string): string => {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
};

describe("Price Formatting", () => {
  test("formats zero cents correctly", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  test("formats single digit cents correctly", () => {
    expect(formatPrice(5)).toBe("$0.05");
  });

  test("formats dollars correctly", () => {
    expect(formatPrice(100)).toBe("$1.00");
  });

  test("formats dollars and cents correctly", () => {
    expect(formatPrice(1234)).toBe("$12.34");
  });

  test("formats large amounts with comma separator", () => {
    expect(formatPrice(123456)).toBe("$1,234.56");
  });

  test("formats delivery fee ($4.00) correctly", () => {
    expect(formatPrice(400)).toBe("$4.00");
  });
});

describe("Phone Number Formatting", () => {
  test("handles empty string", () => {
    expect(formatPhoneNumber("")).toBe("");
  });

  test("handles partial number (3 digits)", () => {
    expect(formatPhoneNumber("123")).toBe("123");
  });

  test("handles partial number (6 digits)", () => {
    expect(formatPhoneNumber("123456")).toBe("123-456");
  });

  test("handles full number (10 digits)", () => {
    expect(formatPhoneNumber("1234567890")).toBe("123-456-7890");
  });

  test("strips non-numeric characters", () => {
    expect(formatPhoneNumber("(123) 456-7890")).toBe("123-456-7890");
  });

  test("limits to 10 digits", () => {
    expect(formatPhoneNumber("12345678901234")).toBe("123-456-7890");
  });
});

describe("File Extension Detection", () => {
  test("detects jpg extension", () => {
    expect(guessExt("file:///path/to/image.jpg")).toBe("jpg");
  });

  test("detects png extension", () => {
    expect(guessExt("file:///path/to/image.png")).toBe("png");
  });

  test("detects heic extension", () => {
    expect(guessExt("file:///path/to/image.heic")).toBe("heic");
  });

  test("handles query strings", () => {
    expect(guessExt("https://example.com/image.png?v=123")).toBe("png");
  });

  test("defaults to jpg when no extension", () => {
    expect(guessExt("file:///path/to/image")).toBe("jpg");
  });

  test("handles uppercase extensions", () => {
    expect(guessExt("file:///path/to/image.PNG")).toBe("png");
  });
});

describe("MIME Type Detection", () => {
  test("returns image/png for png", () => {
    expect(guessMime("png")).toBe("image/png");
  });

  test("returns image/webp for webp", () => {
    expect(guessMime("webp")).toBe("image/webp");
  });

  test("returns image/heic for heic", () => {
    expect(guessMime("heic")).toBe("image/heic");
  });

  test("returns image/heic for heif", () => {
    expect(guessMime("heif")).toBe("image/heic");
  });

  test("defaults to image/jpeg for unknown extensions", () => {
    expect(guessMime("jpg")).toBe("image/jpeg");
    expect(guessMime("jpeg")).toBe("image/jpeg");
    expect(guessMime("unknown")).toBe("image/jpeg");
  });
});

describe("Checkout Calculations", () => {
  const DELIVERY_FEE_CENTS = 400;
  const TAX_RATE = 0.08;

  interface CartItem {
    id: number;
    title: string;
    price_cents: number;
    quantity: number;
  }

  const calculateSubtotal = (items: CartItem[]): number => {
    return items.reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0,
    );
  };

  const calculateTax = (subtotal: number): number => {
    return Math.round(subtotal * TAX_RATE);
  };

  const calculateDeliveryFee = (isDelivery: boolean): number => {
    return isDelivery ? DELIVERY_FEE_CENTS : 0;
  };

  const calculateTotal = (items: CartItem[], isDelivery: boolean): number => {
    const subtotal = calculateSubtotal(items);
    const tax = calculateTax(subtotal);
    const deliveryFee = calculateDeliveryFee(isDelivery);
    return subtotal + tax + deliveryFee;
  };

  const mockItems: CartItem[] = [
    { id: 1, title: "Item 1", price_cents: 1000, quantity: 2 },
    { id: 2, title: "Item 2", price_cents: 500, quantity: 1 },
  ];

  test("calculates subtotal correctly", () => {
    expect(calculateSubtotal(mockItems)).toBe(2500); // 2*1000 + 1*500
  });

  test("calculates subtotal for empty cart", () => {
    expect(calculateSubtotal([])).toBe(0);
  });

  test("calculates 8% tax correctly", () => {
    expect(calculateTax(2500)).toBe(200); // 8% of $25.00
  });

  test("rounds tax to nearest cent", () => {
    expect(calculateTax(1234)).toBe(99); // 8% of $12.34 = 98.72, rounds to 99
  });

  test("returns delivery fee for delivery orders", () => {
    expect(calculateDeliveryFee(true)).toBe(400);
  });

  test("returns zero for pickup orders", () => {
    expect(calculateDeliveryFee(false)).toBe(0);
  });

  test("calculates total with delivery", () => {
    // Subtotal: $25.00, Tax: $2.00, Delivery: $4.00 = $31.00
    expect(calculateTotal(mockItems, true)).toBe(3100);
  });

  test("calculates total without delivery (pickup)", () => {
    // Subtotal: $25.00, Tax: $2.00, Delivery: $0.00 = $27.00
    expect(calculateTotal(mockItems, false)).toBe(2700);
  });
});
