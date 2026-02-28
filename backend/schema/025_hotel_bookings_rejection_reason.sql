-- Optional reason when vendor rejects a hotel booking request.
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS rejection_reason text;
COMMENT ON COLUMN public.hotel_bookings.rejection_reason IS 'Reason given by hotel when rejecting the request (optional).';
