-- Performance index pack for high-traffic DormDash read paths.
-- Safe to re-run: every index uses IF NOT EXISTS.
DO $$
BEGIN
  IF to_regclass('public.listings') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_created_at_desc ON public.listings (created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_category_created_at_desc ON public.listings (category_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_category_price_created_at_desc ON public.listings (category_id, price_cents, created_at DESC)';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'listings'
        AND column_name = 'listing_tags'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_listings_listing_tags_gin ON public.listings USING GIN (listing_tags)';
    END IF;
  END IF;

  IF to_regclass('public.reviews') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_reviews_listing_created_desc ON public.reviews (listing_id, created_at DESC)';
  END IF;

  IF to_regclass('public.cart_items') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_cart_items_user_listing ON public.cart_items (user_id, listing_id)';
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_user_status_created_desc ON public.orders (user_id, status, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_user_created_desc ON public.orders (user_id, created_at DESC)';
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_order_items_listing_id ON public.order_items (listing_id)';
  END IF;

  IF to_regclass('public.delivery_orders') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_delivery_orders_status_created_desc ON public.delivery_orders (status, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_delivery_orders_dasher_status_created_desc ON public.delivery_orders (dasher_id, status, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_delivery_orders_order_buyer_created_asc ON public.delivery_orders (order_id, buyer_id, created_at ASC)';
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_delivery_orders_pending_created_desc
      ON public.delivery_orders (created_at DESC)
      WHERE status = 'pending'
    $idx$;
    EXECUTE $idx$
      CREATE INDEX IF NOT EXISTS idx_delivery_orders_dasher_active_created_desc
      ON public.delivery_orders (dasher_id, created_at DESC)
      WHERE status IN ('accepted', 'picked_up')
    $idx$;
  END IF;

  IF to_regclass('public.delivery_tracking') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_delivery_tracking_order_updated_desc ON public.delivery_tracking (delivery_order_id, updated_at DESC)';
  END IF;

  IF to_regclass('public.addresses') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_addresses_user_default_created_desc ON public.addresses (user_id, is_default DESC, created_at DESC)';
  END IF;

  IF to_regclass('public.saved_carts') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_saved_carts_user_last_used_created_desc ON public.saved_carts (user_id, last_used_at DESC, created_at DESC)';
  END IF;

  IF to_regclass('public.saved_cart_items') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_saved_cart_items_saved_cart_id ON public.saved_cart_items (saved_cart_id)';
  END IF;
END
$$;
