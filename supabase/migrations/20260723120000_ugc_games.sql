-- UGC game creator schema for Gamescroll
-- Run via Supabase SQL editor or `supabase db push`

create extension if not exists "pgcrypto";

do $$ begin
  create type public.ugc_status as enum ('draft', 'published', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.ugc_games (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  title text not null,
  tip text not null default '',
  accent text not null default '#264653',
  status public.ugc_status not null default 'draft',
  html_path text not null,
  html_url text,
  brief jsonb,
  conversation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  rejection_note text
);

create index if not exists ugc_games_status_idx on public.ugc_games (status);
create index if not exists ugc_games_creator_idx on public.ugc_games (creator_id);
create index if not exists ugc_games_slug_idx on public.ugc_games (slug);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ugc_games_updated_at on public.ugc_games;
create trigger ugc_games_updated_at
  before update on public.ugc_games
  for each row execute function public.set_updated_at();

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.moderators m where m.user_id = auth.uid()
  );
$$;

alter table public.ugc_games enable row level security;
alter table public.moderators enable row level security;

-- Creators manage their own rows (cannot self-approve)
create policy "creators_select_own"
  on public.ugc_games for select
  using (auth.uid() = creator_id);

create policy "public_select_playable"
  on public.ugc_games for select
  using (status in ('published', 'approved'));

create policy "creators_insert_own"
  on public.ugc_games for insert
  with check (auth.uid() = creator_id and status = 'draft');

create policy "creators_update_own_draftish"
  on public.ugc_games for update
  using (
    auth.uid() = creator_id
    and status in ('draft', 'published', 'rejected')
  )
  with check (
    auth.uid() = creator_id
    and status in ('draft', 'published', 'rejected')
  );

create policy "moderators_select_all"
  on public.ugc_games for select
  using (public.is_moderator());

create policy "moderators_update_status"
  on public.ugc_games for update
  using (public.is_moderator())
  with check (public.is_moderator());

create policy "moderators_read_roster"
  on public.moderators for select
  using (auth.uid() = user_id or public.is_moderator());

-- Storage bucket (public read for playable HTML)
insert into storage.buckets (id, name, public)
values ('ugc-games', 'ugc-games', true)
on conflict (id) do update set public = excluded.public;

create policy "ugc_html_public_read"
  on storage.objects for select
  using (bucket_id = 'ugc-games');

create policy "ugc_html_owner_write"
  on storage.objects for insert
  with check (
    bucket_id = 'ugc-games'
    and auth.role() = 'authenticated'
  );

create policy "ugc_html_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'ugc-games'
    and auth.role() = 'authenticated'
  );

create policy "ugc_html_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'ugc-games'
    and auth.role() = 'authenticated'
  );
