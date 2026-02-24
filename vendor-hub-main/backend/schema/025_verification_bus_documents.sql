-- Documents uploaded by vendor for a bus verification request.
CREATE TABLE IF NOT EXISTS public.verification_bus_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id uuid NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_bus_documents_bus_id ON public.verification_bus_documents(bus_id);
