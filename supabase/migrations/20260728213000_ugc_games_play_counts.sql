-- Play / unique-player counters on ugc_games.
-- Client calls record_ugc_play(slug, uid) after ≥10s of continuous play.
-- Anon cannot UPDATE ugc_games (RLS); this SECURITY DEFINER RPC is the write path.

alter table public.ugc_games
  add column if not exists plays bigint not null default 0;

alter table public.ugc_games
  add column if not exists players bigint not null default 0;

comment on column public.ugc_games.plays is
  'Qualified play engagements (≥10s). Incremented by record_ugc_play.';
comment on column public.ugc_games.players is
  'Unique player/device uids with ≥1 qualified play. Incremented by record_ugc_play.';

-- Per-game uniqueness for players (device uid from gs_uid).
create table if not exists public.ugc_game_players (
  game_id uuid not null references public.ugc_games (id) on delete cascade,
  player_uid text not null,
  first_played_at timestamptz not null default now(),
  primary key (game_id, player_uid),
  constraint ugc_game_players_uid_len check (char_length(player_uid) between 1 and 80)
);

create index if not exists ugc_game_players_uid_idx
  on public.ugc_game_players (player_uid);

alter table public.ugc_game_players enable row level security;

-- No direct client access; only the SECURITY DEFINER RPC writes.
revoke all on table public.ugc_game_players from anon, authenticated;

-- Keep cache-busting updated_at stable when only plays/players change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - 'plays' - 'players' - 'updated_at')
         is not distinct from (to_jsonb(old) - 'plays' - 'players' - 'updated_at')
  then
    new.updated_at = old.updated_at;
    return new;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_ugc_play(p_slug text, p_uid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game_id uuid;
  v_inserted int;
begin
  if p_slug is null
     or char_length(p_slug) < 1
     or char_length(p_slug) > 80
  then
    return;
  end if;
  if p_uid is null
     or char_length(p_uid) < 1
     or char_length(p_uid) > 80
  then
    return;
  end if;

  select g.id
  into v_game_id
  from public.ugc_games g
  where g.slug = p_slug
    and g.status in ('published', 'approved')
  limit 1;

  if v_game_id is null then
    return;
  end if;

  update public.ugc_games
  set plays = plays + 1
  where id = v_game_id;

  insert into public.ugc_game_players (game_id, player_uid)
  values (v_game_id, p_uid)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.ugc_games
    set players = players + 1
    where id = v_game_id;
  end if;
end;
$$;

revoke all on function public.record_ugc_play(text, text) from public;
grant execute on function public.record_ugc_play(text, text) to anon, authenticated;
