-- Experiences: slot-based, repeatable activities (tours, workshops, etc.).
-- One experience per listing (listing type = 'experience').
CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,

  name text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  location_address text,
  location_lat decimal(10, 8),
  location_lng decimal(11, 8),

  duration_text text NOT NULL,
  short_description text,
  long_description text,
  age_restriction text,

  max_participants_per_slot int NOT NULL CHECK (max_participants_per_slot >= 1 AND max_participants_per_slot <= 200),

  price_per_person_cents int NOT NULL CHECK (price_per_person_cents >= 0),
  tax_included boolean NOT NULL DEFAULT true,
  cancellation_policy text,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended', 'live')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_listing_id ON public.experiences(listing_id);
CREATE INDEX IF NOT EXISTS idx_experiences_status ON public.experiences(status);
CREATE INDEX IF NOT EXISTS idx_experiences_city ON public.experiences(city);
CREATE INDEX IF NOT EXISTS idx_experiences_category ON public.experiences(category);

-- Slots: available date + time + capacity per slot.
CREATE TABLE IF NOT EXISTS public.experience_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,

  slot_date date NOT NULL,
  slot_time time NOT NULL,
  capacity int NOT NULL CHECK (capacity >= 1 AND capacity <= 500),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_slots_experience_id ON public.experience_slots(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_slots_date ON public.experience_slots(slot_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_experience_slots_unique ON public.experience_slots(experience_id, slot_date, slot_time);

-- Media: images (min 3, 1 cover). No video for now.
CREATE TABLE IF NOT EXISTS public.experience_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,

  file_url text NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_media_experience_id ON public.experience_media(experience_id);
