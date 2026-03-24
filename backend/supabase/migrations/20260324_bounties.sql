-- ============================================================
-- Bounty Feature
-- Allows students to place bounties on food/beverage runs from
-- nearby stores. Dashers can claim and fulfill them.
-- ============================================================

-- ============================================================
-- 1. TABLE
-- ============================================================

CREATE TABLE public.bounties (
  id                      bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  buyer_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_description        text NOT NULL,
  store_name              text NOT NULL,
  store_location          text NOT NULL,
  bounty_amount_cents     integer NOT NULL,
  deadline                timestamptz NOT NULL,
  delivery_address        text NOT NULL,
  delivery_lat            double precision,
  delivery_lng            double precision,
  -- Status flow: open → claimed → picked_up → delivered → confirmed|disputed
  -- Side exits:  open → cancelled
  status                  text NOT NULL DEFAULT 'open',
  paid_at                 timestamptz,           -- null until Stripe payment confirmed
  dasher_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at              timestamptz,
  picked_up_at            timestamptz,
  delivered_at            timestamptz,
  buyer_confirmed         boolean,               -- null=pending, true=confirmed, false=disputed
  buyer_confirmed_at      timestamptz,
  buyer_flag_reason       text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_bounties_buyer_id   ON public.bounties(buyer_id);
CREATE INDEX idx_bounties_status     ON public.bounties(status);
CREATE INDEX idx_bounties_dasher_id  ON public.bounties(dasher_id);
CREATE INDEX idx_bounties_deadline   ON public.bounties(deadline);

-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Buyer can see all their own bounties
CREATE POLICY bounties_select_buyer ON public.bounties
  FOR SELECT
  USING ((select auth.uid()) = buyer_id);

-- Registered dashers can see open, paid, non-expired bounties
CREATE POLICY bounties_select_dasher_open ON public.bounties
  FOR SELECT
  USING (
    status = 'open'
    AND paid_at IS NOT NULL
    AND deadline > now()
    AND EXISTS (
      SELECT 1 FROM public.dashers WHERE id = (select auth.uid())
    )
  );

-- Dasher can see their own claimed/active bounties
CREATE POLICY bounties_select_dasher_mine ON public.bounties
  FOR SELECT
  USING (
    dasher_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.dashers WHERE id = (select auth.uid())
    )
  );

-- Any authenticated user can insert a bounty for themselves
CREATE POLICY bounties_insert ON public.bounties
  FOR INSERT
  WITH CHECK ((select auth.uid()) = buyer_id);

-- No direct client UPDATE — all mutations go through SECURITY DEFINER RPCs

-- ============================================================
-- 4. REALTIME PUBLICATION
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.bounties;

-- ============================================================
-- 5. RPCs
-- ============================================================

-- ----------------------------------------------------------
-- place_bounty: buyer creates a bounty (before Stripe payment)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_bounty(
  p_item_description    text,
  p_store_name          text,
  p_store_location      text,
  p_bounty_amount_cents integer,
  p_deadline            timestamptz,
  p_delivery_address    text,
  p_delivery_lat        double precision DEFAULT NULL,
  p_delivery_lng        double precision DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty_id bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(p_item_description) = '' THEN
    RAISE EXCEPTION 'Item description is required';
  END IF;
  IF trim(p_store_name) = '' THEN
    RAISE EXCEPTION 'Store name is required';
  END IF;
  IF trim(p_store_location) = '' THEN
    RAISE EXCEPTION 'Store location is required';
  END IF;
  IF p_bounty_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Bounty amount must be greater than zero';
  END IF;
  IF p_deadline <= now() THEN
    RAISE EXCEPTION 'Deadline must be in the future';
  END IF;
  IF trim(p_delivery_address) = '' THEN
    RAISE EXCEPTION 'Delivery address is required';
  END IF;

  INSERT INTO public.bounties (
    buyer_id,
    item_description,
    store_name,
    store_location,
    bounty_amount_cents,
    deadline,
    delivery_address,
    delivery_lat,
    delivery_lng,
    status
  ) VALUES (
    v_user_id,
    trim(p_item_description),
    trim(p_store_name),
    trim(p_store_location),
    p_bounty_amount_cents,
    p_deadline,
    trim(p_delivery_address),
    p_delivery_lat,
    p_delivery_lng,
    'open'
  )
  RETURNING id INTO v_bounty_id;

  RETURN v_bounty_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.place_bounty(text, text, text, integer, timestamptz, text, double precision, double precision) TO authenticated;

-- ----------------------------------------------------------
-- finalize_paid_bounty: called by PaymentSuccess after Stripe confirms
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_paid_bounty(p_bounty_id bigint)
RETURNS TABLE(bounty_id bigint, status text, finalized_now boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty   public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bounty FROM public.bounties b
  WHERE b.id = p_bounty_id AND b.buyer_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found or not owned by caller';
  END IF;

  -- Idempotent: if already finalized, return without modifying
  IF v_bounty.paid_at IS NOT NULL THEN
    RETURN QUERY SELECT v_bounty.id, v_bounty.status, false;
    RETURN;
  END IF;

  UPDATE public.bounties
  SET paid_at = now()
  WHERE id = p_bounty_id
  RETURNING id, public.bounties.status, true
  INTO bounty_id, status, finalized_now;

  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_paid_bounty(bigint) TO authenticated;

-- ----------------------------------------------------------
-- claim_bounty: dasher atomically claims an open bounty
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_bounty(p_bounty_id bigint)
RETURNS SETOF public.bounties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid;
  v_bounty   public.bounties;
  v_updated  public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is a registered dasher
  IF NOT EXISTS (SELECT 1 FROM public.dashers WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Only registered dashers can claim bounties';
  END IF;

  -- Atomic claim: only succeeds if still open and unpaid
  UPDATE public.bounties
  SET
    status     = 'claimed',
    dasher_id  = v_user_id,
    claimed_at = now()
  WHERE id = p_bounty_id
    AND status = 'open'
    AND dasher_id IS NULL
    AND paid_at IS NOT NULL
  RETURNING * INTO v_updated;

  IF v_updated IS NULL THEN
    RAISE EXCEPTION 'Bounty is no longer available';
  END IF;

  -- Mark dasher as busy
  UPDATE public.dashers SET status = 'busy' WHERE id = v_user_id;

  RETURN NEXT v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_bounty(bigint) TO authenticated;

-- ----------------------------------------------------------
-- set_bounty_status: dasher progresses bounty through pickup → delivery
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_bounty_status(
  p_bounty_id bigint,
  p_status    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty  public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bounty FROM public.bounties
  WHERE id = p_bounty_id AND dasher_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found or not assigned to you';
  END IF;

  -- Enforce valid transitions
  IF p_status = 'picked_up' AND v_bounty.status != 'claimed' THEN
    RAISE EXCEPTION 'Can only mark picked_up from claimed status';
  END IF;
  IF p_status = 'delivered' AND v_bounty.status != 'picked_up' THEN
    RAISE EXCEPTION 'Can only mark delivered from picked_up status';
  END IF;
  IF p_status NOT IN ('picked_up', 'delivered') THEN
    RAISE EXCEPTION 'Invalid status transition: %', p_status;
  END IF;

  UPDATE public.bounties
  SET
    status       = p_status,
    picked_up_at = CASE WHEN p_status = 'picked_up' THEN now() ELSE picked_up_at END,
    delivered_at = CASE WHEN p_status = 'delivered' THEN now() ELSE delivered_at END
  WHERE id = p_bounty_id;

  -- When delivered, mark dasher as available again
  IF p_status = 'delivered' THEN
    UPDATE public.dashers SET status = 'online' WHERE id = v_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_bounty_status(bigint, text) TO authenticated;

-- ----------------------------------------------------------
-- confirm_bounty_receipt: buyer confirms delivery (within 48h)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_bounty_receipt(p_bounty_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty  public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bounty FROM public.bounties
  WHERE id = p_bounty_id AND buyer_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found or not owned by caller';
  END IF;
  IF v_bounty.status != 'delivered' THEN
    RAISE EXCEPTION 'Bounty has not been delivered yet';
  END IF;
  IF v_bounty.buyer_confirmed IS NOT NULL THEN
    RAISE EXCEPTION 'Bounty receipt already confirmed or disputed';
  END IF;
  IF v_bounty.delivered_at < now() - interval '48 hours' THEN
    RAISE EXCEPTION 'Confirmation window has expired (48 hours)';
  END IF;

  UPDATE public.bounties
  SET
    buyer_confirmed    = true,
    buyer_confirmed_at = now(),
    status             = 'confirmed'
  WHERE id = p_bounty_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_bounty_receipt(bigint) TO authenticated;

-- ----------------------------------------------------------
-- flag_bounty_issue: buyer disputes delivery (within 48h)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flag_bounty_issue(
  p_bounty_id bigint,
  p_reason    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty  public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to flag an issue';
  END IF;

  SELECT * INTO v_bounty FROM public.bounties
  WHERE id = p_bounty_id AND buyer_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found or not owned by caller';
  END IF;
  IF v_bounty.status != 'delivered' THEN
    RAISE EXCEPTION 'Bounty has not been delivered yet';
  END IF;
  IF v_bounty.buyer_confirmed IS NOT NULL THEN
    RAISE EXCEPTION 'Bounty receipt already confirmed or disputed';
  END IF;
  IF v_bounty.delivered_at < now() - interval '48 hours' THEN
    RAISE EXCEPTION 'Dispute window has expired (48 hours)';
  END IF;

  UPDATE public.bounties
  SET
    buyer_confirmed    = false,
    buyer_confirmed_at = now(),
    buyer_flag_reason  = trim(p_reason),
    status             = 'disputed'
  WHERE id = p_bounty_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.flag_bounty_issue(bigint, text) TO authenticated;

-- ----------------------------------------------------------
-- get_buyer_bounties: returns all bounties for the authenticated buyer
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_buyer_bounties()
RETURNS SETOF public.bounties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT * FROM public.bounties
  WHERE buyer_id = v_user_id
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_buyer_bounties() TO authenticated;

-- ----------------------------------------------------------
-- get_open_bounties: returns open, paid, non-expired bounties for dashers
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_open_bounties()
RETURNS SETOF public.bounties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.dashers WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Only registered dashers can view open bounties';
  END IF;

  RETURN QUERY
  SELECT * FROM public.bounties
  WHERE status = 'open'
    AND paid_at IS NOT NULL
    AND deadline > now()
  ORDER BY deadline ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_open_bounties() TO authenticated;

-- ----------------------------------------------------------
-- get_dasher_active_bounties: bounties the dasher has claimed and is working
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dasher_active_bounties()
RETURNS SETOF public.bounties
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT * FROM public.bounties
  WHERE dasher_id = v_user_id
    AND status IN ('claimed', 'picked_up')
  ORDER BY claimed_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dasher_active_bounties() TO authenticated;

-- ----------------------------------------------------------
-- cancel_bounty: buyer cancels an unclaimed bounty
-- Note: Stripe refund must be handled manually via Stripe dashboard
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_bounty(p_bounty_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_bounty  public.bounties;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bounty FROM public.bounties
  WHERE id = p_bounty_id AND buyer_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bounty not found or not owned by caller';
  END IF;
  IF v_bounty.status != 'open' THEN
    RAISE EXCEPTION 'Only open (unclaimed) bounties can be cancelled';
  END IF;

  UPDATE public.bounties SET status = 'cancelled' WHERE id = p_bounty_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_bounty(bigint) TO authenticated;
