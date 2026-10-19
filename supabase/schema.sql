-- PrepSage JAMB per-student database foundation
-- Run in Supabase SQL Editor for project ujeyybdabqudzgvjbpiv.
-- Every student-owned row is isolated by auth.uid() via RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('Use of English','Biology','Chemistry','Physics')),
  topic_id text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (subject in ('Use of English','Biology','Chemistry','Physics','Mixed')),
  topic_id text,
  quiz_type text not null default 'topic' check (quiz_type in ('topic','mock')),
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  mistakes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text check (subject is null or subject in ('Use of English','Biology','Chemistry','Physics')),
  topic_id text,
  minutes integer not null check (minutes > 0 and minutes <= 1440),
  notes text not null default '',
  studied_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_minutes integer check (target_minutes is null or target_minutes > 0),
  target_date date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text check (subject is null or subject in ('Use of English','Biology','Chemistry','Physics')),
  topic_id text,
  planned_date date not null,
  start_time time,
  duration_minutes integer not null default 30 check (duration_minutes > 0 and duration_minutes <= 720),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.study_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  subject text check (subject is null or subject in ('Use of English','Biology','Chemistry','Physics')),
  resource_type text not null default 'link' check (resource_type in ('link','note','file')),
  url text,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists topic_progress_user_idx on public.topic_progress(user_id);
create index if not exists quiz_attempts_user_date_idx on public.quiz_attempts(user_id, created_at desc);
create index if not exists study_sessions_user_date_idx on public.study_sessions(user_id, studied_on desc);
create index if not exists study_goals_user_idx on public.study_goals(user_id, completed);
create index if not exists study_plan_user_date_idx on public.study_plan_items(user_id, planned_date);
create index if not exists study_resources_user_idx on public.study_resources(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.topic_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_goals enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.study_resources enable row level security;

-- Users can read and update only their own profile. Role changes are intentionally
-- excluded from the update policy by the column-level grant below.
drop policy if exists "Students read own profile" on public.profiles;
create policy "Students read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Students update own profile" on public.profiles;
create policy "Students update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

drop policy if exists "Users manage own topic progress" on public.topic_progress;
create policy "Users manage own topic progress" on public.topic_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own quiz attempts" on public.quiz_attempts;
create policy "Users manage own quiz attempts" on public.quiz_attempts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own study sessions" on public.study_sessions;
create policy "Users manage own study sessions" on public.study_sessions for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own study goals" on public.study_goals;
create policy "Users manage own study goals" on public.study_goals for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own study plan" on public.study_plan_items;
create policy "Users manage own study plan" on public.study_plan_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own resources" on public.study_resources;
create policy "Users manage own resources" on public.study_resources for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Create a student profile automatically when an Auth account is created.
create or replace function public.handle_new_prep_sage_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_prep_sage_user_created on auth.users;
create trigger on_prep_sage_user_created
after insert on auth.users
for each row execute procedure public.handle_new_prep_sage_user();

-- Important: role is never copied from user-editable metadata.
-- Promote the trusted owner to admin manually in SQL after their Auth account exists:
-- update public.profiles set role = 'admin' where id = '<owner-auth-user-uuid>';

-- Single versioned snapshot used to synchronise the existing study app across devices.
create table if not exists public.student_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.student_state enable row level security;
drop policy if exists "Users manage own synced state" on public.student_state;
create policy "Users manage own synced state" on public.student_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Explicit Data API privileges; RLS policies above still decide which rows are visible.
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;
grant select, insert, update, delete on public.topic_progress to authenticated;
grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select, insert, update, delete on public.study_goals to authenticated;
grant select, insert, update, delete on public.study_plan_items to authenticated;
grant select, insert, update, delete on public.study_resources to authenticated;
grant select, insert, update, delete on public.student_state to authenticated;
