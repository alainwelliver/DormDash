import { supabase } from "../supabase";

/**
 * Confirms receipt of an order. Only callable within 48 hours of payment
 * and only once (buyer_confirmed must be null).
 */
export const confirmOrderReceipt = async (orderId: number): Promise<void> => {
  const { error } = await supabase.rpc("confirm_order_receipt", {
    p_order_id: orderId,
  });
  if (error) throw error;
};

/**
 * Flags an issue with an order. Requires a non-empty reason string.
 * Sets seller_dispute_seen = false so the seller sees a disputed indicator.
 */
export const flagOrderIssue = async (
  orderId: number,
  reason: string,
): Promise<void> => {
  const { error } = await supabase.rpc("flag_order_issue", {
    p_order_id: orderId,
    p_reason: reason,
  });
  if (error) throw error;
};
