-- Hotel booking requests from users. Vendor approves and allots room_number.
-- Uses same DB as partner portal (listings, hotel_branches).
CREATE TABLE IF NOT EXISTS public.hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hotel_branch_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  booking_ref text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights int NOT NULL DEFAULT 1,
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  requirements_text text,
  document_urls jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending_vendor',
  room_number text,
  total_cents int,
  vendor_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotel_bookings_user_id ON public.hotel_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_listing_id ON public.hotel_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_hotel_branch_id ON public.hotel_bookings(hotel_branch_id);
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_status ON public.hotel_bookings(status);
