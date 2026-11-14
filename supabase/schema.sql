-- Heavy Ledger — training log + profiles
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Every table uses row-level security: people can only read and write their own rows,
-- except profiles (public) and workouts explicitly marked public.

-- Profiles -------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name  text,
  bio           text,
  location      text,
  featured      jsonb not null default '[]'::jsonb,   -- snapshot of lifts the person chose to show
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "Profiles are public" on public.profiles;
create policy "Profiles are public" on public.profiles for select using (true);
drop policy if exists "Create own profile" on public.profiles;
create policy "Create own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Workouts (one row per logged session; the session itself is stored as JSON) --------
create table if not exists public.workouts (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  id          text not null,
  date        date not null,
  visibility  text not null default 'private' check (visibility in ('private','connections','public')),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workouts_user_date on public.workouts (user_id, date desc);
alter table public.workouts enable row level security;
drop policy if exists "Own workouts" on public.workouts;
create policy "Own workouts" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Public workouts are readable" on public.workouts;
create policy "Public workouts are readable" on public.workouts for select using (visibility = 'public');
-- 'connections' is stored now and enforced once connections exist; until then it behaves like private.

-- Programs (planned sessions) ------------------------------------------------
create table if not exists public.programs (
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  id          text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.programs enable row level security;
drop policy if exists "Own programs" on public.programs;
create policy "Own programs" on public.programs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Per-person state: settings, goals, the session in progress ----------------
create table if not exists public.user_state (
  user_id     uuid primary key default auth.uid() references auth.users on delete cascade,
  settings    jsonb,
  goals       jsonb,
  draft       jsonb,
  updated_at  timestamptz not null default now()
);
alter table public.user_state enable row level security;
drop policy if exists "Own state" on public.user_state;
create policy "Own state" on public.user_state for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
