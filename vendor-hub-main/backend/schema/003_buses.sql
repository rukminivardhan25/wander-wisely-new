-- 3. buses (only for transport listings; one listing → many buses)
-- id, listing_id, name, bus_type, layout_type, rows, left_cols, right_cols, has_aisle, total_seats, base_price_per_seat_cents, status, created_at, updated_at
create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text not null,
  bus_type text not null check (bus_type in ('seater', 'sleeper', 'semi_sleeper')),
  layout_type text not null check (layout_type in ('2+2', '2+1', 'sleeper', 'custom')),
  rows int not null check (rows >= 1 and rows <= 50),
  left_cols int not null check (left_cols >= 0 and left_cols <= 5),
  right_cols int not null check (right_cols >= 0 and right_cols <= 5),
  has_aisle boolean default true,
  total_seats int not null check (total_seats >= 1 and total_seats <= 100),
  base_price_per_seat_cents int not null default 0 check (base_price_per_seat_cents >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_buses_listing_id on public.buses(listing_id);
