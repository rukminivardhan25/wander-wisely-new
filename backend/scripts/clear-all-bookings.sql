-- One-off: delete all user booking rows so My Trips shows no bookings.
-- Run against the same DB as main app (DATABASE_URL). No schema/code change.
-- Order: child tables first, then parents (flight_booking_* have CASCADE but explicit for clarity).

DELETE FROM public.flight_booking_passengers;
DELETE FROM public.flight_booking_documents;
DELETE FROM public.flight_bookings;

DELETE FROM public.car_bookings;

DELETE FROM public.transport_bookings;
