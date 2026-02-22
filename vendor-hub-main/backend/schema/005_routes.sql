-- Routes for a transport listing (from → to). Price can override bus base price per seat.
create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  from_place text not null,
  to_place text not null,
  distance_km numeric check (distance_km is null or distance_km >= 0),
  duration_minutes int check (duration_minutes is null or duration_minutes >= 0),
  price_per_seat_cents int check (price_per_seat_cents is null or price_per_seat_cents >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_routes_listing_id on public.routes(listing_id);
