import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import {
  buildFeedBatch,
  getGameById,
  type FeedItem,
  type Game,
} from '../games'
import { runFeedIntroReel } from '../lib/feedIntro'
import { resolveFeedBoot } from '../lib/feedBoot'
import { appendFeedWindow } from '../lib/feedWindow'
import { fetchApprovedUgcGames, fetchUgcBySlug } from '../lib/ugc'
import { trackVisit, trackFeedPruned } from '../metrics'
import { readSharedGameParam } from '../share'

const PREFETCH_WITHIN = 3

/** Scroll offset for a feed card — prefer real layout over index * height. */
function scrollTopForIndex(el: HTMLElement, index: number): number {
  const child = el.children[index] as HTMLElement | undefined
  if (child) return child.offsetTop
  return index * el.clientHeight
}

/** Resolve which card is centered from scroll position. */
function indexFromScrollTop(el: HTMLElement): number {
  const child = el.firstElementChild as HTMLElement | undefined
  const h = child?.offsetHeight || el.clientHeight
  return Math.round(el.scrollTop / Math.max(h, 1))
}

function createInitialSession() {
  const sharedParam = readSharedGameParam()
  const preferGame = sharedParam ? getGameById(sharedParam) ?? null : null
  const feed = buildFeedBatch(0, preferGame)
  const waitingOnUgc = Boolean(sharedParam && !preferGame)
  return {
    sharedParam,
    preferGame,
    feed,
    waitingOnUgc,
  }
}

type Options = {
  /** Called when the jackpot reel finishes (or is cancelled) with the landing card. */
  enterPlayRef: MutableRefObject<(key: string, gameId: string) => void>
  dismissNudgeRef: MutableRefObject<() => void>
}

export function useFeedSession({
  enterPlayRef,
  dismissNudgeRef,
}: Options) {
  const feedRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef(1)
  const appendingRef = useRef(false)
  const communityRef = useRef<Game[]>([])
  const introAbortRef = useRef<AbortController | null>(null)
  const feedRefState = useRef<FeedItem[]>([])
  const pendingPruneRef = useRef(false)
  const activeIndexRef = useRef(0)
  const introRunningRef = useRef(false)
  /** When set, prune/layout scrolls must land on this game id (not a stale index). */
  const pinGameIdRef = useRef<string | null>(null)

  useEffect(() => {
    trackVisit()
  }, [])

  const boot = useMemo(() => createInitialSession(), [])

  const [feed, setFeed] = useState<FeedItem[]>(() => boot.feed)
  feedRefState.current = feed
  const [resolvingShare, setResolvingShare] = useState(() => boot.waitingOnUgc)
  const [bootReady, setBootReady] = useState(false)
  const [introRunning, setIntroRunning] = useState(false)
  introRunningRef.current = introRunning
  const [activeIndex, setActiveIndex] = useState(0)
  activeIndexRef.current = activeIndex

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { community, prefer } = await resolveFeedBoot({
        preferGame: boot.preferGame,
        sharedParam: boot.sharedParam,
        fetchCommunity: fetchApprovedUgcGames,
        fetchShared: fetchUgcBySlug,
      })
      if (cancelled) return
      communityRef.current = community

      if (prefer || community.length) {
        pendingPruneRef.current = false
        const next = buildFeedBatch(0, prefer, community)
        feedRefState.current = next
        setFeed(next)
        activeIndexRef.current = 0
        setActiveIndex(0)
        queueMicrotask(() => {
          feedRef.current?.scrollTo({ top: 0 })
        })
        roundRef.current = 1
      }
      setResolvingShare(false)
      setBootReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [boot.preferGame, boot.sharedParam])

  const appendBatch = useCallback((): number => {
    if (appendingRef.current) return 0
    appendingRef.current = true
    const next = buildFeedBatch(roundRef.current, null, communityRef.current)
    roundRef.current += 1
    const result = appendFeedWindow(feedRefState.current, next, {
      activeIndex: activeIndexRef.current,
      allowPrune: !introRunningRef.current,
    })
    feedRefState.current = result.feed
    if (result.removedCount > 0) {
      pendingPruneRef.current = true
      activeIndexRef.current = result.activeIndex
      setActiveIndex(result.activeIndex)
      trackFeedPruned({
        feedLen: result.feed.length,
        activeIndex: result.activeIndex,
        removed: result.removedCount,
      })
    }
    setFeed(result.feed)
    queueMicrotask(() => {
      appendingRef.current = false
    })
    return result.removedCount
  }, [])

  useLayoutEffect(() => {
    if (!pendingPruneRef.current && !pinGameIdRef.current) return
    pendingPruneRef.current = false
    const el = feedRef.current
    if (!el) return
    const pinId = pinGameIdRef.current
    if (pinId) {
      let index = -1
      let best = Infinity
      const cur = activeIndexRef.current
      for (let i = 0; i < feedRefState.current.length; i++) {
        if (feedRefState.current[i]?.game.id !== pinId) continue
        const d = Math.abs(i - cur)
        if (d < best) {
          best = d
          index = i
        }
      }
      if (index >= 0) {
        activeIndexRef.current = index
        setActiveIndex(index)
        el.scrollTop = scrollTopForIndex(el, index)
        return
      }
    }
    el.scrollTop = scrollTopForIndex(el, activeIndexRef.current)
  }, [feed])

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const el = feedRef.current
      if (!el) return
      let target = index
      let length = feedRefState.current.length
      if (target >= length - PREFETCH_WITHIN) {
        const removed = appendBatch()
        target -= removed
        length = feedRefState.current.length
      }
      const clamped = Math.max(0, Math.min(Math.max(length - 1, 0), target))
      activeIndexRef.current = clamped
      setActiveIndex(clamped)
      if (pendingPruneRef.current) {
        return
      }
      el.scrollTo({ top: scrollTopForIndex(el, clamped), behavior })
    },
    [appendBatch],
  )

  const scrollToIndexInstant = useCallback(
    (index: number) => scrollToIndex(index, 'auto'),
    [scrollToIndex],
  )

  const scrollInstantRef = useRef(scrollToIndexInstant)
  scrollInstantRef.current = scrollToIndexInstant

  const settleAfterIntro = useCallback(() => {
    setIntroRunning(false)
    introAbortRef.current = null
    scrollInstantRef.current(0)
    const first = feedRefState.current[0]
    if (first) enterPlayRef.current(first.key, first.game.id)
  }, [enterPlayRef])

  const cancelIntro = useCallback(() => {
    introAbortRef.current?.abort()
    settleAfterIntro()
  }, [settleAfterIntro])

  useEffect(() => {
    if (!bootReady || resolvingShare) return

    let alive = true
    const ac = new AbortController()
    introAbortRef.current = ac

    const done = () => {
      if (!alive) return
      settleAfterIntro()
    }

    setIntroRunning(true)
    void runFeedIntroReel({
      feedLength: feedRefState.current.length,
      scrollInstant: (index) => {
        if (alive) scrollInstantRef.current(index)
      },
      signal: ac.signal,
    }).then((result) => {
      if (!alive || result === 'cancelled') return
      done()
    })

    return () => {
      alive = false
      ac.abort()
      if (introAbortRef.current === ac) introAbortRef.current = null
    }
  }, [bootReady, resolvingShare, settleAfterIntro])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return

    let raf = 0
    const onScroll = () => {
      if (introRunningRef.current) return
      // Liked / programmatic pins own activeIndex until clearGamePin.
      if (pinGameIdRef.current) return
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        if (pinGameIdRef.current) return
        const index = indexFromScrollTop(el)
        if (index !== activeIndexRef.current) {
          activeIndexRef.current = index
          setActiveIndex(index)
        }
        if (el.scrollTop > 40) dismissNudgeRef.current()
        if (index >= feedRefState.current.length - PREFETCH_WITHIN) {
          appendBatch()
        }
      })
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [appendBatch, dismissNudgeRef])

  const jumpToGameId = useCallback(
    (gameId: string, knownGame?: Game | null) => {
      const known =
        knownGame ??
        getGameById(gameId) ??
        feedRefState.current.find((item) => item.game.id === gameId)?.game ??
        communityRef.current.find((game) => game.id === gameId) ??
        null

      if (!known) {
        pinGameIdRef.current = null
        return null
      }

      // Use the card currently on screen (scroll), not possibly-stale activeIndex.
      const el = feedRef.current
      const fromScroll = el ? indexFromScrollTop(el) : activeIndexRef.current
      const at = Math.max(
        0,
        Math.min(
          fromScroll,
          Math.max(feedRefState.current.length - 1, 0),
        ),
      )
      const item: FeedItem = {
        key: `${known.id}-liked-${Date.now()}`,
        game: known,
      }
      const next = feedRefState.current.slice()
      if (next.length === 0) next.push(item)
      else next[at] = item // replace in place — no scroll shift
      feedRefState.current = next
      setFeed(next)
      activeIndexRef.current = at
      setActiveIndex(at)
      pinGameIdRef.current = gameId
      // Scroll only to re-assert the visible slot (replace keeps offset stable).
      if (el) el.scrollTop = scrollTopForIndex(el, at)
      return item
    },
    [],
  )

  /** Re-align scroll to a game after chrome/inset height changes. */
  const pinScrollToGameId = useCallback((gameId: string, preferKey?: string | null) => {
    const el = feedRef.current
    if (!el) return
    pinGameIdRef.current = gameId
    let index = -1
    if (preferKey) {
      index = feedRefState.current.findIndex((item) => item.key === preferKey)
    }
    if (index < 0) {
      let best = Infinity
      const cur = activeIndexRef.current
      for (let i = 0; i < feedRefState.current.length; i++) {
        if (feedRefState.current[i]?.game.id !== gameId) continue
        const d = Math.abs(i - cur)
        if (d < best) {
          best = d
          index = i
        }
      }
    }
    if (index < 0) return
    activeIndexRef.current = index
    setActiveIndex(index)
    el.scrollTop = scrollTopForIndex(el, index)
  }, [])

  const clearGamePin = useCallback(() => {
    pinGameIdRef.current = null
  }, [])

  return {
    feedRef: feedRef as RefObject<HTMLDivElement>,
    feed,
    feedRefState,
    activeIndex,
    activeIndexRef,
    bootReady,
    resolvingShare,
    introRunning,
    introRunningRef,
    scrollToIndex,
    jumpToGameId,
    pinScrollToGameId,
    clearGamePin,
    cancelIntro,
  }
}
