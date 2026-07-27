export type FeedBridgeEntry = {
  getSource: () => Window | null
  onMessage: (event: MessageEvent) => void
}

const entries = new Set<FeedBridgeEntry>()
let attached = false

function dispatch(event: MessageEvent) {
  for (const entry of entries) {
    const source = entry.getSource()
    if (source && event.source === source) {
      entry.onMessage(event)
      return
    }
  }
}

function ensureAttached() {
  if (attached || typeof window === 'undefined') return
  window.addEventListener('message', dispatch)
  attached = true
}

function detachIfIdle() {
  if (entries.size > 0 || !attached || typeof window === 'undefined') return
  window.removeEventListener('message', dispatch)
  attached = false
}

/**
 * Register a feed iframe bridge. One host `message` listener dispatches by
 * `event.source` so N cards do not attach N window listeners.
 */
export function registerFeedBridge(entry: FeedBridgeEntry): () => void {
  entries.add(entry)
  ensureAttached()
  return () => {
    entries.delete(entry)
    detachIfIdle()
  }
}

/** Test helper. */
export function feedBridgeEntryCount(): number {
  return entries.size
}

/** Test helper — drop all registrations and the host listener. */
export function resetFeedMessageHub(): void {
  entries.clear()
  detachIfIdle()
}
