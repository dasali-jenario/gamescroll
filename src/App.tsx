import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildFeedBatch, type FeedItem } from './games'
import { GameCard } from './components/GameCard'
import { createSessionMetrics, trackVisit } from './metrics'

const PREFETCH_WITHIN = 3

export default function App() {
  const feedRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef(1)
  const appendingRef = useRef(false)
  const session = useMemo(() => createSessionMetrics(trackVisit()), [])

  const [feed, setFeed] = useState<FeedItem[]>(() => buildFeedBatch(0))
  const [playingKey, setPlayingKey] = useState<string | null>(
    () => buildFeedBatch(0)[0]?.key ?? null,
  )
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [gamesPlayed, setGamesPlayed] = useState(0)
  const [visits] = useState(() => session.snapshot().visits)

  const dismissNudge = useCallback(() => setNudgeVisible(false), [])

  const appendBatch = useCallback(() => {
    if (appendingRef.current) return
    appendingRef.current = true
    const next = buildFeedBatch(roundRef.current)
    roundRef.current += 1
    setFeed((prev) => [...prev, ...next])
    queueMicrotask(() => {
      appendingRef.current = false
    })
  }, [])

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = feedRef.current
      if (!el) return
      const max = feed.length - 1
      const clamped = Math.max(0, Math.min(max, index))
      if (clamped >= max - PREFETCH_WITHIN) appendBatch()
      el.scrollTo({ top: clamped * el.clientHeight, behavior: 'smooth' })
    },
    [feed.length, appendBatch],
  )

  const enterPlay = useCallback((key: string) => {
    setPlayingKey(key)
    setNudgeVisible(false)
  }, [])

  const pausePlay = useCallback(() => {
    setPlayingKey(null)
    setNudgeVisible(true)
  }, [])

  const onPlaying = useCallback(
    (key: string) => {
      const snap = session.recordGamePlayed(key)
      setGamesPlayed(snap.gamesPlayed)
    },
    [session],
  )

  useEffect(() => {
    const el = feedRef.current
    if (!el) return

    const onScroll = () => {
      const index = Math.round(el.scrollTop / Math.max(el.clientHeight, 1))
      setActiveIndex(index)
      if (el.scrollTop > 40) dismissNudge()
      if (index >= feed.length - PREFETCH_WITHIN) appendBatch()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [dismissNudge, feed.length, appendBatch])

  useEffect(() => {
    const el = feedRef.current
    if (!el || !playingKey) return

    const lockTop = el.scrollTop
    const block = (e: Event) => {
      e.preventDefault()
      el.scrollTop = lockTop
    }

    el.addEventListener('wheel', block, { passive: false })
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('wheel', block)
      el.removeEventListener('touchmove', block)
    }
  }, [playingKey])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && playingKey) {
        pausePlay()
        return
      }
      if (playingKey) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        scrollToIndex(activeIndex + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        scrollToIndex(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playingKey, activeIndex, pausePlay, scrollToIndex])

  return (
    <div className={`app${playingKey ? ' is-playing' : ''}`}>
      <header className="top-bar">
        <div className="brand">Gamescroll</div>
        <div className="stats" aria-label="Session stats">
          <span>{gamesPlayed} played</span>
          <span className="mode">{playingKey ? 'Playing' : 'Browse'}</span>
          <span className="visits">v{visits}</span>
          {playingKey && (
            <button type="button" className="pause-btn" onClick={pausePlay}>
              Pause
            </button>
          )}
        </div>
      </header>

      <div
        ref={feedRef}
        className={`feed${playingKey ? ' is-locked' : ''}`}
        tabIndex={0}
      >
        {feed.map((item, index) => (
          <GameCard
            key={item.key}
            feedKey={item.key}
            game={item.game}
            isActive={Math.abs(index - activeIndex) <= 1}
            isPlaying={playingKey === item.key}
            liked={!!liked[item.game.id]}
            onPlay={() => enterPlay(item.key)}
            onPlaying={onPlaying}
            onLike={() => {
              setLiked((prev) => ({
                ...prev,
                [item.game.id]: !prev[item.game.id],
              }))
            }}
          />
        ))}
      </div>

      {nudgeVisible && !playingKey && (
        <button type="button" className="nudge" onClick={dismissNudge}>
          <span className="nudge-chevron" aria-hidden="true" />
          Swipe for the next game
        </button>
      )}
    </div>
  )
}
