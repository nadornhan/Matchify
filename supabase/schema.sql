-- Matchify Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Users (custom auth — mirrors matchifyUsers in localStorage)
create table if not exists public.users (
  id text primary key,
  name text not null default '',
  email text not null unique,
  password text not null,
  role text not null check (role in ('Candidate', 'Employer')),
  company text not null default '',
  membership boolean not null default false,
  contact_email text,
  company_website text,
  company_industry text,
  company_size text,
  company_location text,
  company_description text,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.candidates (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  contact text not null default '',
  education text not null default '',
  major text not null default '',
  university text not null default '',
  experience numeric not null default 0,
  skills jsonb not null default '[]'::jsonb,
  licenses jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  preferred_work_mode text not null default '',
  preferred_location text not null default '',
  work_experience jsonb not null default '[]'::jsonb,
  certificate_file_name text not null default '',
  resume_file_name text not null default ''
);

create table if not exists public.jobs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  company text not null default '',
  description text not null default '',
  required_education text not null default '',
  required_experience numeric not null default 0,
  required_skills jsonb not null default '[]'::jsonb,
  work_mode text not null default '',
  job_type text not null default '',
  location text not null default '',
  salary_min numeric,
  salary_max numeric,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.applications (
  id text primary key,
  candidate_user_id text not null references public.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  status text not null default 'applied',
  employer_status text,
  viewed_by_employer boolean not null default false,
  candidate_archived boolean not null default false,
  events jsonb not null default '[]'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.interviews (
  id text primary key,
  employer_user_id text not null references public.users(id) on delete cascade,
  candidate_user_id text not null references public.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  title text not null,
  date_time text not null,
  duration_minutes integer not null default 60,
  meeting_type text not null default 'google_meet',
  meeting_link text not null default '',
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.messages (
  id text primary key,
  thread_id text not null,
  from_user_id text not null references public.users(id) on delete cascade,
  to_user_id text not null references public.users(id) on delete cascade,
  job_id text references public.jobs(id) on delete set null,
  body text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint,
  read boolean not null default false,
  system boolean not null default false
);

create table if not exists public.companies (
  id text primary key,
  name text not null,
  color text not null default '#2250f4',
  industry text not null default '',
  seeded_rating numeric,
  seeded_reviews_count integer,
  salaries_count integer,
  questions_count integer,
  mock_open_jobs integer,
  description text not null default '',
  why_join_us text not null default '',
  detailed_ratings jsonb not null default '{}'::jsonb,
  saying jsonb not null default '{}'::jsonb,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.reviews (
  id text primary key,
  company_name text not null,
  author_name text,
  rating integer not null,
  title text not null default '',
  position text not null default '',
  location text not null default '',
  body text not null default '',
  likes integer not null default 0,
  dislikes integer not null default 0,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.sourcing (
  id text primary key,
  employer_user_id text not null references public.users(id) on delete cascade,
  candidate_user_id text not null references public.users(id) on delete cascade,
  job_id text not null references public.jobs(id) on delete cascade,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create table if not exists public.integrations (
  user_id text primary key,
  settings jsonb not null default '{}'::jsonb
);

-- Demo / development RLS: allow anon access (tighten for production)
alter table public.users enable row level security;
alter table public.candidates enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.interviews enable row level security;
alter table public.messages enable row level security;
alter table public.companies enable row level security;
alter table public.reviews enable row level security;
alter table public.sourcing enable row level security;
alter table public.integrations enable row level security;

create policy "matchify_anon_all_users" on public.users for all using (true) with check (true);
create policy "matchify_anon_all_candidates" on public.candidates for all using (true) with check (true);
create policy "matchify_anon_all_jobs" on public.jobs for all using (true) with check (true);
create policy "matchify_anon_all_applications" on public.applications for all using (true) with check (true);
create policy "matchify_anon_all_interviews" on public.interviews for all using (true) with check (true);
create policy "matchify_anon_all_messages" on public.messages for all using (true) with check (true);
create policy "matchify_anon_all_companies" on public.companies for all using (true) with check (true);
create policy "matchify_anon_all_reviews" on public.reviews for all using (true) with check (true);
create policy "matchify_anon_all_sourcing" on public.sourcing for all using (true) with check (true);
create policy "matchify_anon_all_integrations" on public.integrations for all using (true) with check (true);
