-- Add base_price_per_seat_cents to buses if missing (for DBs created before it was in 003)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'buses' and column_name = 'base_price_per_seat_cents'
  ) then
    alter table public.buses add column base_price_per_seat_cents int not null default 0 check (base_price_per_seat_cents >= 0);
  end if;
end $$;
