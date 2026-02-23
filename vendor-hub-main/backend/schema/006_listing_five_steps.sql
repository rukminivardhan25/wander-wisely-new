-- Add five-step and location columns to listings if they don't exist (for DBs created with older 002).
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'tagline') then
    alter table public.listings add column tagline text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'registered_address') then
    alter table public.listings add column registered_address text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'service_area') then
    alter table public.listings add column service_area text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'address') then
    alter table public.listings add column address text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'listings' and column_name = 'city') then
    alter table public.listings add column city text;
  end if;
end $$;

-- Widen type check to all business types (drop old constraint if exists, add new)
alter table public.listings drop constraint if exists listings_type_check;
alter table public.listings add constraint listings_type_check check (
  type in ('restaurant', 'hotel', 'shop', 'transport', 'experience', 'rental', 'event', 'guide', 'emergency')
);
