-- Active trip: one trip per user can be "active" (confirmed as My Trip).
-- Run after 002_trips_itineraries.sql.

-- Allow status 'active' in addition to draft, generating, ready, failed
alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips add constraint trips_status_check
  check (status in ('draft', 'generating', 'ready', 'failed', 'active'));

-- When user clicks "Make This My Trip", we set selected_at and status = 'active'
alter table public.trips add column if not exists selected_at timestamptz default null;

create index if not exists idx_trips_user_status on public.trips(user_id, status) where status = 'active';
