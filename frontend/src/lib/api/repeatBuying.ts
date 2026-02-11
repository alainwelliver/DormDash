import { supabase } from "../supabase";
import type {
  CartBatchResult,
  CartBatchSummary,
  SavedCart,
} from "../../types/repeatBuying";

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

  const { data: carts, error: cartsError } = await supabase
    .from("saved_carts")
    .select("id, name, icon, created_at, updated_at, last_used_at")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (cartsError) throw cartsError;
  if (!carts || carts.length === 0) return [];

  const cartIds = carts.map((cart) => cart.id);
  const { data: items, error: itemsError } = await supabase
    .from("saved_cart_items")
    .select("saved_cart_id, listing_id, quantity")
    .in("saved_cart_id", cartIds);

  if (itemsError) throw itemsError;

  const listingIds = Array.from(
    new Set((items || []).map((item: any) => Number(item.listing_id))),
  ).filter((id) => Number.isFinite(id));

  let listingById = new Map<number, string>();
  if (listingIds.length > 0) {
    const { data: listingRows } = await supabase
      .from("listings")
      .select("id, title")
      .in("id", listingIds);

    listingById = new Map(
      (listingRows || []).map((listing: any) => [
        Number(listing.id),
        String(listing.title || "Listing"),
      ]),
    );
  }

  const itemsByCartId = new Map<number, Array<any>>();
  for (const item of items || []) {
    const key = Number(item.saved_cart_id);
    const group = itemsByCartId.get(key) || [];
    group.push(item);
    itemsByCartId.set(key, group);
  }

  return carts.map((cart: any) => {
    const cartItems = itemsByCartId.get(Number(cart.id)) || [];
    const preview_titles = cartItems
      .slice(0, 3)
      .map(
        (item: any) => listingById.get(Number(item.listing_id)) || "Listing",
      );

    return {
      id: Number(cart.id),
      name: String(cart.name),
      icon: cart.icon ? String(cart.icon) : null,
      created_at: String(cart.created_at),
      updated_at: String(cart.updated_at),
      last_used_at: cart.last_used_at ? String(cart.last_used_at) : null,
      item_count: cartItems.length,
      preview_titles,
    };
  });
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

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(25);

  if (ordersError) throw ordersError;
  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((order) => Number(order.id));
  const orderDateById = new Map<number, string>(
    orders.map((order) => [Number(order.id), String(order.created_at)]),
  );

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, listing_id, quantity")
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;
  if (!items || items.length === 0) return [];

  const rankByListingId = new Map<
    number,
    { lastOrderedAt: number; totalQty: number }
  >();

  for (const item of items) {
    const listingId = Number((item as any).listing_id);
    const orderId = Number((item as any).order_id);
    const qty = Math.max(1, Number((item as any).quantity || 1));
    const ts = new Date(orderDateById.get(orderId) || 0).getTime() || 0;
    const prev = rankByListingId.get(listingId) || {
      lastOrderedAt: 0,
      totalQty: 0,
    };
    rankByListingId.set(listingId, {
      lastOrderedAt: Math.max(prev.lastOrderedAt, ts),
      totalQty: prev.totalQty + qty,
    });
  }

  const listingIds = Array.from(rankByListingId.keys());
  const { data: listingRows, error: listingError } = await supabase
    .from("listings")
    .select(
      "id, title, price_cents, created_at, listing_images(url, sort_order), categories(name)",
    )
    .in("id", listingIds)
    .order("created_at", { ascending: false });

  if (listingError) throw listingError;

  const scored = (listingRows || [])
    .map((listing: any) => ({
      ...listing,
      score: rankByListingId.get(Number(listing.id)),
    }))
    .filter((listing: any) => listing.score)
    .sort((a: any, b: any) => {
      if (b.score.lastOrderedAt !== a.score.lastOrderedAt) {
        return b.score.lastOrderedAt - a.score.lastOrderedAt;
      }
      return b.score.totalQty - a.score.totalQty;
    })
    .slice(0, limit)
    .map((listing: any) => {
      delete listing.score;
      return listing;
    });

  return scored as BuyAgainListing[];
};
