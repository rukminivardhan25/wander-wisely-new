-- Admin reply to app feedback (complaints/reviews).
alter table public.app_feedback
  add column if not exists admin_reply text,
  add column if not exists admin_replied_at timestamptz;
