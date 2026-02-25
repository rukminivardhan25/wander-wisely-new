-- Flights: vendor-managed. One row per flight (e.g. 6E-201).
CREATE TABLE IF NOT EXISTS public.flights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  flight_number text NOT NULL,
  airline_name text NOT NULL,
  aircraft_type text NOT NULL,
  flight_type text NOT NULL DEFAULT 'domestic' CHECK (flight_type IN ('domestic', 'international')),

  total_seats int NOT NULL CHECK (total_seats >= 1 AND total_seats <= 500),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Cabin layout: e.g. { "rows": 10, "colsPerRow": 6, "classes": [{ "name": "Economy", "rowFrom": "A", "rowTo": "E" }] }
  seat_layout jsonb,

  base_fare_cents int CHECK (base_fare_cents IS NULL OR base_fare_cents >= 0),
  baggage_allowance text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flights_listing_id ON public.flights(listing_id);
CREATE INDEX IF NOT EXISTS idx_flights_status ON public.flights(status);
CREATE INDEX IF NOT EXISTS idx_flights_flight_number ON public.flights(listing_id, lower(trim(flight_number)));
