import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase";

// ============ Types ============

export interface SellerSale {
  order_item_id: number;
  order_id: number;
  listing_id: number;
  listing_title: string;
  quantity: number;
  price_cents: number;
  line_total_cents: number;
  delivery_method: string;
  paid_at: string | null;
  seller_seen: boolean;
  buyer_id: string;
  buyer_name: string;
  buyer_confirmed: boolean | null;
  buyer_flag_reason: string | null;
  seller_dispute_seen: boolean;
}

// ============ Query Keys ============

const salesQueryKeys = {
  sales: ["seller-sales"] as const,
  unseenCount: ["unseen-sales-count"] as const,
  disputeCount: ["unseen-dispute-count"] as const,
};

// ============ API Functions ============

/**
 * Fetches all sales for the authenticated seller
 * Uses the get_seller_sales RPC function from the database
 */
export const fetchSellerSales = async (): Promise<SellerSale[]> => {
  const { data, error } = await supabase.rpc("get_seller_sales");

  if (error) throw error;
  return data ?? [];
};

/**
 * Marks all seller's sales as seen
 * Uses the mark_seller_sales_seen RPC function from the database
 */
export const markSalesAsSeen = async (): Promise<void> => {
  const { error } = await supabase.rpc("mark_seller_sales_seen");

  if (error) throw error;
};

/**
 * Fetches the count of unseen sales for the authenticated seller
 * Uses the get_unseen_sales_count RPC function from the database
 */
export const fetchUnseenSalesCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc("get_unseen_sales_count");

  if (error) throw error;
  return data ?? 0;
};

// ============ React Query Hooks ============

/**
 * Hook to fetch seller sales
 * @returns Query result with sales data
 */
export const useSellerSales = () => {
  return useQuery({
    queryKey: salesQueryKeys.sales,
    queryFn: fetchSellerSales,
  });
};

/**
 * Hook to fetch unseen sales count
 * @returns Query result with unseen count
 */
export const useUnseenSalesCount = () => {
  return useQuery({
    queryKey: salesQueryKeys.unseenCount,
    queryFn: fetchUnseenSalesCount,
  });
};

/**
 * Hook to mark sales as seen
 * Invalidates sales queries after mutation
 * @returns Mutation object
 */
export const useMarkSalesAsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSalesAsSeen,
    onSuccess: () => {
      // Invalidate and refetch sales queries
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.sales });
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.unseenCount });
    },
  });
};

/**
 * Marks all disputed orders as seen for the authenticated seller
 * Uses the mark_disputes_seen RPC function from the database
 */
export const markDisputesAsSeen = async (): Promise<void> => {
  const { error } = await supabase.rpc("mark_disputes_seen");
  if (error) throw error;
};

/**
 * Hook to mark disputed orders as seen
 * Invalidates sales query after mutation so dispute indicators refresh
 * @returns Mutation object
 */
export const useMarkDisputesSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markDisputesAsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesQueryKeys.sales });
    },
  });
};
