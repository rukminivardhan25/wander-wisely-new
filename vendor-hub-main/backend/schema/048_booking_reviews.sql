-- Booking reviews: user leaves a review for the vendor/company for a specific booking.
-- Separate from app_feedback (admin-facing). These are shown to the vendor by company and by listing/scope.
CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who wrote the review (main app user; no FK so main app and partner portal can use same or different DBs)
  user_id uuid NOT NULL,
  user_name text,

  -- Company (listing) this review is for
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  -- Optional: specific entity under the listing (bus, car, hotel_branch, flight). NULL = company overall (or experience/event which have no sub-parts)
  scope_entity_type text CHECK (scope_entity_type IS NULL OR scope_entity_type IN ('bus', 'car', 'hotel_branch', 'flight')),
  scope_entity_id uuid,

  -- Which booking this review is for (one review per booking)
  booking_type text NOT NULL CHECK (booking_type IN ('transport', 'car', 'flight', 'hotel', 'experience', 'event')),
  booking_id uuid NOT NULL,

  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_reviews_booking ON public.booking_reviews(booking_type, booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_listing_id ON public.booking_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_user_id ON public.booking_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_created_at ON public.booking_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_scope ON public.booking_reviews(listing_id, scope_entity_type, scope_entity_id);

COMMENT ON TABLE public.booking_reviews IS 'User-submitted reviews for a booking; shown to vendor by company (listing) and optionally by scope (bus/car/branch). Experience and event have no scope = company-only.';
