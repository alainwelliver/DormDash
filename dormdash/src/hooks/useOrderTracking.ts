import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type {
  DeliveryOrder,
  OrderStatusUpdate,
  OrderStatus,
} from "../types/order";

interface UseOrderTrackingResult {
  order: DeliveryOrder | null;
  statusUpdates: OrderStatusUpdate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateOrderStatus: (
    status: OrderStatus,
    message?: string
  ) => Promise<boolean>;
}

export function useOrderTracking(orderId: number): UseOrderTrackingResult {
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [statusUpdates, setStatusUpdates] = useState<OrderStatusUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch order");
    }
  }, [orderId]);

  const fetchStatusUpdates = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("order_status_updates")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setStatusUpdates(data || []);
    } catch (err) {
      console.error("Failed to fetch status updates:", err);
    }
  }, [orderId]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOrder(), fetchStatusUpdates()]);
    setLoading(false);
  }, [fetchOrder, fetchStatusUpdates]);

  const updateOrderStatus = useCallback(
    async (status: OrderStatus, message?: string): Promise<boolean> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Update order status
        const updateData: Partial<DeliveryOrder> = { status };
        if (status === "accepted") {
          updateData.seller_accepted_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from("delivery_orders")
          .update(updateData)
          .eq("id", orderId);

        if (updateError) throw updateError;

        // Determine role
        const role =
          user.id === order?.seller_id
            ? "seller"
            : user.id === order?.buyer_id
              ? "buyer"
              : "system";

        // Insert status update
        const { error: insertError } = await supabase
          .from("order_status_updates")
          .insert({
            order_id: orderId,
            status,
            message,
            updated_by: user.id,
            updated_by_role: role,
          });

        if (insertError) throw insertError;

        await refetch();
        return true;
      } catch (err) {
        console.error("Failed to update order status:", err);
        return false;
      }
    },
    [orderId, order, refetch]
  );

  useEffect(() => {
    refetch();

    // Subscribe to real-time updates on delivery_orders
    const orderSubscription = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "delivery_orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder(payload.new as DeliveryOrder);
        }
      )
      .subscribe();

    // Subscribe to status updates
    const statusSubscription = supabase
      .channel(`status-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_status_updates",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setStatusUpdates((prev) => [...prev, payload.new as OrderStatusUpdate]);
        }
      )
      .subscribe();

    return () => {
      orderSubscription.unsubscribe();
      statusSubscription.unsubscribe();
    };
  }, [orderId, refetch]);

  return {
    order,
    statusUpdates,
    loading,
    error,
    refetch,
    updateOrderStatus,
  };
}
