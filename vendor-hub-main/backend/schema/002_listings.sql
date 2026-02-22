-- Listings (services/experiences) owned by vendors
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  type text not null check (type in ('restaurant', 'event', 'experience', 'hotel', 'transport', 'other')),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'live')),
  description text,
  cover_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_listings_vendor_id on public.listings(vendor_id);
create index if not exists idx_listings_status on public.listings(status);
