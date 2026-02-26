-- Schedule template as entered by vendor: start time, end time, number of slots per day.
-- Used to persist and repopulate the Create/Edit Experience schedule form.
-- experience_slots are still generated from this (or from recurring_slots) for booking.
CREATE TABLE IF NOT EXISTS public.experience_schedule_template (
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  day_of_week text NOT NULL CHECK (day_of_week IN ('mon','tue','wed','thu','fri','sat','sun')),
  start_time time NOT NULL,
  end_time time NOT NULL,
  number_of_slots int NOT NULL CHECK (number_of_slots >= 1 AND number_of_slots <= 100),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (experience_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_experience_schedule_template_experience_id ON public.experience_schedule_template(experience_id);
