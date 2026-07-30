-- Creator Edge run logs (service-role inserts from creator function).
-- Lets us diagnose smoke/quality failures like "c is not defined".

create table if not exists public.creator_run_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  game_id uuid,
  slug text,
  event text not null,
  phase text,
  mechanic text,
  build_path text,
  ok boolean,
  errors text[] not null default '{}',
  duration_ms integer,
  user_prompt text,
  body_js text,
  props jsonb not null default '{}'::jsonb
);

create index if not exists creator_run_logs_created_at_idx
  on public.creator_run_logs (created_at desc);

create index if not exists creator_run_logs_event_idx
  on public.creator_run_logs (event);

create index if not exists creator_run_logs_user_idx
  on public.creator_run_logs (user_id, created_at desc);

create index if not exists creator_run_logs_ok_idx
  on public.creator_run_logs (ok, created_at desc)
  where ok is not null;

alter table public.creator_run_logs enable row level security;

-- No anon/authenticated inserts — Edge uses service role (bypasses RLS).

drop policy if exists "creators_select_own_run_logs" on public.creator_run_logs;
create policy "creators_select_own_run_logs"
  on public.creator_run_logs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "moderators_select_creator_run_logs" on public.creator_run_logs;
create policy "moderators_select_creator_run_logs"
  on public.creator_run_logs for select
  to authenticated
  using (public.is_moderator());
