-- Flight bookings (user requests). Same DB as car_bookings so main app and vendor-hub can access.
-- user_id = main app user. listing_id = vendor listing. flight_id = vendor's flight (no FK; flights may be static for now).
CREATE TABLE IF NOT EXISTS public.flight_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  flight_id uuid NOT NULL,
  schedule_id text,

  route_from text NOT NULL,
  route_to text NOT NULL,
  travel_date date NOT NULL,
  passengers int NOT NULL CHECK (passengers >= 1 AND passengers <= 20),
  total_cents int NOT NULL CHECK (total_cents >= 0),

  status text NOT NULL DEFAULT 'pending_vendor'
    CHECK (status IN ('pending_vendor', 'approved_awaiting_payment', 'confirmed', 'rejected')),
  otp text,
  paid_at timestamptz,
  rejected_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flight_booking_passengers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_booking_id uuid NOT NULL REFERENCES public.flight_bookings(id) ON DELETE CASCADE,
  name text NOT NULL,
  id_type text NOT NULL,
  id_number text NOT NULL,
  seat_number text
);

CREATE TABLE IF NOT EXISTS public.flight_booking_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_booking_id uuid NOT NULL REFERENCES public.flight_bookings(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flight_bookings_listing_id ON public.flight_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_user_id ON public.flight_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_status ON public.flight_bookings(status);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_travel_date ON public.flight_bookings(travel_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_flight_bookings_booking_ref ON public.flight_bookings(booking_ref);
CREATE INDEX IF NOT EXISTS idx_flight_booking_passengers_booking_id ON public.flight_booking_passengers(flight_booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_booking_documents_booking_id ON public.flight_booking_documents(flight_booking_id);
