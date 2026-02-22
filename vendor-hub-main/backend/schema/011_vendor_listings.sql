-- Link vendors to listings (businesses). Listings table no longer holds vendor_id.
create table if not exists public.vendor_listings (
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (vendor_id, listing_id)
);

create index if not exists idx_vendor_listings_vendor_id on public.vendor_listings(vendor_id);
create index if not exists idx_vendor_listings_listing_id on public.vendor_listings(listing_id);

-- Migrate: copy vendor_id from listings into vendor_listings
insert into public.vendor_listings (vendor_id, listing_id)
select vendor_id, id from public.listings
where vendor_id is not null
on conflict (vendor_id, listing_id) do nothing;

-- Drop vendor_id from listings (after migration)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'listings' and column_name = 'vendor_id'
  ) then
    alter table public.listings drop constraint if exists listings_vendor_id_fkey;
    alter table public.listings drop column vendor_id;
  end if;
end $$;
