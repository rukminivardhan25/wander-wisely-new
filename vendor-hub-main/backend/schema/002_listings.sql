-- 2. listings (each row = one company/business)
-- id, vendor_id, type, name, tagline, description, registered_address, service_area, address, city, cover_image_url, status, created_at, updated_at
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  type text not null check (type in ('restaurant', 'hotel', 'shop', 'transport', 'experience', 'rental', 'event', 'guide', 'emergency')),
  name text not null,
  tagline text,
  description text,
  registered_address text,
  service_area text,
  address text,
  city text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'live')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_listings_vendor_id on public.listings(vendor_id);
create index if not exists idx_listings_type on public.listings(type);
create index if not exists idx_listings_status on public.listings(status);
