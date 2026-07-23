/** When true, death instantly restarts the run; when false, show game-over UI. */
export const AUTO_RESTART_KEY = 'gs_auto_restart'
export const AUTO_RESTART_QUERY = 'autorestart'
/** Legacy key/query from the fail-mode experiment — still read for migration. */
const LEGACY_FAIL_KEY = 'gs_fail_mode'
const LEGACY_FAIL_QUERY = 'fail'

function parseBool(raw: string | null | undefined): boolean | null {
  if (raw == null) return null
  const v = raw.trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'on' || v === 'yes') return true
  if (v === '0' || v === 'false' || v === 'off' || v === 'no') return false
  return null
}

function parseLegacyFail(raw: string | null | undefined): boolean | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  if (v === 'replay' || v === 'instant-replay' || v === 'a') return true
  if (v === 'gameover' || v === 'game-over' || v === 'b') return false
  return null
}

function readStored(): boolean | null {
  try {
    const next = parseBool(localStorage.getItem(AUTO_RESTART_KEY))
    if (next !== null) return next
    return parseLegacyFail(localStorage.getItem(LEGACY_FAIL_KEY))
  } catch {
    return null
  }
}

export function persistAutoRestart(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_RESTART_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
}

/** URL wins (and is persisted); else localStorage; else auto-restart on. */
export function resolveAutoRestart(search = window.location.search): boolean {
  const params = new URLSearchParams(search)
  const fromUrl =
    parseBool(params.get(AUTO_RESTART_QUERY)) ??
    parseLegacyFail(params.get(LEGACY_FAIL_QUERY))
  if (fromUrl !== null) {
    persistAutoRestart(fromUrl)
    return fromUrl
  }
  return readStored() ?? true
}

/** Value sent to iframes on `gamescroll:start`. */
export function autoRestartForBridge(
  enabled: boolean,
): 'replay' | 'gameover' {
  return enabled ? 'replay' : 'gameover'
}
