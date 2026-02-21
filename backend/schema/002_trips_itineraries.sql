-- Trips and itineraries for Plan Trip (Wander Wisely)
-- Run after 001_users.sql.

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  days int not null check (days >= 1 and days <= 30),
  budget text not null check (budget in ('Budget', 'Medium', 'Luxury')),
  travel_type text not null check (travel_type in ('Solo', 'Couple', 'Family', 'Friends')),
  interests text[] default '{}',
  transport_preference text check (transport_preference in ('Flight', 'Train', 'Bus', 'Car')),
  status text default 'draft' check (status in ('draft', 'generating', 'ready', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_trips_user_id on public.trips(user_id);
create index if not exists idx_trips_created_at on public.trips(created_at desc);

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_number int not null check (day_number >= 1),
  content jsonb not null default '{}',
  created_at timestamptz default now(),
  unique(trip_id, day_number)
);

create index if not exists idx_itineraries_trip_id on public.itineraries(trip_id);
