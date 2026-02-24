-- Operating areas for cars: local (one city) or intercity (from_city -> to_city).
-- area_type = 'local' uses city_* and local pricing; area_type = 'intercity' uses from_* / to_* and intercity pricing.
CREATE TABLE IF NOT EXISTS public.car_operating_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  area_type text NOT NULL CHECK (area_type IN ('local', 'intercity')),

  -- Local: single city
  city_name text,
  city_lat numeric,
  city_lng numeric,
  base_fare_cents int CHECK (base_fare_cents IS NULL OR base_fare_cents >= 0),
  price_per_km_cents int CHECK (price_per_km_cents IS NULL OR price_per_km_cents >= 0),
  minimum_fare_cents int CHECK (minimum_fare_cents IS NULL OR minimum_fare_cents >= 0),
  start_time time,
  end_time time,
  days_available text,

  -- Intercity: city pair
  from_city text,
  from_lat numeric,
  from_lng numeric,
  to_city text,
  to_lat numeric,
  to_lng numeric,
  estimated_duration_minutes int CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes >= 0),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_operating_areas_car_id ON public.car_operating_areas(car_id);
