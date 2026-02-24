-- Predefined cities for car operating areas (manual selection; map display).
CREATE TABLE IF NOT EXISTS public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);

-- Seed common Indian cities for vendor dropdown
INSERT INTO public.cities (name, lat, lng) VALUES
  ('Hyderabad', 17.3850, 78.4867),
  ('Bangalore', 12.9716, 77.5946),
  ('Chennai', 13.0827, 80.2707),
  ('Mumbai', 19.0760, 72.8777),
  ('Delhi', 28.7041, 77.1025),
  ('Kolkata', 22.5726, 88.3639),
  ('Pune', 18.5204, 73.8567),
  ('Ahmedabad', 23.0225, 72.5714),
  ('Jaipur', 26.9124, 75.7873),
  ('Kochi', 9.9312, 76.2673),
  ('Goa', 15.2993, 74.1240),
  ('Visakhapatnam', 17.6868, 83.2185),
  ('Vijayawada', 16.5062, 80.6480),
  ('Tirupati', 13.6288, 79.4192),
  ('Warangal', 17.9689, 79.5941)
ON CONFLICT (name) DO NOTHING;
