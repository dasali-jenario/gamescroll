import type { Game } from '../games'
import { getSupabase, type UgcGameRow, type UgcStatus } from './supabase'

export function ugcRowToGame(row: UgcGameRow): Game {
  const src =
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
    .select('*')
    .eq('status', 'approved')
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
    .select('*')
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
    .select('*')
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
    .select('*')
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
    if (ctx && typeof ctx.json === 'function') {
      try {
        const payload = (await ctx.json()) as { error?: string }
        if (payload?.error) detail = payload.error
      } catch {
        /* keep FunctionsHttpError message */
      }
    }
    return { data: null, error: detail }
  }
  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    return { data: null, error: String((data as { error: string }).error) }
  }
  return { data: data as T, error: null }
}
