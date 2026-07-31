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
    if (!pendingPruneRef.current) return
    pendingPruneRef.current = false
    const el = feedRef.current
    if (!el) return
    el.scrollTop = activeIndexRef.current * el.clientHeight
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
      el.scrollTo({ top: clamped * el.clientHeight, behavior })
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
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const index = Math.round(el.scrollTop / Math.max(el.clientHeight, 1))
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
    (gameId: string) => {
      const find = () =>
        feedRefState.current.findIndex((item) => item.game.id === gameId)

      const ensureInFeed = () => {
        let index = find()
        let tries = 0
        while (index < 0 && tries < 6) {
          appendBatch()
          index = find()
          tries += 1
        }
        return index
      }

      let index = ensureInFeed()
      if (index < 0) return null

      scrollToIndex(index, 'auto')

      // scrollToIndex may append/prune and remapped indices; the card we
      // captured before that can disappear or move. Always re-resolve by id.
      index = ensureInFeed()
      if (index < 0) return null

      const item = feedRefState.current[index]
      if (!item || item.game.id !== gameId) return null

      if (activeIndexRef.current !== index) {
        activeIndexRef.current = index
        setActiveIndex(index)
      }
      const el = feedRef.current
      if (el && !pendingPruneRef.current) {
        el.scrollTo({ top: index * el.clientHeight, behavior: 'auto' })
      }
      return item
    },
    [appendBatch, scrollToIndex],
  )

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
    cancelIntro,
  }
}
