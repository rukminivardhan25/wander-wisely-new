-- Add bus number and AC/Non-AC to buses.
alter table if exists public.buses
  add column if not exists bus_number text,
  add column if not exists ac_type text default 'non_ac' check (ac_type in ('ac', 'non_ac'));

comment on column public.buses.bus_number is 'Registration or display number of the bus (e.g. AP 28 AB 1234).';
comment on column public.buses.ac_type is 'ac or non_ac.';
