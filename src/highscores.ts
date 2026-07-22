const STORAGE_KEY = 'gs_highscores'

export type Highscores = Record<string, number>

function readAll(): Highscores {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const out: Highscores = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value)
      if (Number.isFinite(n) && n > 0) out[id] = Math.floor(n)
    }
    return out
  } catch {
    return {}
  }
}

function writeAll(scores: Highscores) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
}

/** Best score for a game id, or 0 if none. */
export function getHighscore(gameId: string): number {
  return readAll()[gameId] ?? 0
}

/** Load all persisted highscores. */
export function loadHighscores(): Highscores {
  return readAll()
}

/**
 * Persist score if it beats the stored best for this game.
 * Returns the (possibly updated) highscore.
 */
export function recordHighscore(gameId: string, score: number): number {
  const n = Math.floor(Number(score))
  if (!Number.isFinite(n) || n <= 0) return getHighscore(gameId)
  const all = readAll()
  const prev = all[gameId] ?? 0
  if (n > prev) {
    all[gameId] = n
    writeAll(all)
    return n
  }
  return prev
}
