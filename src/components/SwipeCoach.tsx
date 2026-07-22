import { useRef } from 'react'

const SEEN_KEY = 'gs_swipe_coach_seen'
const SWIPE_MIN_DY = 56

export function hasSeenSwipeCoach(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markSwipeCoachSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

type Props = {
  onDismiss: (via: 'tap' | 'swipe') => void
}

export function SwipeCoach({ onDismiss }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return (
    <div
      className="swipe-coach"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swipe-coach-title"
      aria-describedby="swipe-coach-desc"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerUp={(e) => {
        const s = start.current
        start.current = null
        if (!s) {
          onDismiss('tap')
          return
        }
        const dy = s.y - e.clientY
        const dx = Math.abs(e.clientX - s.x)
        if (dy > SWIPE_MIN_DY && dy > dx * 1.1) {
          onDismiss('swipe')
          return
        }
        onDismiss('tap')
      }}
      onPointerCancel={() => {
        start.current = null
      }}
    >
      <div className="swipe-coach-glow" aria-hidden="true" />
      <div className="swipe-coach-demo" aria-hidden="true">
        <span className="swipe-coach-trail">
          <span />
          <span />
          <span />
        </span>
        <span className="swipe-coach-finger" />
      </div>
      <h2 id="swipe-coach-title" className="swipe-coach-title">
        Swipe up
      </h2>
      <p id="swipe-coach-desc" className="swipe-coach-desc">
        Flick to the next game anytime
      </p>
      <p className="swipe-coach-hint">Tap to continue</p>
    </div>
  )
}
