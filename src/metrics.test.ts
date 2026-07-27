import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  TELEMETRY_BATCH_SIZE,
  TELEMETRY_SWIPE_HEARTBEAT,
  countLoadedIframes,
  flushTelemetry,
  getSessionSwipeCount,
  noteFeedSwipe,
  resetTelemetryForTests,
  setTelemetryDisabledForTests,
  setTelemetryTransportForTests,
  telemetryQueueSize,
  track,
  trackFeedPruned,
  trackVisit,
} from './metrics'

afterEach(() => {
  resetTelemetryForTests()
  vi.restoreAllMocks()
})

describe('trackVisit', () => {
  it('creates a stable anonymous uid and marks first visit', () => {
    localStorage.clear()
    const snap = trackVisit()
    expect(snap.uid.length).toBeGreaterThan(8)
    expect(snap.visits).toBe(1)
    expect(trackVisit().uid).toBe(snap.uid)
  })
})

describe('telemetry batcher', () => {
  it('queues events when a transport is installed', () => {
    setTelemetryTransportForTests(async () => {})
    track('feed_heartbeat', { feed_len: 26 })
    expect(telemetryQueueSize()).toBe(1)
  })

  it('flushes when the batch size is reached', async () => {
    const sent: unknown[] = []
    setTelemetryTransportForTests(async (batch) => {
      sent.push(...batch)
    })
    for (let i = 0; i < TELEMETRY_BATCH_SIZE; i++) {
      track('feed_heartbeat', { n: i })
    }
    await vi.waitFor(() => expect(sent).toHaveLength(TELEMETRY_BATCH_SIZE))
    expect(telemetryQueueSize()).toBe(0)
  })

  it('flushTelemetry sends the pending queue', async () => {
    const sent: { event: string }[] = []
    setTelemetryTransportForTests(async (batch) => {
      sent.push(...batch)
    })
    track('feed_pruned', { removed: 12 })
    expect(telemetryQueueSize()).toBe(1)
    await flushTelemetry()
    expect(sent).toHaveLength(1)
    expect(sent[0]?.event).toBe('feed_pruned')
    expect(telemetryQueueSize()).toBe(0)
  })

  it('no-ops track when telemetry is disabled', () => {
    setTelemetryDisabledForTests(true)
    track('feed_heartbeat', { feed_len: 1 })
    expect(telemetryQueueSize()).toBe(0)
  })

  it('drops the queue when transport throws', async () => {
    setTelemetryTransportForTests(async () => {
      throw new Error('boom')
    })
    track('feed_pruned', { removed: 1 })
    await flushTelemetry()
    expect(telemetryQueueSize()).toBe(0)
  })

  it('emits a heartbeat every N swipes', async () => {
    const sent: { event: string }[] = []
    setTelemetryTransportForTests(async (batch) => {
      sent.push(...batch)
    })
    for (let i = 0; i < TELEMETRY_SWIPE_HEARTBEAT; i++) {
      noteFeedSwipe({ feedLen: 40, activeIndex: 10 })
    }
    expect(getSessionSwipeCount()).toBe(TELEMETRY_SWIPE_HEARTBEAT)
    await flushTelemetry()
    expect(sent.some((e) => e.event === 'feed_heartbeat')).toBe(true)
  })

  it('trackFeedPruned includes removed + gauges', async () => {
    const sent: { event: string; props: Record<string, unknown> }[] = []
    setTelemetryTransportForTests(async (batch) => {
      sent.push(...batch)
    })
    trackFeedPruned({ feedLen: 78, activeIndex: 40, removed: 26 })
    await flushTelemetry()
    expect(sent[0]?.event).toBe('feed_pruned')
    expect(sent[0]?.props.removed).toBe(26)
    expect(sent[0]?.props.feed_len).toBe(78)
    expect(sent[0]?.props.iframe_loaded).toBe(3)
  })
})

describe('countLoadedIframes', () => {
  it('counts active ±1 slots', () => {
    expect(countLoadedIframes(10, 0)).toBe(2)
    expect(countLoadedIframes(10, 5)).toBe(3)
    expect(countLoadedIframes(10, 9)).toBe(2)
    expect(countLoadedIframes(1, 0)).toBe(1)
  })
})
