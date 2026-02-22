-- Schedule: which bus runs on which route, at what times, on which days.
create table if not exists public.route_schedules (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  bus_id uuid not null references public.buses(id) on delete restrict,
  departure_time time not null,
  arrival_time time not null,
  operating_days text[] not null default array['mon','tue','wed','thu','fri','sat','sun'],
  created_at timestamptz default now()
);

create index if not exists idx_route_schedules_route_id on public.route_schedules(route_id);
create index if not exists idx_route_schedules_bus_id on public.route_schedules(bus_id);
