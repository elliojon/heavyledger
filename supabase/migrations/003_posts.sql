-- Heavy Ledger — Writing: posts with images, video and audio. Run after 002. Safe to re-run.

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author        uuid not null default auth.uid() references auth.users on delete cascade,
  slug          text not null check (slug ~ '^[a-z0-9-]{1,80}$'),
  kind          text not null default 'article' check (kind in ('article','field_note','case_study','program','research')),
  title         text not null default '' check (char_length(title) <= 200),
  subtitle      text check (char_length(subtitle) <= 300),
  cover_url     text,
  body_html     text not null default '',
  excerpt       text,
  workout_id    text,          -- optional: the logged session this post is about
  status        text not null default 'draft' check (status in ('draft','published')),
  visibility    text not null default 'public' check (visibility in ('public','connections')),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (author, slug)
);
alter table public.posts add column if not exists workout_id text;
create index if not exists posts_published on public.posts (status, published_at desc);
alter table public.posts enable row level security;
drop policy if exists "Published posts are readable" on public.posts;
create policy "Published posts are readable" on public.posts
  for select using (
    author = auth.uid()
    or (status = 'published' and (visibility = 'public' or public.are_connected(auth.uid(), author)))
  );
drop policy if exists "Write your own posts" on public.posts;
create policy "Write your own posts" on public.posts for insert with check (author = auth.uid());
drop policy if exists "Edit your own posts" on public.posts;
create policy "Edit your own posts" on public.posts for update using (author = auth.uid()) with check (author = auth.uid());
drop policy if exists "Delete your own posts" on public.posts;
create policy "Delete your own posts" on public.posts for delete using (author = auth.uid());

-- Media for posts: images, short videos and audio (50 MB per file, the free-plan limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm'])
on conflict (id) do nothing;
drop policy if exists "Upload own post media" on storage.objects;
create policy "Upload own post media" on storage.objects
  for insert to authenticated with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Read own post media" on storage.objects;
create policy "Read own post media" on storage.objects
  for select to authenticated using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Delete own post media" on storage.objects;
create policy "Delete own post media" on storage.objects
  for delete to authenticated using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
