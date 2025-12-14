/**
 * Tests for Navigation and Routing functionality
 * Tests: route names, navigation params, screen visibility logic
 */

// Route names matching AppNavigator.tsx
type MainStackRoutes =
  | "AuthWelcome"
  | "AuthLogin"
  | "AuthRegister"
  | "AuthForgotPassword"
  | "MainTabs"
  | "ProductDetail"
  | "CreateListing"
  | "EditListing"
  | "ProfileAddAddress"
  | "ProfileAddressList"
  | "ProfileAddPayment"
  | "ProfilePaymentList"
  | "ProfileMyListings"
  | "ProfilePastOrders"
  | "ProfilePaymentPortal"
  | "Checkout"
  | "PaymentPortal"
  | "PaymentSuccess"
  | "PaymentFailed"
  | "DasherRegister";

type TabRoutes =
  | "FeedTab"
  | "ExploreTab"
  | "CartTab"
  | "DashTab"
  | "ProfileTab";

// Navigation utility types
interface ProductDetailParams {
  listingId: number;
}

interface EditListingParams {
  listingId: number;
}

interface CheckoutParams {
  items: Array<{ listingId: number; quantity: number }>;
}

interface PaymentPortalParams {
  sessionId: string;
}

// Route validation
const isAuthRoute = (route: MainStackRoutes): boolean => {
  const authRoutes: MainStackRoutes[] = [
    "AuthWelcome",
    "AuthLogin",
    "AuthRegister",
    "AuthForgotPassword",
  ];
  return authRoutes.includes(route);
};

const isProtectedRoute = (route: MainStackRoutes): boolean => {
  return !isAuthRoute(route) && route !== "MainTabs";
};

const isCheckoutFlowRoute = (route: MainStackRoutes): boolean => {
  const checkoutRoutes: MainStackRoutes[] = [
    "Checkout",
    "PaymentPortal",
    "PaymentSuccess",
    "PaymentFailed",
  ];
  return checkoutRoutes.includes(route);
};

const isProfileFlowRoute = (route: MainStackRoutes): boolean => {
  const profileRoutes: MainStackRoutes[] = [
    "ProfileAddAddress",
    "ProfileAddressList",
    "ProfileAddPayment",
    "ProfilePaymentList",
    "ProfileMyListings",
    "ProfilePastOrders",
    "ProfilePaymentPortal",
  ];
  return profileRoutes.includes(route);
};

// Tab badge logic
const getCartBadgeCount = (cartItemCount: number): string | undefined => {
  if (cartItemCount === 0) return undefined;
  if (cartItemCount > 99) return "99+";
  return cartItemCount.toString();
};

// Tab visibility based on user state
interface UserState {
  isAuthenticated: boolean;
  isDasher: boolean;
  hasPendingDeliveries: boolean;
}

const shouldShowDashTab = (user: UserState): boolean => {
  return user.isAuthenticated;
};

const getDashTabLabel = (user: UserState): string => {
  if (!user.isDasher) return "Become Dasher";
  if (user.hasPendingDeliveries) return "Delivering";
  return "Dash";
};

// Deep link route matching
const parseDeepLink = (
  url: string,
): { route: MainStackRoutes; params?: Record<string, unknown> } | null => {
  // Handle custom scheme URLs like dormdash://path
  let path = url;
  if (url.startsWith("dormdash://")) {
    path = url.replace("dormdash://", "");
  }
  path = path.replace(/^\/+/, "");

  if (path.startsWith("product/")) {
    const listingId = parseInt(path.replace("product/", ""), 10);
    if (!isNaN(listingId)) {
      return { route: "ProductDetail", params: { listingId } };
    }
  }

  if (path === "checkout") {
    return { route: "Checkout" };
  }

  if (path === "explore") {
    return { route: "MainTabs", params: { screen: "ExploreTab" } };
  }

  if (path === "cart") {
    return { route: "MainTabs", params: { screen: "CartTab" } };
  }

  if (path === "profile") {
    return { route: "MainTabs", params: { screen: "ProfileTab" } };
  }

  if (path === "dash" || path === "dasher") {
    return { route: "MainTabs", params: { screen: "DashTab" } };
  }

  return null;
};

describe("Route Classification", () => {
  test("identifies auth routes", () => {
    expect(isAuthRoute("AuthWelcome")).toBe(true);
    expect(isAuthRoute("AuthLogin")).toBe(true);
    expect(isAuthRoute("AuthRegister")).toBe(true);
    expect(isAuthRoute("AuthForgotPassword")).toBe(true);
  });

  test("identifies non-auth routes", () => {
    expect(isAuthRoute("MainTabs")).toBe(false);
    expect(isAuthRoute("ProductDetail")).toBe(false);
    expect(isAuthRoute("Checkout")).toBe(false);
  });

  test("identifies protected routes", () => {
    expect(isProtectedRoute("ProductDetail")).toBe(true);
    expect(isProtectedRoute("CreateListing")).toBe(true);
    expect(isProtectedRoute("Checkout")).toBe(true);
  });

  test("auth routes are not protected", () => {
    expect(isProtectedRoute("AuthLogin")).toBe(false);
    expect(isProtectedRoute("AuthRegister")).toBe(false);
  });
});

describe("Checkout Flow Routes", () => {
  test("identifies checkout flow routes", () => {
    expect(isCheckoutFlowRoute("Checkout")).toBe(true);
    expect(isCheckoutFlowRoute("PaymentPortal")).toBe(true);
    expect(isCheckoutFlowRoute("PaymentSuccess")).toBe(true);
    expect(isCheckoutFlowRoute("PaymentFailed")).toBe(true);
  });

  test("non-checkout routes", () => {
    expect(isCheckoutFlowRoute("ProductDetail")).toBe(false);
    expect(isCheckoutFlowRoute("MainTabs")).toBe(false);
  });
});

describe("Profile Flow Routes", () => {
  test("identifies profile flow routes", () => {
    expect(isProfileFlowRoute("ProfileAddAddress")).toBe(true);
    expect(isProfileFlowRoute("ProfileAddressList")).toBe(true);
    expect(isProfileFlowRoute("ProfileAddPayment")).toBe(true);
    expect(isProfileFlowRoute("ProfilePaymentList")).toBe(true);
    expect(isProfileFlowRoute("ProfileMyListings")).toBe(true);
    expect(isProfileFlowRoute("ProfilePastOrders")).toBe(true);
    expect(isProfileFlowRoute("ProfilePaymentPortal")).toBe(true);
  });

  test("non-profile routes", () => {
    expect(isProfileFlowRoute("Checkout")).toBe(false);
    expect(isProfileFlowRoute("MainTabs")).toBe(false);
  });
});

describe("Cart Badge", () => {
  test("no badge for empty cart", () => {
    expect(getCartBadgeCount(0)).toBeUndefined();
  });

  test("shows count for items", () => {
    expect(getCartBadgeCount(1)).toBe("1");
    expect(getCartBadgeCount(5)).toBe("5");
    expect(getCartBadgeCount(99)).toBe("99");
  });

  test("caps at 99+", () => {
    expect(getCartBadgeCount(100)).toBe("99+");
    expect(getCartBadgeCount(999)).toBe("99+");
  });
});

describe("Dash Tab Visibility", () => {
  test("shows for authenticated users", () => {
    expect(
      shouldShowDashTab({
        isAuthenticated: true,
        isDasher: false,
        hasPendingDeliveries: false,
      }),
    ).toBe(true);
  });

  test("hides for unauthenticated users", () => {
    expect(
      shouldShowDashTab({
        isAuthenticated: false,
        isDasher: false,
        hasPendingDeliveries: false,
      }),
    ).toBe(false);
  });
});

describe("Dash Tab Label", () => {
  test("shows 'Become Dasher' for non-dashers", () => {
    expect(
      getDashTabLabel({
        isAuthenticated: true,
        isDasher: false,
        hasPendingDeliveries: false,
      }),
    ).toBe("Become Dasher");
  });

  test("shows 'Delivering' for active delivery", () => {
    expect(
      getDashTabLabel({
        isAuthenticated: true,
        isDasher: true,
        hasPendingDeliveries: true,
      }),
    ).toBe("Delivering");
  });

  test("shows 'Dash' for idle dasher", () => {
    expect(
      getDashTabLabel({
        isAuthenticated: true,
        isDasher: true,
        hasPendingDeliveries: false,
      }),
    ).toBe("Dash");
  });
});

describe("Deep Link Parsing", () => {
  test("parses product detail link", () => {
    const result = parseDeepLink("dormdash://product/123");
    expect(result).toEqual({
      route: "ProductDetail",
      params: { listingId: 123 },
    });
  });

  test("parses checkout link", () => {
    const result = parseDeepLink("dormdash://checkout");
    expect(result).toEqual({ route: "Checkout" });
  });

  test("parses tab links", () => {
    expect(parseDeepLink("dormdash://explore")).toEqual({
      route: "MainTabs",
      params: { screen: "ExploreTab" },
    });
    expect(parseDeepLink("dormdash://cart")).toEqual({
      route: "MainTabs",
      params: { screen: "CartTab" },
    });
    expect(parseDeepLink("dormdash://profile")).toEqual({
      route: "MainTabs",
      params: { screen: "ProfileTab" },
    });
    expect(parseDeepLink("dormdash://dash")).toEqual({
      route: "MainTabs",
      params: { screen: "DashTab" },
    });
  });

  test("returns null for unknown routes", () => {
    expect(parseDeepLink("dormdash://unknown")).toBeNull();
    expect(parseDeepLink("dormdash://")).toBeNull();
  });

  test("handles invalid product IDs", () => {
    expect(parseDeepLink("dormdash://product/abc")).toBeNull();
  });
});

describe("Navigation Param Validation", () => {
  const isValidProductDetailParams = (
    params: unknown,
  ): params is ProductDetailParams => {
    return (
      typeof params === "object" &&
      params !== null &&
      "listingId" in params &&
      typeof (params as ProductDetailParams).listingId === "number" &&
      (params as ProductDetailParams).listingId > 0
    );
  };

  const isValidEditListingParams = (
    params: unknown,
  ): params is EditListingParams => {
    return (
      typeof params === "object" &&
      params !== null &&
      "listingId" in params &&
      typeof (params as EditListingParams).listingId === "number" &&
      (params as EditListingParams).listingId > 0
    );
  };

  test("validates ProductDetail params", () => {
    expect(isValidProductDetailParams({ listingId: 123 })).toBe(true);
    expect(isValidProductDetailParams({ listingId: 0 })).toBe(false);
    expect(isValidProductDetailParams({ listingId: -1 })).toBe(false);
    expect(isValidProductDetailParams({ listingId: "123" })).toBe(false);
    expect(isValidProductDetailParams({})).toBe(false);
    expect(isValidProductDetailParams(null)).toBe(false);
  });

  test("validates EditListing params", () => {
    expect(isValidEditListingParams({ listingId: 456 })).toBe(true);
    expect(isValidEditListingParams({ listingId: 0 })).toBe(false);
    expect(isValidEditListingParams({})).toBe(false);
  });
});

describe("Tab Order", () => {
  const tabOrder: TabRoutes[] = [
    "FeedTab",
    "ExploreTab",
    "CartTab",
    "DashTab",
    "ProfileTab",
  ];

  test("has correct number of tabs", () => {
    expect(tabOrder.length).toBe(5);
  });

  test("tabs are in correct order", () => {
    expect(tabOrder[0]).toBe("FeedTab");
    expect(tabOrder[1]).toBe("ExploreTab");
    expect(tabOrder[2]).toBe("CartTab");
    expect(tabOrder[3]).toBe("DashTab");
    expect(tabOrder[4]).toBe("ProfileTab");
  });

  test("DashTab is before ProfileTab", () => {
    const dashIndex = tabOrder.indexOf("DashTab");
    const profileIndex = tabOrder.indexOf("ProfileTab");
    expect(dashIndex).toBeLessThan(profileIndex);
  });
});
