-- Verification fields for flights (same pattern as buses/cars).
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'no_request';
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.flights ADD COLUMN IF NOT EXISTS verified_by_admin uuid;
