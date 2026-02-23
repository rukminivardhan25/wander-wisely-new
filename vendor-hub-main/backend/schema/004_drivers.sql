-- 4. drivers (optional; listing → many drivers)
-- id, listing_id, name, phone, license_no, created_at, updated_at
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text,
  phone text,
  license_no text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_drivers_listing_id on public.drivers(listing_id);
