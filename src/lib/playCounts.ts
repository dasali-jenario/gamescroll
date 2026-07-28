import { ensureAnonymousUid } from '../metrics'
import { getSupabase } from './supabase'

/** Wall-clock engagement required before a play counts toward plays/players. */
export const QUALIFIED_PLAY_MS = 10_000

/**
 * Fire-and-forget: bump `ugc_games.plays` and (once per uid) `players`
 * via the `record_ugc_play` SECURITY DEFINER RPC.
 */
export function recordQualifiedPlay(slug: string): void {
  const trimmed = slug.trim()
  if (!trimmed) return
  const sb = getSupabase()
  if (!sb) return
  const uid = ensureAnonymousUid()
  void sb
    .rpc('record_ugc_play', { p_slug: trimmed, p_uid: uid })
    .then(({ error }) => {
      if (error && import.meta.env.DEV) {
        console.warn('[playCounts]', error.message)
      }
    })
}
