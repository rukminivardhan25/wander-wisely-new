-- Remove driver columns from listings; drivers are in public.drivers now.
alter table public.listings drop column if exists driver_name;
alter table public.listings drop column if exists driver_phone;
alter table public.listings drop column if exists driver_license_no;
