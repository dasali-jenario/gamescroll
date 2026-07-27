-- Distinguish official (Gamescroll) catalog games from user-created UGC.
-- Official rows may have a null creator_id.

do $$ begin
  create type public.ugc_source as enum ('official', 'user');
exception
  when duplicate_object then null;
end $$;

alter table public.ugc_games
  alter column creator_id drop not null;

alter table public.ugc_games
  add column if not exists source public.ugc_source not null default 'user';

-- Backfill any existing rows that somehow lack source (column default covers inserts)
update public.ugc_games
set source = 'user'
where source is null;

alter table public.ugc_games
  drop constraint if exists ugc_games_source_creator_chk;

alter table public.ugc_games
  add constraint ugc_games_source_creator_chk check (
    (source = 'official' and creator_id is null)
    or (source = 'user' and creator_id is not null)
  );

create index if not exists ugc_games_source_idx on public.ugc_games (source);

-- Seed official catalog games (idempotent on slug).
-- html_path points at Storage objects uploaded by scripts/seed-official-games.mjs
insert into public.ugc_games (
  creator_id,
  slug,
  title,
  tip,
  accent,
  status,
  source,
  html_path,
  html_url,
  published_at,
  approved_at
)
values
  (null, 'pong', 'Pocket Pong', 'Drag to keep the ball bouncing', '#1b4332', 'approved', 'official', 'official/pong.html', null, now(), now()),
  (null, 'flappy', 'Flappy', 'Tap to stay airborne', '#2d6a4f', 'approved', 'official', 'official/flappy.html', null, now(), now()),
  (null, 'fish', 'Tiny Fish', 'Hold to swim up through coral, release to dive', '#0077b6', 'approved', 'official', 'official/fish.html', null, now(), now()),
  (null, 'lanes', 'Lane Switch', 'Tap to switch lanes', '#1d3557', 'approved', 'official', 'official/lanes.html', null, now(), now()),
  (null, 'stack', 'Falling Stack', 'Tap to drop the moving block', '#7b2d26', 'approved', 'official', 'official/stack.html', null, now(), now()),
  (null, 'ski', 'Endless Ski', 'Slide to dodge trees', '#457b9d', 'approved', 'official', 'official/ski.html', null, now(), now()),
  (null, 'gravity', 'Gravity Flip', 'Tap to flip floor and ceiling', '#3d405b', 'approved', 'official', 'official/gravity.html', null, now(), now()),
  (null, 'bubbles', 'Bubble Pressure', 'Pop bubbles, avoid hearts', '#0077b6', 'approved', 'official', 'official/bubbles.html', null, now(), now()),
  (null, 'road', 'Stay on the Road', 'Drag to stay on the winding road', '#264653', 'approved', 'official', 'official/road.html', null, now(), now()),
  (null, 'balloon', 'Balloon Tap', 'Tap the balloon to keep it up', '#e76f51', 'approved', 'official', 'official/balloon.html', null, now(), now()),
  (null, 'colour', 'Colour Gate', 'Tap to match the next gate', '#9b2226', 'approved', 'official', 'official/colour.html', null, now(), now()),
  (null, 'doodle', 'Endless Doodle Jump', 'Tilt sideways between platforms', '#2a9d8f', 'approved', 'official', 'official/doodle.html', null, now(), now()),
  (null, 'tunnel', 'Tunnel Drift', 'Drag through the moving tunnel', '#023e8a', 'approved', 'official', 'official/tunnel.html', null, now(), now()),
  (null, 'pulse', 'Perfect Pulse', 'Tap when the rings overlap', '#5e548e', 'approved', 'official', 'official/pulse.html', null, now(), now()),
  (null, 'snake', 'Snake Lite', 'Swipe to turn toward dots', '#386641', 'approved', 'official', 'official/snake.html', null, now(), now()),
  (null, 'cross', 'Cross Forever', 'Tap to hop across lanes', '#6c584c', 'approved', 'official', 'official/cross.html', null, now(), now()),
  (null, 'catch', 'Catch or Dodge', 'Catch friends, dodge threats', '#3c096c', 'approved', 'official', 'official/catch.html', null, now(), now()),
  (null, 'ridge', 'Rolling Ridge', 'Steer along the narrow ridge', '#582f0e', 'approved', 'official', 'official/ridge.html', null, now(), now()),
  (null, 'wall', 'Wall Bounce', 'Tap to bounce between walls', '#bc4749', 'approved', 'official', 'official/wall.html', null, now(), now()),
  (null, 'dance', 'Two-Dot Dance', 'Tap to reverse the spin', '#7209b7', 'approved', 'official', 'official/dance.html', null, now(), now()),
  (null, 'balance', 'Keep It Balanced', 'Tilt to keep the ball on', '#b08968', 'approved', 'official', 'official/balance.html', null, now(), now()),
  (null, 'shapes', 'Shape Squeeze', 'Tap to match the next hole', '#d62828', 'approved', 'official', 'official/shapes.html', null, now(), now()),
  (null, 'rain', 'Rain Dodger', 'Drag sideways under the rain', '#415a77', 'approved', 'official', 'official/rain.html', null, now(), now()),
  (null, 'magnet', 'Magnet Flip', 'Tap to reverse polarity', '#9d4edd', 'approved', 'official', 'official/magnet.html', null, now(), now()),
  (null, 'breakout', 'Mini Breakout', 'Bounce through endless bricks', '#e9c46a', 'approved', 'official', 'official/breakout.html', null, now(), now()),
  (null, 'slicer', 'Shape Slicer', 'Draw a line to split the shape 50/50', '#ff6d00', 'approved', 'official', 'official/slicer.html', null, now(), now())
on conflict (slug) do update set
  title = excluded.title,
  tip = excluded.tip,
  accent = excluded.accent,
  status = excluded.status,
  source = 'official',
  creator_id = null,
  html_path = excluded.html_path,
  published_at = coalesce(public.ugc_games.published_at, excluded.published_at),
  approved_at = coalesce(public.ugc_games.approved_at, excluded.approved_at),
  updated_at = now()
where public.ugc_games.source = 'official';
-- If a user row already owns a catalog slug, the insert is skipped (conflict + WHERE).
