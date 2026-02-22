-- Trip start date: when the user "starts" the trip from a chosen day.
-- Run after 004_expenses.sql.

alter table public.trips add column if not exists start_date date default null;
