import type { Game } from '../games'
import { getSupabase, type UgcGameRow, type UgcStatus } from './supabase'

/** Columns needed to build a playable feed `Game` from a UGC row. */
export const UGC_FEED_COLUMNS =
  'id,slug,title,tip,accent,status,source,html_path,html_url,updated_at,approved_at'

/** Moderation queue — no conversation/brief payload. */
export const UGC_MOD_COLUMNS =
  'id,slug,title,tip,accent,status,source,html_path,html_url,updated_at,published_at'

/** Creator “my games” list — includes chat/brief for resume. */
export const UGC_MY_COLUMNS =
  'id,creator_id,slug,title,tip,accent,status,source,html_path,html_url,brief,conversation,created_at,updated_at,published_at,approved_at,rejection_note'

export function ugcPlayUrl(slug: string, cacheKey?: string | null): string {
  const base = import.meta.env.VITE_SUPABASE_URL
  if (!base) return ''
  const v = cacheKey ? `&v=${encodeURIComponent(cacheKey)}` : ''
  return `${base}/functions/v1/ugc-play?slug=${encodeURIComponent(slug)}${v}`
}

export function ugcRowToGame(row: UgcGameRow): Game {
  // Prefer Edge Function HTML (correct Content-Type). Storage public URLs are
  // often served as text/plain, which browsers render as source instead of a game.
  const bust = row.updated_at || row.id
  const src =
    ugcPlayUrl(row.slug, bust) ||
    row.html_url ||
    (import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ugc-games/${row.html_path}`
      : '')
  return {
    id: row.slug,
    title: row.title,
    tip: row.tip,
    src,
    accent: row.accent,
  }
}

export async function fetchApprovedUgcGames(limit = 40): Promise<Game[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('ugc_games')
    .select(UGC_FEED_COLUMNS)
    .eq('status', 'approved')
    .eq('source', 'user')
    .order('approved_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return (data as UgcGameRow[]).map(ugcRowToGame).filter((g) => g.src)
}

export async function fetchUgcBySlug(
  slug: string,
  statuses: UgcStatus[] = ['published', 'approved'],
): Promise<Game | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('ugc_games')
    .select(UGC_FEED_COLUMNS)
    .eq('slug', slug)
    .in('status', statuses)
    .maybeSingle()
  if (error || !data) return null
  return ugcRowToGame(data as UgcGameRow)
}

export async function fetchMyUgcGames(): Promise<UgcGameRow[]> {
  const sb = getSupabase()
  if (!sb) return []
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return []
  const { data, error } = await sb
    .from('ugc_games')
    .select(UGC_MY_COLUMNS)
    .eq('creator_id', user.id)
    .order('updated_at', { ascending: false })
  if (error || !data) return []
  return data as UgcGameRow[]
}

export async function fetchPublishedForModeration(): Promise<UgcGameRow[]> {
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('ugc_games')
    .select(UGC_MOD_COLUMNS)
    .eq('status', 'published')
    .order('published_at', { ascending: true })
  if (error || !data) return []
  return data as UgcGameRow[]
}

export async function invokeCreator<T = unknown>(
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const sb = getSupabase()
  if (!sb) return { data: null, error: 'Supabase is not configured' }
  const { data, error } = await sb.functions.invoke('creator', { body })
  if (error) {
    let detail = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx) {
      if (ctx.status === 504 || /gateway timeout|504/i.test(detail)) {
        return {
          data: null,
          error:
            'Creator timed out — the game pipeline took too long. Try again, or make a smaller tweak.',
        }
      }
      if (typeof ctx.json === 'function') {
        try {
          const payload = (await ctx.json()) as { error?: string }
          if (payload?.error) detail = payload.error
        } catch {
          /* keep FunctionsHttpError message */
        }
      }
    }
    if (/gateway timeout|504/i.test(detail)) {
      detail =
        'Creator timed out — the game pipeline took too long. Try again, or make a smaller tweak.'
    }
    return { data: null, error: detail }
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { data: null, error: String((data as { error: string }).error) }
  }
  return { data: data as T, error: null }
}
