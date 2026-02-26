-- Activity visit/miss status for My Trip (persisted per activity).
-- Run after 006_trip_budget_amount.sql.

create table if not exists public.trip_activity_status (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  activity_index int not null check (activity_index >= 0),
  status text not null check (status in ('visited', 'missed')),
  created_at timestamptz default now(),
  unique(trip_id, day_number, activity_index)
);

create index if not exists idx_trip_activity_status_trip_id on public.trip_activity_status(trip_id);
