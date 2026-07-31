const STORAGE_KEY = 'gs_likes'

/** Ordered list of liked game ids (newest first). */
export type LikedIds = string[]

function readAll(): LikedIds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const value of parsed) {
      if (typeof value !== 'string') continue
      const id = value.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(id)
    }
    return out
  } catch {
    return []
  }
}

function writeAll(ids: LikedIds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

/** Load persisted liked game ids (newest first). */
export function loadLikedIds(): LikedIds {
  return readAll()
}

export function isLiked(gameId: string, ids: LikedIds = readAll()): boolean {
  return ids.includes(gameId)
}

/**
 * Toggle like for a game id. Liked ids are stored newest-first.
 * Returns the updated list.
 */
export function toggleLikedId(gameId: string): LikedIds {
  const id = gameId.trim()
  if (!id) return readAll()
  const prev = readAll()
  const next = prev.includes(id)
    ? prev.filter((x) => x !== id)
    : [id, ...prev.filter((x) => x !== id)]
  writeAll(next)
  return next
}
