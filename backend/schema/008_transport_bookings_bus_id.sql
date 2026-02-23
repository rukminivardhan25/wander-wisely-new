-- Link transport bookings to bus (and optional listing) for vendor visibility.
-- Run after 007_transport_bookings.sql.
alter table if exists public.transport_bookings
  add column if not exists bus_id uuid,
  add column if not exists listing_id uuid;

create index if not exists idx_transport_bookings_bus_date
  on public.transport_bookings (bus_id, travel_date)
  where bus_id is not null;
