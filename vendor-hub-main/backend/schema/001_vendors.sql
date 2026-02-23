-- 1. vendors (Vendor = person)
-- id, name, email, phone, password_hash, created_at, updated_at
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  password_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vendors_email on public.vendors(email);
