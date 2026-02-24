-- Add date range to car operating areas for scheduling.
-- Local: show car only when today is between from_date and to_date and current time between start_time and end_time.
-- Intercity: show car when selected travel date is between from_date and to_date.
ALTER TABLE IF EXISTS public.car_operating_areas
  ADD COLUMN IF NOT EXISTS from_date date,
  ADD COLUMN IF NOT EXISTS to_date date;

CREATE INDEX IF NOT EXISTS idx_car_operating_areas_from_to_date
  ON public.car_operating_areas (from_date, to_date)
  WHERE from_date IS NOT NULL AND to_date IS NOT NULL;
