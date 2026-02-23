-- Add start date and end date for journey (optional; when null, schedule is recurring by time only).
alter table if exists public.route_schedules
  add column if not exists start_date date,
  add column if not exists end_date date;

comment on column public.route_schedules.start_date is 'Journey start date (optional). When set with departure_time gives full start date+time.';
comment on column public.route_schedules.end_date is 'Journey end date (optional). When set with arrival_time gives full end date+time.';
