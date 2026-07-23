const UID_KEY = 'gs_uid'
const VISITS_KEY = 'gs_visits'
const LAST_SEEN_KEY = 'gs_last_seen'

export type MetricsSnapshot = {
  uid: string
  visits: number
  isReturning: boolean
}

function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function readInt(key: string, fallback = 0): number {
  const raw = localStorage.getItem(key)
  const n = raw == null ? NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

/** Call once on app boot. Bumps visit count at most once per calendar day. */
export function trackVisit(): MetricsSnapshot {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(UID_KEY, uid)
  }

  const today = dayKey()
  const last = localStorage.getItem(LAST_SEEN_KEY)
  let visits = readInt(VISITS_KEY, 0)
  const isReturning = visits > 0 || last != null

  if (last !== today) {
    visits += 1
    localStorage.setItem(VISITS_KEY, String(visits))
    localStorage.setItem(LAST_SEEN_KEY, today)
  }

  return { uid, visits, isReturning }
}
