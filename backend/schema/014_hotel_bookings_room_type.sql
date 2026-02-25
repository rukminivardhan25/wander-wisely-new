-- Store selected room type (name) from user's choice at booking time.
ALTER TABLE public.hotel_bookings
  ADD COLUMN IF NOT EXISTS room_type text;

COMMENT ON COLUMN public.hotel_bookings.room_type IS 'Room type name selected by user (from hotel branch extra_details.room_types).';
