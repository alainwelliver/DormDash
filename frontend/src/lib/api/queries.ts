import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

// ============ Query Keys ============
// Centralized query keys for cache management
export const queryKeys = {
  listings: (filters?: {
    category?: number | null;
    tags?: number[];
    priceRange?: [number, number] | null;
  }) => ["listings", filters] as const,
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
}

export const fetchListings = async (filters: ListingFilters = {}) => {
  let query = supabase
    .from("listings")
    .select("*, listing_images(url, sort_order), categories(name)")
    .order("created_at", { ascending: false });

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
  return data || [];
};

export const useListings = (filters: ListingFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.listings(filters),
    queryFn: () => fetchListings(filters),
    staleTime: 60 * 1000, // 1 minute - listings change frequently
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
    .select("*")
    .order("name");

  if (error) throw error;
  return data || [];
};

export const useCategories = () => {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes - categories rarely change
  });
};

// ============ Tags ============
export const fetchTags = async () => {
  const { data, error } = await supabase.from("tags").select("*").order("name");

  if (error) throw error;
  return data || [];
};

export const useTags = () => {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000, // 5 minutes - tags rarely change
  });
};

// ============ Seller Profile ============
export const fetchSeller = async (userId: string) => {
  const { data, error } = await supabase
    .from("seller_profiles")
    .select("*")
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// ============ Reviews ============
export const fetchReviews = async (listingId: number) => {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
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
    staleTime: 30 * 1000, // 30 seconds - cart changes often
  });
};

// ============ Cache Invalidation Helpers ============
export const useInvalidateListings = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["listings"] });
};

export const useInvalidateCart = () => {
  const queryClient = useQueryClient();
  return (userId: string) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) });
};

export const useInvalidateListing = () => {
  const queryClient = useQueryClient();
  return (id: number) =>
    queryClient.invalidateQueries({ queryKey: queryKeys.listing(id) });
};
