-- Drop all vendor-related tables (clean slate). Order: child tables first.
drop table if exists public.drivers;
drop table if exists public.buses;
drop table if exists public.listings;
drop table if exists public.vendors;
