import { feedBridgeEntryCount } from './lib/feedMessageHub'
import { htmlBlobCacheSize } from './lib/htmlBlobCache'
import { getSupabase } from './lib/supabase'

const UID_KEY = 'gs_uid'
const VISITS_KEY = 'gs_visits'
const LAST_SEEN_KEY = 'gs_last_seen'

/** Flush when the queue reaches this many events. */
export const TELEMETRY_BATCH_SIZE = 8
/** Flush at most this often while events trickle in. */
export const TELEMETRY_FLUSH_MS = 12_000
/** Emit a feed heartbeat every N intentional swipes. */
export const TELEMETRY_SWIPE_HEARTBEAT = 10

export type MetricsSnapshot = {
  uid: string
  visits: number
  isReturning: boolean
}

export type TelemetryProps = Record<string, string | number | boolean | null>

export type TelemetryEvent = {
  uid: string
  session_id: string
  event: string
  props: TelemetryProps
  build_id: string
  client_t: number
}

type Transport = (batch: TelemetryEvent[]) => Promise<void>

let sessionId: string | null = null
let sessionSwipes = 0
let queue: TelemetryEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false
let lifecycleBound = false
let transportOverride: Transport | null = null
let disabledForTests = false

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function readInt(key: string, fallback = 0): number {
  try {
    const raw = localStorage.getItem(key)
    const n = raw == null ? NaN : Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function buildId(): string {
  try {
    return typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev'
  } catch {
    return 'dev'
  }
}

export function ensureAnonymousUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY)
    if (!uid) {
      uid = crypto.randomUUID()
      localStorage.setItem(UID_KEY, uid)
    }
    return uid
  } catch {
    return 'anonymous'
  }
}

function ensureSessionId(): string {
  if (!sessionId) sessionId = crypto.randomUUID()
  return sessionId
}

function telemetryEnabled(): boolean {
  if (disabledForTests) return false
  if (transportOverride) return true
  const webhook = import.meta.env.VITE_TELEMETRY_WEBHOOK_URL
  if (webhook) return true
  return Boolean(getSupabase())
}

function clearFlushTimer() {
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
}

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushTelemetry()
  }, TELEMETRY_FLUSH_MS)
}

async function defaultTransport(batch: TelemetryEvent[]): Promise<void> {
  const webhook = import.meta.env.VITE_TELEMETRY_WEBHOOK_URL
  if (webhook) {
    const body = JSON.stringify({ events: batch })
    const blob = new Blob([body], { type: 'application/json' })
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      if (navigator.sendBeacon(webhook, blob)) return
    }
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
    if (!res.ok) throw new Error(`telemetry webhook ${res.status}`)
    return
  }

  const sb = getSupabase()
  if (!sb) return

  const { error } = await sb.from('feed_telemetry_events').insert(
    batch.map((row) => ({
      uid: row.uid,
      session_id: row.session_id,
      event: row.event,
      props: { ...row.props, client_t: row.client_t },
      build_id: row.build_id,
    })),
  )
  if (error) throw error
}

function bindLifecycleOnce() {
  if (lifecycleBound || typeof window === 'undefined') return
  lifecycleBound = true
  const onHide = () => {
    void flushTelemetry()
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide()
  })
  window.addEventListener('pagehide', onHide)
}

/** Call once on app boot. Bumps visit count at most once per calendar day. */
export function trackVisit(): MetricsSnapshot {
  bindLifecycleOnce()
  const uid = ensureAnonymousUid()

  const today = dayKey()
  let last: string | null = null
  try {
    last = localStorage.getItem(LAST_SEEN_KEY)
  } catch {
    last = null
  }
  let visits = readInt(VISITS_KEY, 0)
  const isReturning = visits > 0 || last != null

  if (last !== today) {
    visits += 1
    try {
      localStorage.setItem(VISITS_KEY, String(visits))
      localStorage.setItem(LAST_SEEN_KEY, today)
    } catch {
      /* ignore quota */
    }
  }

  return { uid, visits, isReturning }
}

/**
 * Queue a sparse telemetry event. Flushes when the batch is full, on a timer,
 * or when the page hides. No-ops when neither webhook nor Supabase is configured
 * (unless a test transport is installed).
 */
export function track(event: string, props: TelemetryProps = {}): void {
  if (!telemetryEnabled()) return
  bindLifecycleOnce()
  queue.push({
    uid: ensureAnonymousUid(),
    session_id: ensureSessionId(),
    event,
    props,
    build_id: buildId(),
    client_t: Date.now(),
  })
  if (queue.length >= TELEMETRY_BATCH_SIZE) {
    clearFlushTimer()
    void flushTelemetry()
    return
  }
  scheduleFlush()
}

export async function flushTelemetry(): Promise<void> {
  clearFlushTimer()
  if (flushing || queue.length === 0) return
  if (!telemetryEnabled()) {
    queue = []
    return
  }

  flushing = true
  const batch = queue
  queue = []
  try {
    await (transportOverride ?? defaultTransport)(batch)
  } catch {
    // Drop failed batches — prefer lossy telemetry over unbounded retry growth.
  } finally {
    flushing = false
  }
}

export function countLoadedIframes(feedLen: number, activeIndex: number): number {
  let n = 0
  for (let i = 0; i < feedLen; i++) {
    if (Math.abs(i - activeIndex) <= 1) n += 1
  }
  return n
}

export function feedTelemetryGauges(opts: {
  feedLen: number
  activeIndex: number
}): TelemetryProps {
  return {
    feed_len: opts.feedLen,
    active_index: opts.activeIndex,
    iframe_loaded: countLoadedIframes(opts.feedLen, opts.activeIndex),
    blob_cache_size: htmlBlobCacheSize(),
    bridge_entries: feedBridgeEntryCount(),
    session_swipes: sessionSwipes,
  }
}

export function trackFeedPruned(opts: {
  feedLen: number
  activeIndex: number
  removed: number
}): void {
  track('feed_pruned', {
    ...feedTelemetryGauges(opts),
    removed: opts.removed,
  })
}

export function trackFeedHeartbeat(opts: {
  feedLen: number
  activeIndex: number
}): void {
  track('feed_heartbeat', feedTelemetryGauges(opts))
}

/** Count an intentional next/prev navigation; heartbeat every N swipes. */
export function noteFeedSwipe(opts: {
  feedLen: number
  activeIndex: number
}): void {
  sessionSwipes += 1
  if (sessionSwipes % TELEMETRY_SWIPE_HEARTBEAT === 0) {
    trackFeedHeartbeat(opts)
  }
}

export function trackBlobEvicted(opts: {
  blobCacheSize: number
  evicted: number
}): void {
  track('blob_evicted', {
    blob_cache_size: opts.blobCacheSize,
    evicted: opts.evicted,
  })
}

/** Test helper. */
export function telemetryQueueSize(): number {
  return queue.length
}

/** Test helper. */
export function getSessionSwipeCount(): number {
  return sessionSwipes
}

/** Test helper — install a fake transport (enables tracking without network). */
export function setTelemetryTransportForTests(transport: Transport | null): void {
  transportOverride = transport
}

/** Test helper — force telemetry off regardless of env. */
export function setTelemetryDisabledForTests(disabled: boolean): void {
  disabledForTests = disabled
}

/** Test helper. */
export function resetTelemetryForTests(): void {
  clearFlushTimer()
  queue = []
  flushing = false
  sessionSwipes = 0
  sessionId = null
  transportOverride = null
  disabledForTests = false
}
