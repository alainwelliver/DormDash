/**
 * Tests for Listing-related functionality
 * Tests: listing validation, price formatting, category handling, search/filter
 */

type Category =
  | "textbooks"
  | "electronics"
  | "furniture"
  | "clothing"
  | "sports"
  | "kitchen"
  | "decor"
  | "other";

type Condition = "new" | "like_new" | "good" | "fair" | "poor";

interface Listing {
  id: number;
  title: string;
  description?: string;
  price: number;
  category: Category;
  condition: Condition;
  image_urls: string[];
  user_id: string;
  created_at: string;
  tags?: string[];
  pickup_building_name?: string;
  pickup_room_number?: string;
  pickup_lat?: number;
  pickup_lng?: number;
}

// Validation utilities
const isValidTitle = (title: string): boolean => {
  const trimmed = title.trim();
  return trimmed.length >= 3 && trimmed.length <= 100;
};

const isValidDescription = (description: string): boolean => {
  return description.trim().length <= 1000;
};

const isValidPrice = (price: number): boolean => {
  return price >= 0 && price <= 10000 && Number.isFinite(price);
};

const hasRequiredImages = (imageUrls: string[]): boolean => {
  return imageUrls.length >= 1 && imageUrls.length <= 10;
};

// Category utilities
const categoryToLabel = (category: Category): string => {
  const labels: Record<Category, string> = {
    textbooks: "Textbooks",
    electronics: "Electronics",
    furniture: "Furniture",
    clothing: "Clothing",
    sports: "Sports & Outdoors",
    kitchen: "Kitchen",
    decor: "Home Decor",
    other: "Other",
  };
  return labels[category];
};

const categoryToIcon = (category: Category): string => {
  const icons: Record<Category, string> = {
    textbooks: "book",
    electronics: "laptop",
    furniture: "bed",
    clothing: "tshirt-crew",
    sports: "basketball",
    kitchen: "pot-steam",
    decor: "lamp",
    other: "package-variant",
  };
  return icons[category];
};

// Condition utilities
const conditionToLabel = (condition: Condition): string => {
  const labels: Record<Condition, string> = {
    new: "New",
    like_new: "Like New",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };
  return labels[condition];
};

const conditionRank = (condition: Condition): number => {
  const ranks: Record<Condition, number> = {
    new: 5,
    like_new: 4,
    good: 3,
    fair: 2,
    poor: 1,
  };
  return ranks[condition];
};

// Search utilities
const matchesSearch = (listing: Listing, query: string): boolean => {
  const searchLower = query.toLowerCase().trim();
  if (!searchLower) return true;

  return (
    listing.title.toLowerCase().includes(searchLower) ||
    (listing.description?.toLowerCase().includes(searchLower) ?? false) ||
    (listing.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ??
      false)
  );
};

const matchesCategory = (
  listing: Listing,
  category: Category | null,
): boolean => {
  if (!category) return true;
  return listing.category === category;
};

const matchesPriceRange = (
  listing: Listing,
  minPrice: number | null,
  maxPrice: number | null,
): boolean => {
  if (minPrice !== null && listing.price < minPrice) return false;
  if (maxPrice !== null && listing.price > maxPrice) return false;
  return true;
};

const matchesCondition = (
  listing: Listing,
  minCondition: Condition | null,
): boolean => {
  if (!minCondition) return true;
  return conditionRank(listing.condition) >= conditionRank(minCondition);
};

// Sorting
type SortOption = "newest" | "price_low" | "price_high" | "condition";

const sortListings = (listings: Listing[], sort: SortOption): Listing[] => {
  const sorted = [...listings];

  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "price_low":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_high":
      return sorted.sort((a, b) => b.price - a.price);
    case "condition":
      return sorted.sort(
        (a, b) => conditionRank(b.condition) - conditionRank(a.condition),
      );
    default:
      return sorted;
  }
};

describe("Listing Title Validation", () => {
  test("accepts valid title", () => {
    expect(isValidTitle("Calculus Textbook")).toBe(true);
    expect(isValidTitle("ABC")).toBe(true);
  });

  test("rejects too short title", () => {
    expect(isValidTitle("AB")).toBe(false);
    expect(isValidTitle("")).toBe(false);
  });

  test("rejects too long title", () => {
    expect(isValidTitle("A".repeat(101))).toBe(false);
  });

  test("trims whitespace", () => {
    expect(isValidTitle("  AB  ")).toBe(false);
    expect(isValidTitle("  ABC  ")).toBe(true);
  });
});

describe("Listing Description Validation", () => {
  test("accepts valid description", () => {
    expect(isValidDescription("Great condition!")).toBe(true);
    expect(isValidDescription("")).toBe(true);
  });

  test("rejects too long description", () => {
    expect(isValidDescription("A".repeat(1001))).toBe(false);
  });
});

describe("Price Validation", () => {
  test("accepts valid prices", () => {
    expect(isValidPrice(0)).toBe(true);
    expect(isValidPrice(50)).toBe(true);
    expect(isValidPrice(99.99)).toBe(true);
    expect(isValidPrice(10000)).toBe(true);
  });

  test("rejects negative prices", () => {
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(-50)).toBe(false);
  });

  test("rejects prices over maximum", () => {
    expect(isValidPrice(10001)).toBe(false);
  });

  test("rejects non-finite prices", () => {
    expect(isValidPrice(Infinity)).toBe(false);
    expect(isValidPrice(NaN)).toBe(false);
  });
});

describe("Image Validation", () => {
  test("accepts valid image count", () => {
    expect(hasRequiredImages(["url1"])).toBe(true);
    expect(hasRequiredImages(["url1", "url2", "url3"])).toBe(true);
    expect(hasRequiredImages(Array(10).fill("url"))).toBe(true);
  });

  test("rejects no images", () => {
    expect(hasRequiredImages([])).toBe(false);
  });

  test("rejects too many images", () => {
    expect(hasRequiredImages(Array(11).fill("url"))).toBe(false);
  });
});

describe("Category Utilities", () => {
  test("converts category to display label", () => {
    expect(categoryToLabel("textbooks")).toBe("Textbooks");
    expect(categoryToLabel("electronics")).toBe("Electronics");
    expect(categoryToLabel("sports")).toBe("Sports & Outdoors");
  });

  test("converts category to icon", () => {
    expect(categoryToIcon("textbooks")).toBe("book");
    expect(categoryToIcon("electronics")).toBe("laptop");
  });
});

describe("Condition Utilities", () => {
  test("converts condition to display label", () => {
    expect(conditionToLabel("new")).toBe("New");
    expect(conditionToLabel("like_new")).toBe("Like New");
    expect(conditionToLabel("good")).toBe("Good");
  });

  test("ranks conditions correctly", () => {
    expect(conditionRank("new")).toBe(5);
    expect(conditionRank("poor")).toBe(1);
    expect(conditionRank("new")).toBeGreaterThan(conditionRank("like_new"));
    expect(conditionRank("like_new")).toBeGreaterThan(conditionRank("good"));
  });
});

describe("Search Matching", () => {
  const listing: Listing = {
    id: 1,
    title: "Calculus Textbook",
    description: "Stewart 8th edition",
    price: 50,
    category: "textbooks",
    condition: "good",
    image_urls: ["url1"],
    user_id: "user1",
    created_at: "2024-01-01",
    tags: ["math", "stem"],
  };

  test("matches title", () => {
    expect(matchesSearch(listing, "calculus")).toBe(true);
    expect(matchesSearch(listing, "Textbook")).toBe(true);
  });

  test("matches description", () => {
    expect(matchesSearch(listing, "Stewart")).toBe(true);
    expect(matchesSearch(listing, "8th edition")).toBe(true);
  });

  test("matches tags", () => {
    expect(matchesSearch(listing, "math")).toBe(true);
    expect(matchesSearch(listing, "STEM")).toBe(true);
  });

  test("does not match unrelated query", () => {
    expect(matchesSearch(listing, "furniture")).toBe(false);
  });

  test("empty query matches everything", () => {
    expect(matchesSearch(listing, "")).toBe(true);
    expect(matchesSearch(listing, "   ")).toBe(true);
  });
});

describe("Category Filtering", () => {
  const listing: Listing = {
    id: 1,
    title: "Test",
    price: 50,
    category: "textbooks",
    condition: "good",
    image_urls: ["url1"],
    user_id: "user1",
    created_at: "2024-01-01",
  };

  test("matches category", () => {
    expect(matchesCategory(listing, "textbooks")).toBe(true);
  });

  test("does not match different category", () => {
    expect(matchesCategory(listing, "electronics")).toBe(false);
  });

  test("null category matches all", () => {
    expect(matchesCategory(listing, null)).toBe(true);
  });
});

describe("Price Range Filtering", () => {
  const listing: Listing = {
    id: 1,
    title: "Test",
    price: 50,
    category: "other",
    condition: "good",
    image_urls: ["url1"],
    user_id: "user1",
    created_at: "2024-01-01",
  };

  test("matches within range", () => {
    expect(matchesPriceRange(listing, 0, 100)).toBe(true);
    expect(matchesPriceRange(listing, 50, 50)).toBe(true);
  });

  test("does not match below min", () => {
    expect(matchesPriceRange(listing, 60, null)).toBe(false);
  });

  test("does not match above max", () => {
    expect(matchesPriceRange(listing, null, 40)).toBe(false);
  });

  test("null bounds match all", () => {
    expect(matchesPriceRange(listing, null, null)).toBe(true);
  });
});

describe("Condition Filtering", () => {
  const goodListing: Listing = {
    id: 1,
    title: "Test",
    price: 50,
    category: "other",
    condition: "good",
    image_urls: ["url1"],
    user_id: "user1",
    created_at: "2024-01-01",
  };

  test("matches equal or better condition", () => {
    expect(matchesCondition(goodListing, "fair")).toBe(true);
    expect(matchesCondition(goodListing, "good")).toBe(true);
  });

  test("does not match below min condition", () => {
    expect(matchesCondition(goodListing, "like_new")).toBe(false);
    expect(matchesCondition(goodListing, "new")).toBe(false);
  });

  test("null condition matches all", () => {
    expect(matchesCondition(goodListing, null)).toBe(true);
  });
});

describe("Listing Sorting", () => {
  const listings: Listing[] = [
    {
      id: 1,
      title: "Old Item",
      price: 50,
      category: "other",
      condition: "fair",
      image_urls: ["url"],
      user_id: "user1",
      created_at: "2024-01-01",
    },
    {
      id: 2,
      title: "New Item",
      price: 30,
      category: "other",
      condition: "new",
      image_urls: ["url"],
      user_id: "user1",
      created_at: "2024-01-15",
    },
    {
      id: 3,
      title: "Mid Item",
      price: 70,
      category: "other",
      condition: "good",
      image_urls: ["url"],
      user_id: "user1",
      created_at: "2024-01-10",
    },
  ];

  test("sorts by newest", () => {
    const sorted = sortListings(listings, "newest");
    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(1);
  });

  test("sorts by price low to high", () => {
    const sorted = sortListings(listings, "price_low");
    expect(sorted[0].price).toBe(30);
    expect(sorted[1].price).toBe(50);
    expect(sorted[2].price).toBe(70);
  });

  test("sorts by price high to low", () => {
    const sorted = sortListings(listings, "price_high");
    expect(sorted[0].price).toBe(70);
    expect(sorted[1].price).toBe(50);
    expect(sorted[2].price).toBe(30);
  });

  test("sorts by condition", () => {
    const sorted = sortListings(listings, "condition");
    expect(sorted[0].condition).toBe("new");
    expect(sorted[1].condition).toBe("good");
    expect(sorted[2].condition).toBe("fair");
  });

  test("does not mutate original array", () => {
    const original = [...listings];
    sortListings(listings, "price_low");
    expect(listings).toEqual(original);
  });
});
