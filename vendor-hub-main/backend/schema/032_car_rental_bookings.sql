-- Car rental bookings (user requests). Lives in transport DB so both main app and vendor-hub can access.
-- user_id is main app user (no FK; main app and vendor-hub may use different DBs for users/vendors).
CREATE TABLE IF NOT EXISTS public.car_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES public.car_operating_areas(id) ON DELETE CASCADE,

  booking_type text NOT NULL CHECK (booking_type IN ('local', 'intercity')),

  -- Local
  city text,
  pickup_point text,
  drop_point text,
  travel_time time,

  -- Intercity
  from_city text,
  to_city text,

  travel_date date NOT NULL,
  passengers int NOT NULL CHECK (passengers >= 1 AND passengers <= 20),
  total_cents int CHECK (total_cents IS NULL OR total_cents >= 0),

  status text NOT NULL DEFAULT 'pending_vendor'
    CHECK (status IN ('pending_vendor', 'approved_awaiting_payment', 'confirmed', 'rejected')),
  otp text,
  paid_at timestamptz,
  rejected_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_bookings_listing_id ON public.car_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_car_bookings_car_id ON public.car_bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_car_bookings_user_id ON public.car_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_car_bookings_status ON public.car_bookings(status);
CREATE INDEX IF NOT EXISTS idx_car_bookings_travel_date ON public.car_bookings(travel_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_car_bookings_booking_ref ON public.car_bookings(booking_ref);
