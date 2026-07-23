/** Fail behavior when a run ends. Toggle via `?fail=` or the top-bar control. */
export type FailMode = 'instant-replay' | 'game-over'

export const FAIL_MODE_KEY = 'gs_fail_mode'
export const FAIL_MODE_QUERY = 'fail'

const MODES: FailMode[] = ['instant-replay', 'game-over']

function parseMode(raw: string | null | undefined): FailMode | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'replay' || v === 'instant-replay' || v === 'a') return 'instant-replay'
  if (v === 'gameover' || v === 'game-over' || v === 'b') return 'game-over'
  return MODES.includes(v as FailMode) ? (v as FailMode) : null
}

function readStored(): FailMode | null {
  try {
    return parseMode(localStorage.getItem(FAIL_MODE_KEY))
  } catch {
    return null
  }
}

export function persistFailMode(mode: FailMode): void {
  try {
    localStorage.setItem(FAIL_MODE_KEY, mode)
  } catch {
    /* ignore quota / private mode */
  }
}

/** URL `?fail=` wins (and is persisted); else localStorage; else instant-replay. */
export function resolveFailMode(search = window.location.search): FailMode {
  const fromUrl = parseMode(new URLSearchParams(search).get(FAIL_MODE_QUERY))
  if (fromUrl) {
    persistFailMode(fromUrl)
    return fromUrl
  }
  return readStored() ?? 'instant-replay'
}

export function failModeLabel(mode: FailMode): string {
  return mode === 'instant-replay' ? 'Replay' : 'Game over'
}

/** Value sent to iframes on `gamescroll:start`. */
export function failModeForBridge(mode: FailMode): 'replay' | 'gameover' {
  return mode === 'instant-replay' ? 'replay' : 'gameover'
}

export function nextFailMode(mode: FailMode): FailMode {
  return mode === 'instant-replay' ? 'game-over' : 'instant-replay'
}
