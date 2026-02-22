-- Driver details for transport listings (Operator Info)
alter table public.listings add column if not exists driver_name text;
alter table public.listings add column if not exists driver_phone text;
alter table public.listings add column if not exists driver_license_no text;
