-- Add registration number, manufacturer/model, amenities, and photo URL to buses.
alter table if exists public.buses
  add column if not exists registration_number text,
  add column if not exists manufacturer text,
  add column if not exists model text,
  add column if not exists has_wifi boolean default false,
  add column if not exists has_charging boolean default false,
  add column if not exists has_entertainment boolean default false,
  add column if not exists has_toilet boolean default false,
  add column if not exists photo_url text;

comment on column public.buses.registration_number is 'Official vehicle registration number.';
comment on column public.buses.manufacturer is 'Bus manufacturer (e.g. Volvo, Tata).';
comment on column public.buses.model is 'Model name.';
comment on column public.buses.photo_url is 'URL for bus photo in listings.';
