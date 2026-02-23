-- Drivers: many per listing. Each listing (e.g. transport) can have multiple drivers.
-- Fleet (buses) and drivers are both linked to listing_id.
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
