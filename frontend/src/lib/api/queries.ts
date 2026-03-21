import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type {
  ListingCondition,
  ListingSortOption,
} from "../utils/listings";
import {
  matchesConditionFilter,
  sortListings,
} from "../utils/listings";

// ============ Query Keys ============
export const queryKeys = {
  listings: (
    filters?: {
      category?: number | null;
      tags?: number[];
      priceRange?: [number, number] | null;
    },
    options?: {
      page?: number;
      pageSize?: number;
    },
  ) => ["listings", filters, options] as const,
  listing: (id: number) => ["listing", id] as const,
  categories: ["categories"] as const,
  tags: ["tags"] as const,
  cart: (userId: string) => ["cart", userId] as const,
  seller: (id: string) => ["seller", id] as const,
  reviews: (listingId: number) => ["reviews", listingId] as const,
};

// ============ Listings ============
interface ListingFilters {
  category?: number | null;
  tags?: number[];
  priceRange?: [number, number] | null;
  minimumCondition?: ListingCondition | null;
}

interface ListingQueryOptions {
  page?: number;
  pageSize?: number;
}

const DEFAULT_LISTINGS_PAGE_SIZE = 40;
const MAX_LISTINGS_PAGE_SIZE = 100;
const LISTING_CARD_SELECT =
  "id, title, price_cents, created_at, available_quantity, condition, status, listing_images(url, sort_order), categories(name)";

export const fetchListings = async (
  filters: ListingFilters = {},
  options: ListingQueryOptions = {},
  sort: ListingSortOption = "newest",
) => {
  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(
    Math.max(1, options.pageSize ?? DEFAULT_LISTINGS_PAGE_SIZE),
    MAX_LISTINGS_PAGE_SIZE,
  );
  const rangeStart = page * pageSize;
  const rangeEnd = rangeStart + pageSize - 1;

  let query = supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .order("created_at", { ascending: false })
    .eq("status", "active")
    .gt("available_quantity", 0)
    .range(rangeStart, rangeEnd);

  if (filters.category) {
    query = query.eq("category_id", filters.category);
  }

  if (filters.tags && filters.tags.length > 0) {
    query = query.contains("listing_tags", filters.tags);
  }

  if (filters.priceRange) {
    query = query
      .gte("price_cents", filters.priceRange[0])
      .lte("price_cents", filters.priceRange[1]);
  }

  const { data, error } = await query;

  if (error) throw error;
  const filtered = (data || []).filter((listing: any) =>
    matchesConditionFilter(listing, filters.minimumCondition || null),
  );
  return sortListings(filtered, sort);
};

export const useListings = (
  filters: ListingFilters = {},
  options: ListingQueryOptions = {},
  sort: ListingSortOption = "newest",
) => {
  const normalizedOptions: ListingQueryOptions = {
    page: Math.max(0, options.page ?? 0),
    pageSize: Math.min(
      Math.max(1, options.pageSize ?? DEFAULT_LISTINGS_PAGE_SIZE),
      MAX_LISTINGS_PAGE_SIZE,
    ),
  };

  return useQuery({
    queryKey: [...queryKeys.listings(filters, normalizedOptions), sort],
    queryFn: () => fetchListings(filters, normalizedOptions, sort),
  });
};

// ============ Single Listing ============
export const fetchListing = async (id: number) => {
  const { data, error } = await supabase
    .from("listings")
    .select("*, listing_images(url), categories(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
};

export const useListing = (id: number) => {
  return useQuery({
    queryKey: queryKeys.listing(id),
    queryFn: () => fetchListing(id),
    enabled: !!id,
  });
};

// ============ Categories ============
export const fetchCategories = async () => {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
  });
};

// ============ Tags ============
export const fetchTags = async () => {
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  if (error) throw error;
  return data || [];
};

export const useTags = () => {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: fetchTags,
  });
};

// ============ Seller Profile ============
export const fetchSeller = async (userId: string) => {
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("id, display_name, avatar_url, avg_rating, total_reviews")
    .eq("id", userId)
    .single();

  if (error) {
    // Return a default profile if not found
    return {
      id: userId,
      display_name: "Seller",
      avatar_url: null,
      avg_rating: 0,
      total_reviews: 0,
    };
  }
  return data;
};

export const useSeller = (userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.seller(userId || ""),
    queryFn: () => fetchSeller(userId!),
    enabled: !!userId,
  });
};

// ============ Reviews ============
export const fetchReviews = async (listingId: number) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, listing_id, reviewer_id, rating, comment, created_at")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const useReviews = (listingId: number) => {
  return useQuery({
    queryKey: queryKeys.reviews(listingId),
    queryFn: () => fetchReviews(listingId),
    enabled: !!listingId,
  });
};

// ============ Cart ============
export const fetchCart = async (userId: string) => {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      quantity,
      listings (
        id,
        title,
        price_cents,
        listing_images(url, sort_order)
      )
    `,
    )
    .eq("user_id", userId);

  if (error) throw error;
  return data || [];
};

export const useCart = (userId: string | null) => {
  return useQuery({
    queryKey: queryKeys.cart(userId || ""),
    queryFn: () => fetchCart(userId!),
    enabled: !!userId,
  });
};
