/** ~3 catalog batches (51 games × 3). Target window from simplification roadmap. */
export const FEED_WINDOW_MAX = 153

/** Cards kept above the active index so swipe-back still works after prune. */
export const FEED_KEEP_BEHIND = 12

export type AppendFeedWindowOptions = {
  activeIndex: number
  maxItems?: number
  keepBehind?: number
  /** When false, append only (e.g. intro reel). Default true. */
  allowPrune?: boolean
}

export type AppendFeedWindowResult<T> = {
  feed: T[]
  activeIndex: number
  removedCount: number
}

/**
 * Append a batch and prune from the front so the feed stays within a sliding window.
 * Only removes items above `activeIndex - keepBehind` so the visible card stays mounted;
 * callers must remap scroll position by the returned `removedCount` / `activeIndex`.
 */
export function appendFeedWindow<T>(
  prev: T[],
  next: T[],
  opts: AppendFeedWindowOptions,
): AppendFeedWindowResult<T> {
  const maxItems = opts.maxItems ?? FEED_WINDOW_MAX
  const keepBehind = opts.keepBehind ?? FEED_KEEP_BEHIND
  const allowPrune = opts.allowPrune !== false
  const lastIndex = Math.max(prev.length - 1, 0)
  const activeIndex = Math.max(0, Math.min(opts.activeIndex, lastIndex))

  const feed = prev.length === 0 ? next.slice() : prev.concat(next)

  if (!allowPrune || feed.length <= maxItems) {
    return { feed, activeIndex, removedCount: 0 }
  }

  const excess = feed.length - maxItems
  const maxRemovable = Math.max(0, activeIndex - keepBehind)
  const removedCount = Math.min(excess, maxRemovable)

  if (removedCount === 0) {
    return { feed, activeIndex, removedCount: 0 }
  }

  return {
    feed: feed.slice(removedCount),
    activeIndex: activeIndex - removedCount,
    removedCount,
  }
}
