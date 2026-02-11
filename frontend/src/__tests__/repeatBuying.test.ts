import {
  addItemsToCartBatch,
  addOrderToCart,
  addSavedCartToCart,
  createSavedCartFromCurrentCart,
  deleteSavedCart,
  fetchBuyAgainListings,
  fetchSavedCarts,
  renameSavedCart,
  summarizeBatchResults,
} from "../lib/api/repeatBuying";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

type QueryResponse = {
  data: unknown;
  error: unknown;
};

type MockedSupabase = {
  auth: {
    getUser: jest.Mock;
  };
  from: jest.Mock;
  rpc: jest.Mock;
};

const mockedSupabase = supabase as unknown as MockedSupabase;

const createBuilder = (
  response: QueryResponse,
  maybeSingleResponse?: QueryResponse,
) => {
  const builder: any = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);
  builder.maybeSingle = jest
    .fn()
    .mockResolvedValue(maybeSingleResponse ?? response);
  builder.then = (resolve: (value: QueryResponse) => unknown) =>
    Promise.resolve(response).then(resolve);
  return builder;
};

describe("repeatBuying API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("summarizeBatchResults", () => {
    test("summarizes add/merge/skip actions", () => {
      const summary = summarizeBatchResults([
        {
          listing_id: 1,
          requested_quantity: 1,
          resulting_quantity: 1,
          action: "added",
          message: null,
        },
        {
          listing_id: 2,
          requested_quantity: 2,
          resulting_quantity: 4,
          action: "merged",
          message: null,
        },
        {
          listing_id: 3,
          requested_quantity: 1,
          resulting_quantity: 0,
          action: "skipped_missing",
          message: "missing",
        },
        {
          listing_id: null,
          requested_quantity: 1,
          resulting_quantity: 0,
          action: "skipped_invalid",
          message: "invalid",
        },
      ]);

      expect(summary).toEqual({
        total: 4,
        added: 1,
        merged: 1,
        skipped: 2,
        skippedMissing: 1,
        skippedInvalid: 1,
      });
    });
  });

  describe("addItemsToCartBatch", () => {
    test("normalizes payload and sends rpc", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: [{ action: "added", listing_id: 1 }],
        error: null,
      });

      const result = await addItemsToCartBatch([
        { listing_id: 1, quantity: 0 },
        { listing_id: 2, quantity: 3 },
        { listing_id: Number.NaN as any, quantity: 9 },
      ] as any);

      expect(mockedSupabase.rpc).toHaveBeenCalledWith(
        "add_items_to_cart_batch",
        {
          p_items: [
            { listing_id: 1, quantity: 1 },
            { listing_id: 2, quantity: 3 },
          ],
        },
      );
      expect(result).toEqual([{ action: "added", listing_id: 1 }]);
    });

    test("returns empty array if no valid payload", async () => {
      const result = await addItemsToCartBatch([
        { listing_id: Number.NaN as any, quantity: 2 },
      ] as any);

      expect(result).toEqual([]);
      expect(mockedSupabase.rpc).not.toHaveBeenCalled();
    });

    test("throws rpc error", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: null,
        error: new Error("rpc failed"),
      });

      await expect(
        addItemsToCartBatch([{ listing_id: 1, quantity: 1 }]),
      ).rejects.toThrow("rpc failed");
    });
  });

  describe("addOrderToCart", () => {
    test("requires authentication", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      await expect(addOrderToCart(99)).rejects.toThrow("Not authenticated");
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    test("throws when order does not belong to user", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      const ordersBuilder = createBuilder(
        { data: null, error: null },
        { data: null, error: null },
      );

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "orders") return ordersBuilder;
        return createBuilder({ data: [], error: null });
      });

      await expect(addOrderToCart(50)).rejects.toThrow(
        "Order not found for current user",
      );
    });

    test("adds order items through batch rpc", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      const ordersBuilder = createBuilder(
        { data: null, error: null },
        { data: { id: 50 }, error: null },
      );
      const orderItemsBuilder = createBuilder({
        data: [
          { listing_id: 4, quantity: 2 },
          { listing_id: 9, quantity: 0 },
        ],
        error: null,
      });

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "orders") return ordersBuilder;
        if (table === "order_items") return orderItemsBuilder;
        throw new Error(`Unexpected table ${table}`);
      });
      mockedSupabase.rpc.mockResolvedValue({
        data: [{ listing_id: 4, action: "added" }],
        error: null,
      });

      const result = await addOrderToCart(50);

      expect(mockedSupabase.rpc).toHaveBeenCalledWith(
        "add_items_to_cart_batch",
        {
          p_items: [
            { listing_id: 4, quantity: 2 },
            { listing_id: 9, quantity: 1 },
          ],
        },
      );
      expect(result).toEqual([{ listing_id: 4, action: "added" }]);
    });
  });

  describe("saved cart rpc helpers", () => {
    test("createSavedCartFromCurrentCart uses null icon by default", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: "42",
        error: null,
      });

      const savedCartId = await createSavedCartFromCurrentCart("Weekly Lunch");
      expect(savedCartId).toBe(42);
      expect(mockedSupabase.rpc).toHaveBeenCalledWith(
        "create_saved_cart_from_current_cart",
        {
          p_name: "Weekly Lunch",
          p_icon: null,
        },
      );
    });

    test("createSavedCartFromCurrentCart forwards icon", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: 7,
        error: null,
      });

      await createSavedCartFromCurrentCart("Study Snacks", "🍪");
      expect(mockedSupabase.rpc).toHaveBeenCalledWith(
        "create_saved_cart_from_current_cart",
        {
          p_name: "Study Snacks",
          p_icon: "🍪",
        },
      );
    });

    test("addSavedCartToCart calls rpc", async () => {
      mockedSupabase.rpc.mockResolvedValue({
        data: [{ listing_id: 1, action: "merged" }],
        error: null,
      });

      const rows = await addSavedCartToCart(88);
      expect(mockedSupabase.rpc).toHaveBeenCalledWith("add_saved_cart_to_cart", {
        p_saved_cart_id: 88,
      });
      expect(rows).toEqual([{ listing_id: 1, action: "merged" }]);
    });
  });

  describe("fetchSavedCarts", () => {
    test("returns [] when unauthenticated", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const rows = await fetchSavedCarts();
      expect(rows).toEqual([]);
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    test("builds saved cart previews and item counts", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      const savedCartsBuilder = createBuilder({
        data: [
          {
            id: 10,
            name: "Late Night",
            icon: null,
            created_at: "2026-02-11T10:00:00Z",
            updated_at: "2026-02-11T10:00:00Z",
            last_used_at: null,
          },
          {
            id: 20,
            name: "Game Day",
            icon: "🏀",
            created_at: "2026-02-10T10:00:00Z",
            updated_at: "2026-02-10T11:00:00Z",
            last_used_at: "2026-02-11T09:00:00Z",
          },
        ],
        error: null,
      });

      const savedCartItemsBuilder = createBuilder({
        data: [
          { saved_cart_id: 10, listing_id: 1, quantity: 1 },
          { saved_cart_id: 10, listing_id: 999, quantity: 2 },
          { saved_cart_id: 10, listing_id: 2, quantity: 1 },
          { saved_cart_id: 20, listing_id: 3, quantity: 1 },
        ],
        error: null,
      });

      const listingsBuilder = createBuilder({
        data: [
          { id: 1, title: "Pizza" },
          { id: 2, title: "Soda" },
          { id: 3, title: "" },
        ],
        error: null,
      });

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "saved_carts") return savedCartsBuilder;
        if (table === "saved_cart_items") return savedCartItemsBuilder;
        if (table === "listings") return listingsBuilder;
        throw new Error(`Unexpected table ${table}`);
      });

      const rows = await fetchSavedCarts();

      expect(rows).toEqual([
        {
          id: 10,
          name: "Late Night",
          icon: null,
          created_at: "2026-02-11T10:00:00Z",
          updated_at: "2026-02-11T10:00:00Z",
          last_used_at: null,
          item_count: 3,
          preview_titles: ["Pizza", "Listing", "Soda"],
        },
        {
          id: 20,
          name: "Game Day",
          icon: "🏀",
          created_at: "2026-02-10T10:00:00Z",
          updated_at: "2026-02-10T11:00:00Z",
          last_used_at: "2026-02-11T09:00:00Z",
          item_count: 1,
          preview_titles: ["Listing"],
        },
      ]);
    });

    test("throws when saved cart query fails", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "saved_carts") {
          return createBuilder({
            data: null,
            error: new Error("saved carts failed"),
          });
        }
        return createBuilder({ data: [], error: null });
      });

      await expect(fetchSavedCarts()).rejects.toThrow("saved carts failed");
    });
  });

  describe("rename/delete saved cart", () => {
    test("renameSavedCart trims name before update", async () => {
      const builder = createBuilder({ data: null, error: null });
      mockedSupabase.from.mockReturnValue(builder);

      await renameSavedCart(25, "  Weekly Core  ");

      expect(builder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Weekly Core",
          updated_at: expect.any(String),
        }),
      );
      expect(builder.eq).toHaveBeenCalledWith("id", 25);
    });

    test("deleteSavedCart deletes by id", async () => {
      const builder = createBuilder({ data: null, error: null });
      mockedSupabase.from.mockReturnValue(builder);

      await deleteSavedCart(31);
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith("id", 31);
    });
  });

  describe("fetchBuyAgainListings", () => {
    test("returns [] when no paid orders exist", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      const ordersBuilder = createBuilder({ data: [], error: null });
      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "orders") return ordersBuilder;
        return createBuilder({ data: [], error: null });
      });

      const rows = await fetchBuyAgainListings(5);
      expect(rows).toEqual([]);
    });

    test("ranks listings by recency then quantity", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      const ordersBuilder = createBuilder({
        data: [
          { id: 100, created_at: "2026-02-11T09:00:00Z" },
          { id: 200, created_at: "2026-02-10T09:00:00Z" },
        ],
        error: null,
      });

      const orderItemsBuilder = createBuilder({
        data: [
          { order_id: 100, listing_id: 1, quantity: 2 },
          { order_id: 100, listing_id: 2, quantity: 4 },
          { order_id: 200, listing_id: 1, quantity: 1 },
          { order_id: 200, listing_id: 3, quantity: 10 },
        ],
        error: null,
      });

      const listingsBuilder = createBuilder({
        data: [
          { id: 1, title: "Apples", price_cents: 400 },
          { id: 2, title: "Bagel", price_cents: 250 },
          { id: 3, title: "Cookies", price_cents: 500 },
        ],
        error: null,
      });

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "orders") return ordersBuilder;
        if (table === "order_items") return orderItemsBuilder;
        if (table === "listings") return listingsBuilder;
        throw new Error(`Unexpected table ${table}`);
      });

      const rows = await fetchBuyAgainListings(2);
      expect(rows.map((row) => row.id)).toEqual([2, 1]);
    });

    test("throws when listing query fails", async () => {
      mockedSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });

      mockedSupabase.from.mockImplementation((table: string) => {
        if (table === "orders") {
          return createBuilder({
            data: [{ id: 1, created_at: "2026-02-11T09:00:00Z" }],
            error: null,
          });
        }
        if (table === "order_items") {
          return createBuilder({
            data: [{ order_id: 1, listing_id: 1, quantity: 1 }],
            error: null,
          });
        }
        if (table === "listings") {
          return createBuilder({
            data: null,
            error: new Error("listing query failed"),
          });
        }
        return createBuilder({ data: [], error: null });
      });

      await expect(fetchBuyAgainListings()).rejects.toThrow(
        "listing query failed",
      );
    });
  });
});
