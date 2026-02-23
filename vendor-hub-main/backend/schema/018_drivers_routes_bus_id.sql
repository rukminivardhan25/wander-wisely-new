-- Link drivers and routes to a specific bus (optional).
alter table if exists public.drivers
  add column if not exists bus_id uuid references public.buses(id) on delete set null;
alter table if exists public.routes
  add column if not exists bus_id uuid references public.buses(id) on delete set null;

create index if not exists idx_drivers_bus_id on public.drivers(bus_id);
create index if not exists idx_routes_bus_id on public.routes(bus_id);

comment on column public.drivers.bus_id is 'When set, this driver is assigned to this bus.';
comment on column public.routes.bus_id is 'When set, this route is operated by this bus (price is per seat for this bus on this route).';
