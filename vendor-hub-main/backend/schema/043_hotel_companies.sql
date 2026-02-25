-- Hotel company profile: one per listing when listing type = 'hotel'.
-- Stores company details + authorized person details from the registration flow.
CREATE TABLE IF NOT EXISTS public.hotel_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  -- Company details
  company_name text NOT NULL,
  legal_business_name text,
  business_reg_number text,
  gst_tax_id text,
  company_email text,
  company_phone text,
  head_office_address text,
  company_description text,
  company_logo_url text,

  -- Authorized person details
  authorized_person_name text,
  authorized_person_dob date,
  authorized_person_designation text,
  authorized_person_phone text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_companies_listing_id ON public.hotel_companies(listing_id);
CREATE INDEX IF NOT EXISTS idx_hotel_companies_company_name ON public.hotel_companies(company_name);
