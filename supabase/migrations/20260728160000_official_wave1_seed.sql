-- Seed Orb Merge + Wave 1 official catalog games (idempotent on slug).
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
  (null, 'orbmerge', 'Orb Merge', 'Drag to aim, release to drop. Merge matches.', '#ffcc33', 'approved', 'official', 'official/orbmerge.html', null, now(), now()),
  (null, 'taprotate', 'Tap Rotate', 'Tap to shoot. Hold to spin.', '#ff3d68', 'approved', 'official', 'official/taprotate.html', null, now(), now()),
  (null, 'hueblaster', 'Hue Blaster', 'Shoot matching colors only.', '#22ffaa', 'approved', 'official', 'official/hueblaster.html', null, now(), now()),
  (null, 'oneshot', 'One Shot', 'One bullet. Bank off walls.', '#ffd166', 'approved', 'official', 'official/oneshot.html', null, now(), now()),
  (null, 'chainblast', 'Chain Blast', 'Tap a bubble to start a chain.', '#ff6600', 'approved', 'official', 'official/chainblast.html', null, now(), now()),
  (null, 'popshot', 'Pop Shot', 'Aim and pop three-of-a-kind.', '#00ccff', 'approved', 'official', 'official/popshot.html', null, now(), now()),
  (null, 'cryptrun', 'Crypt Run', 'Tap to jump. Double-tap in air.', '#ff5722', 'approved', 'official', 'official/cryptrun.html', null, now(), now()),
  (null, 'starvoid', 'Star Void', 'Drag to move. Survive the swarm.', '#ff3366', 'approved', 'official', 'official/starvoid.html', null, now(), now()),
  (null, 'pegdrop', 'Peg Drop', 'Aim and drop through the pegs.', '#ff44ff', 'approved', 'official', 'official/pegdrop.html', null, now(), now()),
  (null, 'neondash', 'Neon Dash', 'Tap jump. Swipe down to slide.', '#ff2d78', 'approved', 'official', 'official/neondash.html', null, now(), now()),
  (null, 'nighttreads', 'Night Treads', 'Drag to aim. Hold the line.', '#ffd166', 'approved', 'official', 'official/nighttreads.html', null, now(), now())
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
