-- Drivers assigned to a car (separate from bus drivers).
CREATE TABLE IF NOT EXISTS public.car_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  name text,
  phone text,
  license_number text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_car_drivers_car_id ON public.car_drivers(car_id);
