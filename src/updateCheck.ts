const VERSION_URL = '/version.json'
const POLL_MS = 60_000

type VersionPayload = {
  id?: string
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_URL}?_=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as VersionPayload
    return typeof data.id === 'string' && data.id.length > 0 ? data.id : null
  } catch {
    return null
  }
}

/**
 * Watch for a newer deploy. Calls `onUpdate` once when the remote build id
 * differs from this page's injected `__BUILD_ID__`. No-op in Vite dev.
 */
export function watchForDeployUpdate(onUpdate: () => void): () => void {
  if (import.meta.env.DEV) return () => {}

  const localId = __BUILD_ID__
  let stopped = false
  let notified = false

  const check = async () => {
    if (stopped || notified) return
    const remoteId = await fetchRemoteBuildId()
    if (stopped || notified || !remoteId || remoteId === localId) return
    notified = true
    onUpdate()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') void check()
  }

  void check()
  const timer = window.setInterval(() => void check(), POLL_MS)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', onVisible)
  window.addEventListener('pageshow', onVisible)

  return () => {
    stopped = true
    window.clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', onVisible)
    window.removeEventListener('pageshow', onVisible)
  }
}

export function reloadApp() {
  window.location.reload()
}
