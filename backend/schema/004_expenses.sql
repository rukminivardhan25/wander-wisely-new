-- Expenses for a trip (Add Expense on My Trip).
-- Run after 003_active_trip.sql.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  category text not null check (category in ('Transport', 'Food', 'Shopping', 'Stay', 'Experience', 'Other')),
  day_number int check (day_number is null or (day_number >= 1 and day_number <= 30)),
  note text default '',
  created_at timestamptz default now()
);

create index if not exists idx_expenses_trip_id on public.expenses(trip_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
