-- Seed Wave 2 official puzzle catalog games (idempotent on slug).
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
  (null, 'tilemerge', 'Tile Merge', 'Swipe to slide. Merge equals.', '#e94560', 'approved', 'official', 'official/tilemerge.html', null, now(), now()),
  (null, 'minesweep', 'Mine Sweep', 'Tap dig. Long-press to flag.', '#66c0f4', 'approved', 'official', 'official/minesweep.html', null, now(), now()),
  (null, 'memmatch', 'Memory Match', 'Tap two cards. Match the pairs.', '#ff6bcb', 'approved', 'official', 'official/memmatch.html', null, now(), now()),
  (null, 'slide15', 'Slide Fifteen', 'Tap a tile beside the gap.', '#e94560', 'approved', 'official', 'official/slide15.html', null, now(), now()),
  (null, 'gemcascade', 'Gem Cascade', 'Swap neighbors. Match 3+. Beat the clock.', '#ff44aa', 'approved', 'official', 'official/gemcascade.html', null, now(), now()),
  (null, 'colorflow', 'Color Pour', 'Tap a tube, then another to pour.', '#f0b429', 'approved', 'official', 'official/colorflow.html', null, now(), now()),
  (null, 'blockfit', 'Block Fit', 'Drag pieces onto the grid. Clear lines.', '#60a5fa', 'approved', 'official', 'official/blockfit.html', null, now(), now())
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
