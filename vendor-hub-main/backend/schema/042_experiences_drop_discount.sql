-- Remove discount from experiences (no longer used in UI).
ALTER TABLE public.experiences DROP COLUMN IF EXISTS discount_text;
