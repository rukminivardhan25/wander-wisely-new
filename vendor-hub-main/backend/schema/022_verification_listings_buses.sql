-- Verification fields for listings (company verification)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'no_request';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verified_by_admin uuid;

-- Verification fields for buses (bus verification)
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS verification_token text;
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'no_request';
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE public.buses ADD COLUMN IF NOT EXISTS verified_by_admin uuid;
