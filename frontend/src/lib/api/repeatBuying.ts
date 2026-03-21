import { supabase } from "../supabase";
import type {
  CartBatchResult,
  CartBatchSummary,
  SavedCart,
} from "../../types/repeatBuying";
import { mapListingCardRow } from "../utils/listings";

type BatchInput = {
  listing_id: number;
  quantity: number;
};

type BuyAgainListing = {
  id: number;
  title: string;
  price_cents: number;
  created_at?: string;
  listing_images?: Array<{ url: string; sort_order?: number }>;
  categories?: { name: string } | null;
};

const getUserId = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
};

export const summarizeBatchResults = (
  rows: CartBatchResult[],
): CartBatchSummary => {
  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.action === "added") acc.added += 1;
      if (row.action === "merged") acc.merged += 1;
      if (row.action === "skipped_missing") {
        acc.skipped += 1;
        acc.skippedMissing += 1;
      }
      if (row.action === "skipped_invalid") {
        acc.skipped += 1;
        acc.skippedInvalid += 1;
      }
      return acc;
    },
    {
      total: 0,
      added: 0,
      merged: 0,
      skipped: 0,
      skippedMissing: 0,
      skippedInvalid: 0,
    } as CartBatchSummary,
  );
};

export const addItemsToCartBatch = async (items: BatchInput[]) => {
  const payload = items
    .filter((item) => Number.isFinite(item.listing_id))
    .map((item) => ({
      listing_id: Number(item.listing_id),
      quantity: Math.max(1, Number(item.quantity || 1)),
    }));

  if (payload.length === 0) {
    return [] as CartBatchResult[];
  }

  const { data, error } = await supabase.rpc("add_items_to_cart_batch", {
    p_items: payload,
  });

  if (error) throw error;
  return (data || []) as CartBatchResult[];
};

export const addOrderToCart = async (orderId: number) => {
  const userId = await getUserId();
  if (!userId) throw new Error("Not authenticated");

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderError || !order) {
    throw new Error("Order not found for current user");
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("listing_id, quantity")
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  const payload = (items || []).map((item: any) => ({
    listing_id: Number(item.listing_id),
    quantity: Math.max(1, Number(item.quantity || 1)),
  }));

  return addItemsToCartBatch(payload);
};

export const createSavedCartFromCurrentCart = async (
  name: string,
  icon?: string,
) => {
  const { data, error } = await supabase.rpc(
    "create_saved_cart_from_current_cart",
    {
      p_name: name,
      ...(icon ? { p_icon: icon } : { p_icon: null }),
    },
  );
  if (error) throw error;
  return Number(data);
};

export const addSavedCartToCart = async (savedCartId: number) => {
  const { data, error } = await supabase.rpc("add_saved_cart_to_cart", {
    p_saved_cart_id: savedCartId,
  });
  if (error) throw error;
  return (data || []) as CartBatchResult[];
};

export const fetchSavedCarts = async (): Promise<SavedCart[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase.rpc("get_saved_cart_summaries");
  if (error) throw error;

  return (data || []).map((cart: any) => ({
    id: Number(cart.id),
    name: String(cart.name),
    icon: cart.icon ? String(cart.icon) : null,
    created_at: String(cart.created_at),
    updated_at: String(cart.updated_at),
    last_used_at: cart.last_used_at ? String(cart.last_used_at) : null,
    item_count: Number(cart.item_count || 0),
    preview_titles: Array.isArray(cart.preview_titles)
      ? cart.preview_titles.map((title: any) => String(title))
      : [],
  }));
};

export const renameSavedCart = async (savedCartId: number, name: string) => {
  const { error } = await supabase
    .from("saved_carts")
    .update({
      name: name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", savedCartId);
  if (error) throw error;
};

export const deleteSavedCart = async (savedCartId: number) => {
  const { error } = await supabase
    .from("saved_carts")
    .delete()
    .eq("id", savedCartId);
  if (error) throw error;
};

export const fetchBuyAgainListings = async (
  limit = 8,
): Promise<BuyAgainListing[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase.rpc("get_buy_again_listing_cards", {
    p_limit: limit,
  });
  if (error) throw error;

  return (data || []).map((listing: any) => mapListingCardRow(listing));
};
