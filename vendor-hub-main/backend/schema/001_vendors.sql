-- Vendors table for Vendor Hub signup/signin
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  business_name text not null,
  plan text default 'basic' check (plan in ('basic', 'premium', 'enterprise')),
  verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vendors_email on public.vendors(email);
