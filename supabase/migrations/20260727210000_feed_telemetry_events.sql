-- Anonymous Phase 1 feed telemetry (sparse client batches).
-- Inserts allowed for anon/authenticated; reads limited to moderators.

create table if not exists public.feed_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  session_id text not null,
  event text not null,
  props jsonb not null default '{}'::jsonb,
  build_id text,
  created_at timestamptz not null default now()
);

create index if not exists feed_telemetry_events_created_at_idx
  on public.feed_telemetry_events (created_at desc);

create index if not exists feed_telemetry_events_event_idx
  on public.feed_telemetry_events (event);

alter table public.feed_telemetry_events enable row level security;

drop policy if exists "anon_insert_feed_telemetry" on public.feed_telemetry_events;
create policy "anon_insert_feed_telemetry"
  on public.feed_telemetry_events for insert
  to anon, authenticated
  with check (
    char_length(event) between 1 and 64
    and char_length(uid) between 1 and 80
    and char_length(session_id) between 1 and 80
  );

drop policy if exists "moderators_select_feed_telemetry" on public.feed_telemetry_events;
create policy "moderators_select_feed_telemetry"
  on public.feed_telemetry_events for select
  to authenticated
  using (public.is_moderator());
