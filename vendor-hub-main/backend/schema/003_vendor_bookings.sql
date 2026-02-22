-- Bookings for vendor listings (customer bookings)
create table if not exists public.vendor_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_status text not null default 'awaiting' check (payment_status in ('awaiting', 'paid', 'refunded')),
  amount_cents integer not null default 0,
  guests integer default 1,
  booked_at timestamptz default now(),
  booked_for_date date,
  notes text
);

create index if not exists idx_vendor_bookings_listing_id on public.vendor_bookings(listing_id);
create index if not exists idx_vendor_bookings_status on public.vendor_bookings(status);
