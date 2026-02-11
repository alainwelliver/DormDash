export type CartBatchAction =
  | "added"
  | "merged"
  | "skipped_missing"
  | "skipped_invalid";

export interface CartBatchResult {
  listing_id: number | null;
  requested_quantity: number;
  resulting_quantity: number;
  action: CartBatchAction;
  message: string | null;
}

export interface CartBatchSummary {
  total: number;
  added: number;
  merged: number;
  skipped: number;
  skippedMissing: number;
  skippedInvalid: number;
}

export interface SavedCart {
  id: number;
  name: string;
  icon: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  item_count: number;
  preview_titles: string[];
}
