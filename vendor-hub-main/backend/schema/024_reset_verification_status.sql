-- One-time fix: reset verification_status from 'pending' to 'no_request' for listings (and buses)
-- so that "Pending request" only appears after the vendor sends the request from the Verification page,
-- not from having only generated a token (old bug).
UPDATE public.listings SET verification_status = 'no_request' WHERE verification_status = 'pending';
UPDATE public.buses SET verification_status = 'no_request' WHERE verification_status = 'pending';
