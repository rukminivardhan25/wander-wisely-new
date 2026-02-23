-- Link bus_schedules to a route (schedule is for this bus on this route).
alter table if exists public.bus_schedules
  add column if not exists route_id uuid references public.routes(id) on delete set null;

-- Allow schedules without date range (recurring by operating days only).
alter table if exists public.bus_schedules alter column start_date drop not null;
alter table if exists public.bus_schedules alter column end_date drop not null;

create index if not exists idx_bus_schedules_route_id on public.bus_schedules(route_id);
comment on column public.bus_schedules.route_id is 'Route this schedule operates on (from→to).';
