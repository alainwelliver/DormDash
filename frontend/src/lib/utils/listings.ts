export type ListingCondition = "new" | "like_new" | "good" | "fair" | "poor";

export type ListingStatus = "active" | "pending" | "sold";

export type ListingSortOption =
  | "newest"
  | "price_low"
  | "price_high"
  | "condition";

export interface ListingSummary {
  id: number;
  title: string;
  price_cents: number;
  created_at?: string | null;
  available_quantity?: number | null;
  condition?: ListingCondition | null;
  status?: ListingStatus | null;
}

const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

const STATUS_LABELS: Record<ListingStatus, string> = {
  active: "Available",
  pending: "Pending",
  sold: "Sold",
};

const CONDITION_RANKS: Record<ListingCondition, number> = {
  new: 5,
  like_new: 4,
  good: 3,
  fair: 2,
  poor: 1,
};

export const LISTING_CONDITION_OPTIONS: ListingCondition[] = [
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
];

export const LISTING_STATUS_OPTIONS: ListingStatus[] = [
  "active",
  "pending",
  "sold",
];

export const SORT_OPTIONS: Array<{
  label: string;
  value: ListingSortOption;
}> = [
  { label: "Newest", value: "newest" },
  { label: "$ Low", value: "price_low" },
  { label: "$ High", value: "price_high" },
  { label: "Best", value: "condition" },
];

export const getListingConditionLabel = (
  condition?: ListingCondition | null,
) => {
  if (!condition) return "Good";
  return CONDITION_LABELS[condition] || "Good";
};

export const getListingStatusLabel = (status?: ListingStatus | null) => {
  if (!status) return STATUS_LABELS.active;
  return STATUS_LABELS[status] || STATUS_LABELS.active;
};

export const getConditionRank = (condition?: ListingCondition | null) => {
  if (!condition) return CONDITION_RANKS.good;
  return CONDITION_RANKS[condition] || CONDITION_RANKS.good;
};

export const isListingAvailable = (listing: {
  available_quantity?: number | null;
  status?: ListingStatus | null;
}) => {
  const quantity = Math.max(0, Number(listing.available_quantity ?? 0));
  const status = listing.status || "active";
  return status === "active" && quantity > 0;
};

export const getAvailableQuantity = (value?: number | null) => {
  return Math.max(0, Number(value ?? 0));
};

export const formatStockLabel = (value?: number | null) => {
  const quantity = getAvailableQuantity(value);
  if (quantity <= 0) return "Sold out";
  if (quantity === 1) return "1 left";
  if (quantity <= 5) return `${quantity} left`;
  return `${quantity} available`;
};

export const matchesConditionFilter = (
  listing: { condition?: ListingCondition | null },
  minimumCondition: ListingCondition | null,
) => {
  if (!minimumCondition) return true;
  return (
    getConditionRank(listing.condition) >= getConditionRank(minimumCondition)
  );
};

export const sortListings = <T extends ListingSummary>(
  listings: T[],
  sort: ListingSortOption,
) => {
  const sorted = [...listings];

  switch (sort) {
    case "price_low":
      return sorted.sort((a, b) => a.price_cents - b.price_cents);
    case "price_high":
      return sorted.sort((a, b) => b.price_cents - a.price_cents);
    case "condition":
      return sorted.sort(
        (a, b) =>
          getConditionRank(b.condition) - getConditionRank(a.condition) ||
          new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
      );
    case "newest":
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      );
  }
};
