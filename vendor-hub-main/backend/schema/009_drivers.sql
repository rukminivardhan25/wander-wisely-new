-- Drivers: separate table per business (listing). No driver columns on listings.
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

-- Migrate existing driver data from listings (if columns exist)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'driver_name'
  ) then
    insert into public.drivers (listing_id, name, phone, license_no)
    select id, driver_name, driver_phone, driver_license_no
    from public.listings
    where driver_name is not null or driver_phone is not null or driver_license_no is not null;
  end if;
end $$;
