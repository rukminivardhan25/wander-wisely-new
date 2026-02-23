-- Drop all listing- and bus-related tables (reverse dependency order).
-- Keeps: vendors

drop table if exists public.route_schedules;
drop table if exists public.routes;
drop table if exists public.listing_availability;
drop table if exists public.drivers;
drop table if exists public.buses;
drop table if exists public.vendor_listings;
drop table if exists public.vendor_bookings;
drop table if exists public.listings;
