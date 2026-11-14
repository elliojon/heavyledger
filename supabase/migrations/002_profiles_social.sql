-- Heavy Ledger — profile details, connections, testimonials, profile photos.
-- Run after schema.sql (SQL Editor → New query → paste → Run). Safe to re-run.

-- Profile details --------------------------------------------------------------
alter table public.profiles
  add column if not exists headline       text,
  add column if not exists avatar_url     text,
  add column if not exists banner_url     text,
  add column if not exists credentials    jsonb not null default '[]'::jsonb,  -- [{type, title, org, year}]
  add column if not exists is_coach       boolean not null default false,
  add column if not exists coaching_since int,
  add column if not exists training_since int,
  add column if not exists unit           text not null default 'kg';
alter table public.profiles drop constraint if exists profiles_unit_check;
alter table public.profiles add constraint profiles_unit_check check (unit in ('kg','lb'));

-- Connections (two-way: one person asks, the other accepts) -----------------------
create table if not exists public.connections (
  requester    uuid not null default auth.uid() references auth.users on delete cascade,
  addressee    uuid not null references auth.users on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);
create unique index if not exists connections_pair on public.connections (least(requester, addressee), greatest(requester, addressee));
alter table public.connections enable row level security;
drop policy if exists "Accepted connections are public; requests visible to both people" on public.connections;
create policy "Accepted connections are public; requests visible to both people" on public.connections
  for select using (status = 'accepted' or auth.uid() in (requester, addressee));
drop policy if exists "Send a request as yourself" on public.connections;
create policy "Send a request as yourself" on public.connections
  for insert with check (requester = auth.uid() and status = 'pending');
drop policy if exists "Only the person asked can accept" on public.connections;
create policy "Only the person asked can accept" on public.connections
  for update using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "Either person can remove" on public.connections;
create policy "Either person can remove" on public.connections
  for delete using (auth.uid() in (requester, addressee));

create or replace function public.are_connected(a uuid, b uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

-- Sessions marked "connections" are now readable by connections
drop policy if exists "Connections can read connections-only workouts" on public.workouts;
create policy "Connections can read connections-only workouts" on public.workouts
  for select using (visibility = 'connections' and public.are_connected(auth.uid(), user_id));

-- Testimonials (written by anyone signed in; shown only after the coach approves) ----
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  subject       uuid not null references auth.users on delete cascade,
  author        uuid not null default auth.uid() references auth.users on delete cascade,
  relationship  text check (char_length(relationship) <= 120),
  body          text not null check (char_length(body) between 10 and 2000),
  status        text not null default 'pending' check (status in ('pending','approved','hidden')),
  created_at    timestamptz not null default now(),
  check (author <> subject)
);
create unique index if not exists testimonials_one_per_author on public.testimonials (subject, author);
alter table public.testimonials enable row level security;
drop policy if exists "Approved testimonials are public" on public.testimonials;
create policy "Approved testimonials are public" on public.testimonials
  for select using (status = 'approved' or auth.uid() in (subject, author));
drop policy if exists "Write a testimonial as yourself" on public.testimonials;
create policy "Write a testimonial as yourself" on public.testimonials
  for insert with check (author = auth.uid() and status = 'pending');
drop policy if exists "Coach approves or hides" on public.testimonials;
create policy "Coach approves or hides" on public.testimonials
  for update using (subject = auth.uid()) with check (subject = auth.uid());
drop policy if exists "Coach or author can delete" on public.testimonials;
create policy "Coach or author can delete" on public.testimonials
  for delete using (auth.uid() in (subject, author));
-- The coach may change only the status, never the words.
revoke update on public.testimonials from anon, authenticated;
grant update (status) on public.testimonials to authenticated;

-- Profile photos and banners ----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "Upload own profile media" on storage.objects;
create policy "Upload own profile media" on storage.objects
  for insert to authenticated with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Read own profile media" on storage.objects;
create policy "Read own profile media" on storage.objects
  for select to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Delete own profile media" on storage.objects;
create policy "Delete own profile media" on storage.objects
  for delete to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
