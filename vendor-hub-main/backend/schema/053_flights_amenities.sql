-- Flight amenities (like buses/cars). Editing triggers re-verification.
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS has_wifi boolean DEFAULT false;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS has_charging boolean DEFAULT false;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS has_entertainment boolean DEFAULT false;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS has_meal boolean DEFAULT false;
