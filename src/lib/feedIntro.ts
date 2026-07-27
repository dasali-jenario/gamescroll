/** Dedicated key — do not treat legacy coach dismiss as "already saw the reel". */
const INTRO_SEEN_KEY = 'gs_jackpot_intro_seen'

/** Build jackpot reel indices: climb through neighbors, then land on 0. */
export function buildReelSequence(feedLength: number): number[] {
  if (feedLength <= 1) return [0]
  const peak = Math.min(4, feedLength - 1)
  const steps: number[] = []
  for (let i = 0; i <= peak; i++) steps.push(i)
  steps.push(0)
  return steps
}

/** Delay (ms) before scrolling to each step after the first. */
export function reelDelayBeforeStep(stepIndex: number, stepCount: number): number {
  if (stepIndex === 0) return 0
  if (stepIndex === stepCount - 1) return 320
  const mid = stepCount - 2
  const t = mid <= 1 ? 1 : (stepIndex - 1) / (mid - 1)
  // Fast in the middle, slightly slower near the start.
  return Math.round(110 - t * 35)
}

export function hasSeenFeedIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markFeedIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const id = window.setTimeout(() => resolve(), ms)
    const onAbort = () => {
      window.clearTimeout(id)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export type RunFeedIntroResult = 'completed' | 'skipped' | 'cancelled'

/**
 * Snap through a short reel of feed cards, then land on index 0.
 * Caller should mark seen + enter play after 'completed' or 'skipped'.
 */
export async function runFeedIntroReel(opts: {
  feedLength: number
  scrollInstant: (index: number) => void
  signal: AbortSignal
}): Promise<RunFeedIntroResult> {
  if (opts.signal.aborted) return 'cancelled'
  if (hasSeenFeedIntro() || prefersReducedMotion() || opts.feedLength <= 1) {
    opts.scrollInstant(0)
    return 'skipped'
  }

  const sequence = buildReelSequence(opts.feedLength)
  try {
    for (let i = 0; i < sequence.length; i++) {
      const delay = reelDelayBeforeStep(i, sequence.length)
      if (delay > 0) await sleep(delay, opts.signal)
      if (opts.signal.aborted) return 'cancelled'
      opts.scrollInstant(sequence[i]!)
    }
    // Brief settle beat on the landing card.
    await sleep(280, opts.signal)
    return 'completed'
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    throw err
  }
}
