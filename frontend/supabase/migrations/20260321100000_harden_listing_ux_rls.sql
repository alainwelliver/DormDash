CREATE OR REPLACE FUNCTION public.sync_listing_status_from_quantity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.available_quantity <= 0 THEN
    NEW.available_quantity := 0;
    NEW.status := 'sold';
  ELSIF NEW.status = 'sold' THEN
    NEW.status := 'active';
  END IF;

  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS saved_listings_select_own ON public.saved_listings;
CREATE POLICY saved_listings_select_own
  ON public.saved_listings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS saved_listings_insert_own ON public.saved_listings;
CREATE POLICY saved_listings_insert_own
  ON public.saved_listings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS saved_listings_delete_own ON public.saved_listings;
CREATE POLICY saved_listings_delete_own
  ON public.saved_listings
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS listing_reports_select_own ON public.listing_reports;
CREATE POLICY listing_reports_select_own
  ON public.listing_reports
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = reporter_id);

DROP POLICY IF EXISTS listing_reports_insert_own ON public.listing_reports;
CREATE POLICY listing_reports_insert_own
  ON public.listing_reports
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = reporter_id);
