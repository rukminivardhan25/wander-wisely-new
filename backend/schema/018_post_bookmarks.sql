-- User bookmarks for posts. Run after 017_posts_community.sql.

create table if not exists public.post_bookmarks (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists idx_post_bookmarks_user_id on public.post_bookmarks(user_id);
