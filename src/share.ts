import type { Game } from './games'
import { getGameById } from './games'

const PARAM = 'g'

export function readSharedGameId(): string | null {
  try {
    const id = new URLSearchParams(window.location.search).get(PARAM)
    return id && getGameById(id) ? id : null
  } catch {
    return null
  }
}

/** Absolute link that opens Gamescroll with this game first. */
export function gameShareUrl(gameId: string): string {
  const url = new URL(window.location.href)
  url.hash = ''
  url.search = ''
  url.searchParams.set(PARAM, gameId)
  return url.toString()
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export async function shareGame(game: Game): Promise<ShareResult> {
  const url = gameShareUrl(game.id)
  const data = {
    title: `${game.title} on Gamescroll`,
    text: `Play ${game.title} — ${game.tip}`,
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

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      return 'copied'
    }
  } catch {
    /* fall through */
  }

  try {
    const el = document.createElement('textarea')
    el.value = url
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
