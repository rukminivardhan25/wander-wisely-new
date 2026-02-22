-- User-selected budget amount for the trip (from Plan Trip form).
-- Run after 005_trip_start_date.sql.

alter table public.trips add column if not exists budget_amount numeric check (budget_amount is null or budget_amount > 0);
