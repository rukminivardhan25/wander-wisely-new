-- Community: posts, comments, likes. Run after 001_users.sql.

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  location text not null,
  image_url text not null,
  caption text,
  tags text[] default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_post_id on public.comments(post_id);

create table if not exists public.post_likes (
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create index if not exists idx_post_likes_post_id on public.post_likes(post_id);
