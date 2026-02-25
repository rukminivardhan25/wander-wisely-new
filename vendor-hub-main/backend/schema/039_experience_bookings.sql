-- Experience bookings: user books a slot. user_id = main app user.
CREATE TABLE IF NOT EXISTS public.experience_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref text NOT NULL UNIQUE,

  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  experience_slot_id uuid NOT NULL REFERENCES public.experience_slots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,

  participants_count int NOT NULL CHECK (participants_count >= 1 AND participants_count <= 50),
  total_cents int NOT NULL CHECK (total_cents >= 0),

  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  qr_code text,
  paid_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_bookings_experience_id ON public.experience_bookings(experience_id);
CREATE INDEX IF NOT EXISTS idx_experience_bookings_slot_id ON public.experience_bookings(experience_slot_id);
CREATE INDEX IF NOT EXISTS idx_experience_bookings_user_id ON public.experience_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_experience_bookings_status ON public.experience_bookings(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_experience_bookings_booking_ref ON public.experience_bookings(booking_ref);
