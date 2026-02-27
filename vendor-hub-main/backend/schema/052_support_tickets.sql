-- Vendor support tickets (from Partner Portal Support page). Admin can view and reply.
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null,
  subject text not null,
  message text not null,
  created_at timestamptz default now(),
  admin_reply text,
  admin_replied_at timestamptz
);

create index if not exists idx_support_tickets_vendor_id on public.support_tickets(vendor_id);
create index if not exists idx_support_tickets_created_at on public.support_tickets(created_at);
