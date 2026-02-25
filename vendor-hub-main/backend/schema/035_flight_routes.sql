-- Flight routes: from → to for a flight. Fare can override flight base_fare_cents.
CREATE TABLE IF NOT EXISTS public.flight_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,

  from_place text NOT NULL,
  to_place text NOT NULL,
  fare_cents int CHECK (fare_cents IS NULL OR fare_cents >= 0),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flight_routes_flight_id ON public.flight_routes(flight_id);
