-- Hotel branches: individual hotels under a hotel company (listing type = hotel).
-- Each branch has its own verification (token + status), like buses under transport.
CREATE TABLE IF NOT EXISTS public.hotel_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  name text NOT NULL,
  city text,
  area_locality text,
  full_address text,
  pincode text,
  landmark text,
  contact_number text,
  email text,
  description text,

  verification_token text,
  verification_status text DEFAULT 'no_request',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_branches_listing_id ON public.hotel_branches(listing_id);
CREATE INDEX IF NOT EXISTS idx_hotel_branches_verification_token ON public.hotel_branches(verification_token) WHERE verification_token IS NOT NULL;
