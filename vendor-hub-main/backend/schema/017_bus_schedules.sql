-- Bus schedules: date range, times, recurring days, optional price override, seat availability.
create table if not exists public.bus_schedules (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  departure_time time not null,
  arrival_time time not null,
  mon boolean default false,
  tue boolean default false,
  wed boolean default false,
  thu boolean default false,
  fri boolean default false,
  sat boolean default false,
  sun boolean default false,
  price_override_cents integer,
  seat_availability integer,
  status text not null default 'active' check (status in ('active', 'draft', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_bus_schedules_bus_id on public.bus_schedules(bus_id);
comment on table public.bus_schedules is 'Schedule slots for a bus (recurring days, date range, times).';
