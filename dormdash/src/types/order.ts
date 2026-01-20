export type OrderStatus =
  | "pending"
  | "accepted"
  | "ready"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type DeliveryType = "pickup" | "delivery";

export type UpdaterRole = "buyer" | "seller" | "system";

export interface DeliveryOrder {
  id: number;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  listing_id: number;
  listing_title: string;
  delivery_type: DeliveryType;
  status: OrderStatus;
  pickup_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  estimated_delivery_minutes?: number;
  seller_accepted_at?: string;
  created_at: string;
}

export interface OrderStatusUpdate {
  id: number;
  order_id: number;
  status: OrderStatus;
  message?: string;
  updated_by: string;
  updated_by_role: UpdaterRole;
  created_at: string;
}

export interface MapLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order Placed",
  accepted: "Seller Accepted",
  ready: "Ready for Pickup",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending: "Waiting for seller to accept your order",
  accepted: "Seller is preparing your order",
  ready: "Your order is ready",
  on_the_way: "Your order is on its way",
  delivered: "Your order has been delivered",
  cancelled: "This order was cancelled",
};
