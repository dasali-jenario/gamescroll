import { describe, expect, it } from 'vitest'
import { buildFeedBatch, games } from './games'
import {
  FEED_KEEP_BEHIND,
  FEED_WINDOW_MAX,
  appendFeedWindow,
} from './lib/feedWindow'

function items(n: number, start = 0): number[] {
  return Array.from({ length: n }, (_, i) => start + i)
}

describe('appendFeedWindow', () => {
  it('appends without pruning while under the max', () => {
    const result = appendFeedWindow(items(10), items(5, 10), {
      activeIndex: 3,
      maxItems: 40,
    })
    expect(result.feed).toEqual(items(15))
    expect(result.removedCount).toBe(0)
    expect(result.activeIndex).toBe(3)
  })

  it('starts from an empty feed', () => {
    const next = items(26)
    const result = appendFeedWindow([], next, { activeIndex: 0 })
    expect(result.feed).toEqual(next)
    expect(result.feed).not.toBe(next)
    expect(result.removedCount).toBe(0)
    expect(result.activeIndex).toBe(0)
  })

  it('prunes from the front and remaps activeIndex', () => {
    const prev = items(70)
    const next = items(20, 70)
    const result = appendFeedWindow(prev, next, {
      activeIndex: 60,
      maxItems: 78,
      keepBehind: 12,
    })
    // 90 total → excess 12; maxRemovable = 60 - 12 = 48 → remove 12
    expect(result.removedCount).toBe(12)
    expect(result.feed).toHaveLength(78)
    expect(result.feed[0]).toBe(12)
    expect(result.activeIndex).toBe(48)
    expect(result.feed[result.activeIndex]).toBe(60)
  })

  it('preserves the active item identity after prune', () => {
    const prev = items(80).map((n) => ({ key: `g-${n}`, n }))
    const active = prev[65]!
    const result = appendFeedWindow(prev, items(30, 80).map((n) => ({ key: `g-${n}`, n })), {
      activeIndex: 65,
      maxItems: 78,
      keepBehind: 12,
    })
    expect(result.removedCount).toBeGreaterThan(0)
    expect(result.feed[result.activeIndex]).toEqual(active)
  })

  it('does not prune into the keep-behind buffer', () => {
    const result = appendFeedWindow(items(70), items(30, 70), {
      activeIndex: 10,
      maxItems: 78,
      keepBehind: 12,
    })
    // maxRemovable = max(0, 10 - 12) = 0 → grow past max until user scrolls down
    expect(result.removedCount).toBe(0)
    expect(result.feed).toHaveLength(100)
    expect(result.activeIndex).toBe(10)
  })

  it('partially prunes when keep-behind limits removal', () => {
    // active at 20, keepBehind 12 → can only remove 8, even if excess is larger
    const result = appendFeedWindow(items(70), items(30, 70), {
      activeIndex: 20,
      maxItems: 78,
      keepBehind: 12,
    })
    expect(result.removedCount).toBe(8)
    expect(result.feed).toHaveLength(92)
    expect(result.activeIndex).toBe(12)
    expect(result.feed[result.activeIndex]).toBe(20)
    expect(result.feed[0]).toBe(8)
  })

  it('skips prune when allowPrune is false', () => {
    const result = appendFeedWindow(items(70), items(20, 70), {
      activeIndex: 60,
      maxItems: 78,
      allowPrune: false,
    })
    expect(result.removedCount).toBe(0)
    expect(result.feed).toHaveLength(90)
    expect(result.activeIndex).toBe(60)
  })

  it('uses roadmap defaults that bound ~2–3 catalog batches', () => {
    expect(games.length).toBe(27)
    expect(FEED_WINDOW_MAX).toBe(games.length * 3)
    expect(FEED_KEEP_BEHIND).toBe(12)
    const result = appendFeedWindow(items(81), items(27, 81), {
      activeIndex: 70,
    })
    expect(result.feed.length).toBe(FEED_WINDOW_MAX)
    expect(result.removedCount).toBe(27)
    expect(result.activeIndex).toBe(70 - 27)
  })

  it('clamps a stale activeIndex to the previous feed', () => {
    const result = appendFeedWindow(items(5), items(2, 5), {
      activeIndex: 99,
      maxItems: 10,
    })
    expect(result.activeIndex).toBe(4)
    expect(result.removedCount).toBe(0)
  })

  it('clamps a negative activeIndex to 0', () => {
    const result = appendFeedWindow(items(10), items(5, 10), {
      activeIndex: -3,
      maxItems: 40,
    })
    expect(result.activeIndex).toBe(0)
    expect(result.removedCount).toBe(0)
  })

  it('stays bounded across continuous deep scrolls', () => {
    let feed = items(26)
    let activeIndex = 0
    let cursor = 26

    for (let round = 0; round < 12; round++) {
      // Simulate scrolling near the end before each append.
      activeIndex = Math.max(0, feed.length - 4)
      const next = items(26, cursor)
      cursor += 26
      const result = appendFeedWindow(feed, next, { activeIndex })
      feed = result.feed
      activeIndex = result.activeIndex

      if (activeIndex >= FEED_KEEP_BEHIND) {
        expect(feed.length).toBeLessThanOrEqual(FEED_WINDOW_MAX)
      }
    }

    expect(feed.length).toBe(FEED_WINDOW_MAX)
    expect(activeIndex).toBeGreaterThanOrEqual(FEED_KEEP_BEHIND)
  })

  it('scroll compensation index matches removedCount', () => {
    const activeBefore = 60
    const result = appendFeedWindow(items(70), items(20, 70), {
      activeIndex: activeBefore,
      maxItems: 78,
      keepBehind: 12,
    })
    // Host sets scrollTop = activeIndex * clientHeight after prune.
    expect(result.activeIndex).toBe(activeBefore - result.removedCount)
    expect(result.feed[result.activeIndex]).toBe(activeBefore)
  })
})

describe('appendFeedWindow with buildFeedBatch', () => {
  it('keeps real catalog batches inside the window once deep enough', () => {
    let feed = buildFeedBatch(0)
    let activeIndex = 0

    for (let round = 1; round <= 5; round++) {
      activeIndex = Math.max(0, feed.length - 3)
      const result = appendFeedWindow(feed, buildFeedBatch(round), {
        activeIndex,
      })
      feed = result.feed
      activeIndex = result.activeIndex
    }

    expect(feed.length).toBe(FEED_WINDOW_MAX)
    expect(feed.every((item) => typeof item.key === 'string')).toBe(true)
    expect(new Set(feed.map((item) => item.key)).size).toBe(feed.length)
  })
})
