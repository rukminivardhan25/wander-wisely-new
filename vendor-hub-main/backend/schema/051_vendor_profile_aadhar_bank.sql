-- Vendor profile: Aadhar and bank details (owner name = existing "name" column).
-- All new columns nullable for existing rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'aadhar_number') THEN
    ALTER TABLE public.vendors ADD COLUMN aadhar_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'aadhar_name') THEN
    ALTER TABLE public.vendors ADD COLUMN aadhar_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'bank_account_holder_name') THEN
    ALTER TABLE public.vendors ADD COLUMN bank_account_holder_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'bank_account_number') THEN
    ALTER TABLE public.vendors ADD COLUMN bank_account_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'bank_ifsc') THEN
    ALTER TABLE public.vendors ADD COLUMN bank_ifsc text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'bank_name') THEN
    ALTER TABLE public.vendors ADD COLUMN bank_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vendors' AND column_name = 'bank_branch') THEN
    ALTER TABLE public.vendors ADD COLUMN bank_branch text;
  END IF;
END $$;
