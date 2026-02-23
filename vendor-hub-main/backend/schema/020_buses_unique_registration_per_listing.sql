-- Bus uniqueness per listing: registration number uniquely identifies a bus within a listing.
-- Allows multiple buses with NULL/empty registration (legacy); no two buses in same listing can share the same non-empty registration.
create unique index if not exists idx_buses_listing_registration_unique
  on public.buses (listing_id, lower(trim(registration_number)))
  where registration_number is not null and trim(registration_number) != '';

comment on column public.buses.registration_number is 'Official vehicle registration number. Unique per listing (identifies the bus).';
