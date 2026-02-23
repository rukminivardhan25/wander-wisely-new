-- User bus/transport bookings (ticket details, seats, customer info).
-- Run after 001_users.sql.
create table if not exists public.transport_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  booking_id text not null unique,
  listing_name text,
  bus_name text,
  registration_number text,
  bus_number text,
  departure_time text,
  driver_name text,
  driver_phone text,
  selected_seats integer[] not null default '{}',
  travel_date text not null,
  route_from text not null,
  route_to text not null,
  total_cents integer not null,
  passenger_name text,
  passenger_phone text,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transport_bookings_user_id on public.transport_bookings(user_id);
create index if not exists idx_transport_bookings_booking_id on public.transport_bookings(booking_id);
