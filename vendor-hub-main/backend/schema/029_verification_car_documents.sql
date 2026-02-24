-- Documents uploaded by vendor for car verification (Insurance, RC, Driver license).
CREATE TABLE IF NOT EXISTS public.verification_car_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('insurance', 'rc', 'driver_license')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_car_documents_car_id ON public.verification_car_documents(car_id);
