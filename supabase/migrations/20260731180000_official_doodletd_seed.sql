-- Seed Doodle Defense official game (idempotent on slug).
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
  (null, 'doodletd', 'Doodle Defense', 'Place Pencil, Marker, or Ink Blot. Stop the scribbles!', '#2c2416', 'approved', 'official', 'official/doodletd.html', null, now(), now())
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
