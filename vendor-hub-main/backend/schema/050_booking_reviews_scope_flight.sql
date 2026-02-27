-- Allow scope_entity_type 'flight' so flight reviews appear under the specific flight in vendor Reviews.
DO $$
BEGIN
  ALTER TABLE public.booking_reviews
    DROP CONSTRAINT IF EXISTS booking_reviews_scope_entity_type_check;
EXCEPTION
  WHEN undefined_object THEN NULL; -- constraint name may vary
END $$;
ALTER TABLE public.booking_reviews
  ADD CONSTRAINT booking_reviews_scope_entity_type_check
  CHECK (scope_entity_type IS NULL OR scope_entity_type IN ('bus', 'car', 'hotel_branch', 'flight'));
