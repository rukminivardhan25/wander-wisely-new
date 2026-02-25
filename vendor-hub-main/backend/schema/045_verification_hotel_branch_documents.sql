-- Documents uploaded for a hotel branch verification request (like verification_bus_documents).
CREATE TABLE IF NOT EXISTS public.verification_hotel_branch_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_branch_id uuid NOT NULL REFERENCES public.hotel_branches(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_hotel_branch_documents_branch_id ON public.verification_hotel_branch_documents(hotel_branch_id);
