-- Hotel booking: after vendor approval bill is ready; user pays to confirm.
-- paid_at set when user completes payment (status moves to confirmed).
ALTER TABLE public.hotel_bookings ADD COLUMN IF NOT EXISTS paid_at timestamptz;
