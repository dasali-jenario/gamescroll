import type { Game } from './games'
import { getGameById } from './games'
import { getHighscore, isLowerBetterScore } from './highscores'

const PARAM = 'g'

/** Raw `?g=` value (official id or UGC slug). */
export function readSharedGameParam(): string | null {
  try {
    const id = new URLSearchParams(window.location.search).get(PARAM)
    return id && id.trim() ? id.trim() : null
  } catch {
    return null
  }
}

/** Official catalog id only (sync). Prefer async UGC resolve in the host for slugs. */
export function readSharedGameId(): string | null {
  const id = readSharedGameParam()
  return id && getGameById(id) ? id : null
}

/** Absolute link that opens Gamescroll with this game first. */
export function gameShareUrl(gameId: string): string {
  const url = new URL(window.location.href)
  // The feed only resolves ?g= at the root route, so never keep the current
  // pathname (e.g. /create would produce a broken /create?g= link).
  url.pathname = '/'
  url.hash = ''
  url.search = ''
  url.searchParams.set(PARAM, gameId)
  return url.toString()
}

/** Share body text; includes personal high score from localStorage when present. */
export function gameShareText(game: Game, best = getHighscore(game.id)): string {
  const base = `Play ${game.title} — ${game.tip}`
  if (best <= 0) return base
  if (isLowerBetterScore(game.id)) return `${base}\nMy best: ${best} ms`
  return `${base}\nMy high score: ${best}`
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareGame(game: Game): Promise<ShareResult> {
  const url = gameShareUrl(game.id)
  const best = getHighscore(game.id)
  const text = gameShareText(game, best)
  const data = {
    title: `${game.title} on Gamescroll`,
    text,
    url,
  }

  if (typeof navigator.share === 'function') {
    try {
      if (!navigator.canShare || navigator.canShare(data)) {
        await navigator.share(data)
        return 'shared'
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled'
      }
      /* fall through to clipboard */
    }
  }

  const clipboardPayload = best > 0 ? `${text}\n${url}` : url

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(clipboardPayload)
      return 'copied'
    }
  } catch {
    /* fall through */
  }

  try {
    const el = document.createElement('textarea')
    el.value = clipboardPayload
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok ? 'copied' : 'failed'
  } catch {
    return 'failed'
  }
}
