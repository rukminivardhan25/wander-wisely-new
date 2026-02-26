-- App feedback (reviews and complaints) from users, visible to admin.
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  type text not null check (type in ('review', 'complaint')),
  message text,
  created_at timestamptz default now()
);

create index if not exists idx_app_feedback_user_id on public.app_feedback(user_id);
create index if not exists idx_app_feedback_created_at on public.app_feedback(created_at);
