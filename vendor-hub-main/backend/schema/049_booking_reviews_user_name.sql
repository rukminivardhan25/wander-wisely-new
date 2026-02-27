-- Add optional display name for review author (vendor sees this without joining users table).
ALTER TABLE public.booking_reviews
  ADD COLUMN IF NOT EXISTS user_name text;

COMMENT ON COLUMN public.booking_reviews.user_name IS 'Display name of the user who left the review (from main app users.full_name).';
