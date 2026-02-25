-- Store facilities, check-in/out, room types, and image refs for hotel branches (all 6 steps).
ALTER TABLE public.hotel_branches
  ADD COLUMN IF NOT EXISTS extra_details jsonb DEFAULT '{}';

COMMENT ON COLUMN public.hotel_branches.extra_details IS 'JSON: facilities {}, check_in, check_out, room_types [], images {}';
