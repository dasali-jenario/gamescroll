-- Seed Wave 3 official games (idempotent on slug).
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
  (null, 'simonseq', 'Simon Sequence', 'Watch the pattern. Repeat it.', '#ff2e63', 'approved', 'official', 'official/simonseq.html', null, now(), now()),
  (null, 'molewhack', 'Mole Whack', 'Tap moles before they duck.', '#f4a261', 'approved', 'official', 'official/molewhack.html', null, now(), now()),
  (null, 'reactflash', 'React Flash', 'Wait for green. Tap fast. No early taps.', '#34d399', 'approved', 'official', 'official/reactflash.html', null, now(), now()),
  (null, 'mashmeter', 'Mash Meter', 'Tap as fast as you can for 8 seconds.', '#a78bfa', 'approved', 'official', 'official/mashmeter.html', null, now(), now()),
  (null, 'targetdrop', 'Target Drop', 'Tap falling targets. Miss three and you lose.', '#f72585', 'approved', 'official', 'official/targetdrop.html', null, now(), now()),
  (null, 'orbchain', 'Orb Chain', 'Tap your cells. Fill to explode and take the board.', '#22ddff', 'approved', 'official', 'official/orbchain.html', null, now(), now()),
  (null, 'skewkeep', 'Skew Keep', 'Tap left/right to keep the bar level.', '#fb923c', 'approved', 'official', 'official/skewkeep.html', null, now(), now())
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
