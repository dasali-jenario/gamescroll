import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildFeedBatch, type FeedItem } from './games'
import { GameCard } from './components/GameCard'
import { loadHighscores, recordHighscore } from './highscores'
import { createSessionMetrics, trackVisit } from './metrics'

const PREFETCH_WITHIN = 3
const SWIPE_MIN_DY = 64

export default function App() {
  const feedRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef(1)
  const appendingRef = useRef(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
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
  const [highscores, setHighscores] = useState(loadHighscores)

  const dismissNudge = useCallback(() => setNudgeVisible(false), [])

  const activeGame = feed[activeIndex]?.game
  const activeHighscore = activeGame ? highscores[activeGame.id] ?? 0 : 0

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
      setActiveIndex(clamped)
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

  const goToNextGame = useCallback(() => {
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex + 1)
  }, [activeIndex, scrollToIndex])

  const goToPrevGame = useCallback(() => {
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex - 1)
  }, [activeIndex, scrollToIndex])

  const onGameSwipe = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next') goToNextGame()
      else goToPrevGame()
    },
    [goToNextGame, goToPrevGame],
  )

  const onPlaying = useCallback(
    (key: string) => {
      const snap = session.recordGamePlayed(key)
      setGamesPlayed(snap.gamesPlayed)
    },
    [session],
  )

  const onScore = useCallback((gameId: string, score: number) => {
    const best = recordHighscore(gameId, score)
    setHighscores((prev) =>
      prev[gameId] === best ? prev : { ...prev, [gameId]: best },
    )
  }, [])

  const endSwipe = useCallback(
    (clientX: number, clientY: number) => {
      const start = swipeStart.current
      swipeStart.current = null
      if (!start) return
      const dy = start.y - clientY
      const dx = Math.abs(clientX - start.x)
      if (Math.abs(dy) < SWIPE_MIN_DY || Math.abs(dy) < dx * 1.25) return
      if (dy > 0) goToNextGame()
      else goToPrevGame()
    },
    [goToNextGame, goToPrevGame],
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
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        goToNextGame()
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        goToPrevGame()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playingKey, pausePlay, goToNextGame, goToPrevGame])

  // After pause: swipe up anywhere from the lower part of the screen advances.
  useEffect(() => {
    if (playingKey || !nudgeVisible) return

    const EDGE = 120
    const onDown = (e: PointerEvent) => {
      if (e.clientY < window.innerHeight - EDGE) return
      swipeStart.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => endSwipe(e.clientX, e.clientY)
    const onCancel = () => {
      swipeStart.current = null
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [playingKey, nudgeVisible, endSwipe])

  return (
    <div className={`app${playingKey ? ' is-playing' : ''}`}>
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand">Gamescroll</div>
          <div className="game-title">
            {activeGame?.title ?? ''}
          </div>
          {playingKey && activeHighscore > 0 && (
            <div className="highscore" aria-label={`High score ${activeHighscore}`}>
              Best {activeHighscore}
            </div>
          )}
        </div>
        <div className="stats" aria-label="Session stats">
          <span>{gamesPlayed} played</span>
          <span className="mode">{playingKey ? 'Playing' : 'Browse'}</span>
          <span className="visits">v{visits}</span>
          {playingKey && (
            <>
              <button
                type="button"
                className="nav-btn"
                aria-label="Previous game"
                onClick={goToPrevGame}
              >
                ↑
              </button>
              <button
                type="button"
                className="nav-btn"
                aria-label="Next game"
                onClick={goToNextGame}
              >
                ↓
              </button>
              <button type="button" className="pause-btn" onClick={pausePlay}>
                Pause
              </button>
            </>
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
            onScore={onScore}
            onSwipe={onGameSwipe}
            onLike={() => {
              setLiked((prev) => ({
                ...prev,
                [item.game.id]: !prev[item.game.id],
              }))
            }}
          />
        ))}
      </div>

      {/* While playing, the iframe eats touches — this host-owned right-edge
          rail stays above it so vertical swipes there always switch games. */}
      {playingKey && (
        <div
          className="swipe-rail"
          aria-label="Swipe up or down to switch games"
          onPointerDown={(e) => {
            swipeStart.current = { x: e.clientX, y: e.clientY }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerUp={(e) => endSwipe(e.clientX, e.clientY)}
          onPointerCancel={() => {
            swipeStart.current = null
          }}
        >
          <span className="swipe-rail-chevron up" aria-hidden="true" />
          <span className="swipe-rail-dot" aria-hidden="true" />
          <span className="swipe-rail-chevron down" aria-hidden="true" />
        </div>
      )}

      {nudgeVisible && !playingKey && (
        <button type="button" className="nudge" onClick={goToNextGame}>
          <span className="nudge-chevron" aria-hidden="true" />
          Swipe up for the next game
        </button>
      )}
    </div>
  )
}
