-- Users table for signup/signin (Wander Wisely)
-- Run this first; add trips, posts, etc. later.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_users_email on public.users(email);
