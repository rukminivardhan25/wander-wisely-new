-- Aggregated customers per vendor (synced from transport bookings via main app).
-- One row per (vendor_id, email); upsert when syncing from bookings.
create table if not exists public.vendor_customers (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  total_bookings integer not null default 0,
  total_spent_cents bigint not null default 0,
  last_booking_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vendor_id, email)
);

create index if not exists idx_vendor_customers_vendor_id on public.vendor_customers(vendor_id);
create index if not exists idx_vendor_customers_email on public.vendor_customers(vendor_id, email);
