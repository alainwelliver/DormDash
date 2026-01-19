/**
 * Tests for Cart and Order functionality
 * Tests: cart operations, order calculations, item management
 */

interface Listing {
  id: number;
  title: string;
  price: number;
  image_urls?: string[];
  user_id: string;
  category?: string;
}

interface CartItem {
  listing: Listing;
  quantity: number;
}

interface Cart {
  items: CartItem[];
}

// Cart utilities
const addToCart = (
  cart: Cart,
  listing: Listing,
  quantity: number = 1,
): Cart => {
  const existingIndex = cart.items.findIndex(
    (item) => item.listing.id === listing.id,
  );

  if (existingIndex >= 0) {
    const newItems = [...cart.items];
    newItems[existingIndex] = {
      ...newItems[existingIndex],
      quantity: newItems[existingIndex].quantity + quantity,
    };
    return { items: newItems };
  }

  return {
    items: [...cart.items, { listing, quantity }],
  };
};

const removeFromCart = (cart: Cart, listingId: number): Cart => {
  return {
    items: cart.items.filter((item) => item.listing.id !== listingId),
  };
};

const updateQuantity = (
  cart: Cart,
  listingId: number,
  quantity: number,
): Cart => {
  if (quantity <= 0) {
    return removeFromCart(cart, listingId);
  }

  return {
    items: cart.items.map((item) =>
      item.listing.id === listingId ? { ...item, quantity } : item,
    ),
  };
};

const getCartTotal = (cart: Cart): number => {
  return cart.items.reduce(
    (sum, item) => sum + item.listing.price * item.quantity,
    0,
  );
};

const getCartItemCount = (cart: Cart): number => {
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
};

const isCartEmpty = (cart: Cart): boolean => {
  return cart.items.length === 0;
};

// Cart validation
const hasItemsFromMultipleSellers = (cart: Cart): boolean => {
  if (cart.items.length <= 1) return false;
  const sellerIds = new Set(cart.items.map((item) => item.listing.user_id));
  return sellerIds.size > 1;
};

const getSellerIds = (cart: Cart): string[] => {
  return [...new Set(cart.items.map((item) => item.listing.user_id))];
};

describe("Cart Operations", () => {
  const mockListing1: Listing = {
    id: 1,
    title: "Textbook",
    price: 50,
    user_id: "seller1",
  };

  const mockListing2: Listing = {
    id: 2,
    title: "Calculator",
    price: 30,
    user_id: "seller1",
  };

  const mockListing3: Listing = {
    id: 3,
    title: "Notebook",
    price: 10,
    user_id: "seller2",
  };

  test("adds item to empty cart", () => {
    const emptyCart: Cart = { items: [] };
    const newCart = addToCart(emptyCart, mockListing1);

    expect(newCart.items.length).toBe(1);
    expect(newCart.items[0].listing.id).toBe(1);
    expect(newCart.items[0].quantity).toBe(1);
  });

  test("adds item with specific quantity", () => {
    const emptyCart: Cart = { items: [] };
    const newCart = addToCart(emptyCart, mockListing1, 3);

    expect(newCart.items[0].quantity).toBe(3);
  });

  test("increases quantity of existing item", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    const newCart = addToCart(cart, mockListing1, 2);

    expect(newCart.items.length).toBe(1);
    expect(newCart.items[0].quantity).toBe(3);
  });

  test("adds different item separately", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    const newCart = addToCart(cart, mockListing2);

    expect(newCart.items.length).toBe(2);
  });

  test("removes item from cart", () => {
    const cart: Cart = {
      items: [
        { listing: mockListing1, quantity: 1 },
        { listing: mockListing2, quantity: 2 },
      ],
    };
    const newCart = removeFromCart(cart, 1);

    expect(newCart.items.length).toBe(1);
    expect(newCart.items[0].listing.id).toBe(2);
  });

  test("removes non-existent item safely", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    const newCart = removeFromCart(cart, 999);

    expect(newCart.items.length).toBe(1);
  });

  test("updates item quantity", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    const newCart = updateQuantity(cart, 1, 5);

    expect(newCart.items[0].quantity).toBe(5);
  });

  test("removes item when quantity set to 0", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 3 }],
    };
    const newCart = updateQuantity(cart, 1, 0);

    expect(newCart.items.length).toBe(0);
  });

  test("removes item when quantity set to negative", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 3 }],
    };
    const newCart = updateQuantity(cart, 1, -1);

    expect(newCart.items.length).toBe(0);
  });
});

describe("Cart Calculations", () => {
  const mockListing1: Listing = {
    id: 1,
    title: "Textbook",
    price: 50,
    user_id: "seller1",
  };

  const mockListing2: Listing = {
    id: 2,
    title: "Calculator",
    price: 30,
    user_id: "seller1",
  };

  test("calculates total for single item", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    expect(getCartTotal(cart)).toBe(50);
  });

  test("calculates total with quantity", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 3 }],
    };
    expect(getCartTotal(cart)).toBe(150);
  });

  test("calculates total for multiple items", () => {
    const cart: Cart = {
      items: [
        { listing: mockListing1, quantity: 2 },
        { listing: mockListing2, quantity: 1 },
      ],
    };
    // (50 * 2) + (30 * 1) = 130
    expect(getCartTotal(cart)).toBe(130);
  });

  test("returns 0 for empty cart", () => {
    const cart: Cart = { items: [] };
    expect(getCartTotal(cart)).toBe(0);
  });

  test("gets total item count", () => {
    const cart: Cart = {
      items: [
        { listing: mockListing1, quantity: 2 },
        { listing: mockListing2, quantity: 3 },
      ],
    };
    expect(getCartItemCount(cart)).toBe(5);
  });

  test("identifies empty cart", () => {
    expect(isCartEmpty({ items: [] })).toBe(true);
  });

  test("identifies non-empty cart", () => {
    const cart: Cart = {
      items: [{ listing: mockListing1, quantity: 1 }],
    };
    expect(isCartEmpty(cart)).toBe(false);
  });
});

describe("Multi-Seller Detection", () => {
  const seller1Listing: Listing = {
    id: 1,
    title: "Item 1",
    price: 10,
    user_id: "seller1",
  };

  const seller1Listing2: Listing = {
    id: 2,
    title: "Item 2",
    price: 20,
    user_id: "seller1",
  };

  const seller2Listing: Listing = {
    id: 3,
    title: "Item 3",
    price: 15,
    user_id: "seller2",
  };

  test("empty cart has no multiple sellers", () => {
    expect(hasItemsFromMultipleSellers({ items: [] })).toBe(false);
  });

  test("single item has no multiple sellers", () => {
    const cart: Cart = {
      items: [{ listing: seller1Listing, quantity: 1 }],
    };
    expect(hasItemsFromMultipleSellers(cart)).toBe(false);
  });

  test("multiple items from same seller", () => {
    const cart: Cart = {
      items: [
        { listing: seller1Listing, quantity: 1 },
        { listing: seller1Listing2, quantity: 2 },
      ],
    };
    expect(hasItemsFromMultipleSellers(cart)).toBe(false);
  });

  test("detects items from multiple sellers", () => {
    const cart: Cart = {
      items: [
        { listing: seller1Listing, quantity: 1 },
        { listing: seller2Listing, quantity: 1 },
      ],
    };
    expect(hasItemsFromMultipleSellers(cart)).toBe(true);
  });

  test("gets unique seller IDs", () => {
    const cart: Cart = {
      items: [
        { listing: seller1Listing, quantity: 1 },
        { listing: seller1Listing2, quantity: 1 },
        { listing: seller2Listing, quantity: 1 },
      ],
    };
    const sellerIds = getSellerIds(cart);
    expect(sellerIds).toHaveLength(2);
    expect(sellerIds).toContain("seller1");
    expect(sellerIds).toContain("seller2");
  });
});

describe("Order Summary Calculations", () => {
  // Mirrors the checkout calculation logic
  const calculateOrderSummary = (
    subtotal: number,
    deliveryFee: number = 0,
    taxRate: number = 0.08,
  ) => {
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = subtotal + tax + deliveryFee;
    return {
      subtotal,
      tax,
      deliveryFee,
      total: Math.round(total * 100) / 100,
    };
  };

  test("calculates order without delivery", () => {
    const summary = calculateOrderSummary(100, 0);
    expect(summary.subtotal).toBe(100);
    expect(summary.tax).toBe(8);
    expect(summary.deliveryFee).toBe(0);
    expect(summary.total).toBe(108);
  });

  test("calculates order with delivery fee", () => {
    const summary = calculateOrderSummary(100, 4);
    expect(summary.subtotal).toBe(100);
    expect(summary.tax).toBe(8);
    expect(summary.deliveryFee).toBe(4);
    expect(summary.total).toBe(112);
  });

  test("handles small amounts", () => {
    const summary = calculateOrderSummary(5.99, 4);
    expect(summary.tax).toBeCloseTo(0.48, 2);
    expect(summary.total).toBeCloseTo(10.47, 2);
  });

  test("handles zero subtotal", () => {
    const summary = calculateOrderSummary(0, 0);
    expect(summary.total).toBe(0);
  });
});
