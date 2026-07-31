const STORAGE_KEY = 'gs_highscores'

/** Games where a lower score is better (e.g. reaction time in ms). */
const LOWER_IS_BETTER = new Set([
  'reactflash',
  'race-start-reaction-3be720bf',
])

export type Highscores = Record<string, number>

export function isLowerBetterScore(gameId: string): boolean {
  return LOWER_IS_BETTER.has(gameId)
}

/** Pick the better of two positive scores for this game (0 = missing). */
export function betterScore(gameId: string, a: number, b: number): number {
  const x = Number.isFinite(a) && a > 0 ? Math.floor(a) : 0
  const y = Number.isFinite(b) && b > 0 ? Math.floor(b) : 0
  if (!x) return y
  if (!y) return x
  return isLowerBetterScore(gameId) ? Math.min(x, y) : Math.max(x, y)
}

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
  const improves = isLowerBetterScore(gameId)
    ? prev === 0 || n < prev
    : n > prev
  if (improves) {
    all[gameId] = n
    writeAll(all)
    return n
  }
  return prev
}
