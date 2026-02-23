-- Remove schedule and availability: drop tables (order: child first).
drop table if exists public.route_schedules;
drop table if exists public.listing_availability;
