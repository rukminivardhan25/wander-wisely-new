-- Add person-level name and phone to vendors (Vendor = Person).
-- business_name retained for company/brand display; name = person name.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vendors' and column_name = 'name') then
    alter table public.vendors add column name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'vendors' and column_name = 'phone') then
    alter table public.vendors add column phone text;
  end if;
end $$;
