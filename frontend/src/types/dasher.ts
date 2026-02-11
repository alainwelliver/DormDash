export type DasherStatus = "offline" | "online" | "busy";

export type DeliveryOrderStatus =
  | "pending"
  | "accepted"
  | "picked_up"
  | "delivered"
  | "cancelled";

export interface DasherInfo {
  id: string;
  status: DasherStatus;
  vehicle_type: string;
  total_deliveries: number;
  total_earnings_cents: number;
}

export interface DeliveryOrder {
  id: number;
  order_id?: number;
  order_number: string;
  pickup_address?: string | null;
  pickup_lat?: number | null;
  pickup_lng?: number | null;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  status: DeliveryOrderStatus | string;
  delivery_fee_cents: number;
  listing_title: string;
  total_cents: number;
  created_at: string;
  seller_id: string;
  buyer_id: string;
  dasher_id: string | null;
  delivery_pickups?:
    | {
        pickup_address: string;
        pickup_building_name?: string | null;
        pickup_lat: number;
        pickup_lng: number;
      }
    | {
        pickup_address: string;
        pickup_building_name?: string | null;
        pickup_lat: number;
        pickup_lng: number;
      }[]
    | null;
}

export interface DeliveryTrackingRow {
  delivery_order_id: number;
  dasher_id: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speed_mps?: number | null;
  accuracy_m?: number | null;
  updated_at: string;
}
