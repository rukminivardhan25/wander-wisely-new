-- Per-listing availability by date (available / cancelled / holiday).
create table if not exists public.listing_availability (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  date date not null,
  status text not null check (status in ('available', 'cancelled', 'holiday')),
  note text,
  created_at timestamptz default now(),
  unique(listing_id, date)
);

create index if not exists idx_listing_availability_listing_date on public.listing_availability(listing_id, date);
