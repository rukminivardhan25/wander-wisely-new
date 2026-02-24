-- Cars: vendor-side only. Category = local (intra-city) or intercity.
CREATE TABLE IF NOT EXISTS public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text,
  category text NOT NULL CHECK (category IN ('local', 'intercity')),
  car_type text NOT NULL CHECK (car_type IN ('sedan', 'suv', 'hatchback', 'luxury')),
  seats int NOT NULL CHECK (seats >= 1 AND seats <= 20) DEFAULT 4,
  ac_type text CHECK (ac_type IS NULL OR ac_type IN ('ac', 'non_ac')),
  manufacturer text,
  model text,
  photo_url text,
  has_wifi boolean DEFAULT false,
  has_charging boolean DEFAULT false,
  has_child_seat boolean DEFAULT false,
  verification_token text,
  verification_status text DEFAULT 'no_request',
  verified_at timestamptz,
  verified_by_admin uuid,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cars_listing_reg ON public.cars(listing_id, lower(trim(registration_number))) WHERE registration_number IS NOT NULL AND trim(registration_number) <> '';
CREATE INDEX IF NOT EXISTS idx_cars_listing_id ON public.cars(listing_id);
CREATE INDEX IF NOT EXISTS idx_cars_verification_token ON public.cars(verification_token) WHERE verification_token IS NOT NULL;
