-- Scope bookings to a trip. List endpoints filter by trip_id when provided.
-- Run after trips and booking tables exist. Optional tables (flight, car, experience, event) are skipped if not present.

ALTER TABLE public.transport_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_transport_bookings_trip_id ON public.transport_bookings(trip_id);

ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_hotel_bookings_trip_id ON public.hotel_bookings(trip_id);

DO $$
BEGIN
  ALTER TABLE public.flight_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_flight_bookings_trip_id ON public.flight_bookings(trip_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.car_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_car_bookings_trip_id ON public.car_bookings(trip_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.experience_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_experience_bookings_trip_id ON public.experience_bookings(trip_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.event_bookings ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES public.trips(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_event_bookings_trip_id ON public.event_bookings(trip_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
