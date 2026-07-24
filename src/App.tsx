import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GameCard } from './components/GameCard'
import { GameOverOverlay } from './components/GameOverOverlay'
import {
  hasSeenSwipeCoach,
  markSwipeCoachSeen,
  SwipeCoach,
} from './components/SwipeCoach'
import {
  persistAutoRestart,
  resolveAutoRestart,
} from './experiments'
import {
  buildFeedBatch,
  getGameById,
  type FeedItem,
  type Game,
} from './games'
import { loadHighscores, recordHighscore } from './highscores'
import { fetchApprovedUgcGames, fetchUgcBySlug } from './lib/ugc'
import { trackVisit } from './metrics'
import { readSharedGameParam } from './share'
import { reloadApp, watchForDeployUpdate } from './updateCheck'

const PREFETCH_WITHIN = 3
const SWIPE_MIN_DY = 64

type GameOverState = { gameId: string; score: number }

function createInitialSession() {
  const sharedParam = readSharedGameParam()
  const preferGame = sharedParam ? getGameById(sharedParam) ?? null : null
  const feed = buildFeedBatch(0, preferGame)
  return {
    sharedParam,
    preferGame,
    feed,
    playingKey: feed[0]?.key ?? null,
  }
}

export default function App() {
  const feedRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef(1)
  const appendingRef = useRef(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const communityRef = useRef<Game[]>([])
  useEffect(() => {
    trackVisit()
  }, [])
  const boot = useMemo(() => createInitialSession(), [])

  const [feed, setFeed] = useState<FeedItem[]>(() => boot.feed)
  const [playingKey, setPlayingKey] = useState<string | null>(
    () => boot.playingKey,
  )
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [coachVisible, setCoachVisible] = useState(
    () => !boot.sharedParam && !hasSeenSwipeCoach(),
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [highscores, setHighscores] = useState(loadHighscores)
  const [autoRestart, setAutoRestart] = useState(() => resolveAutoRestart())
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [restartKey, setRestartKey] = useState(0)
  const playingRef = useRef(playingKey)
  const reloadWhenIdleRef = useRef(false)
  playingRef.current = playingKey

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const community = await fetchApprovedUgcGames()
      if (cancelled) return
      communityRef.current = community

      let prefer = boot.preferGame
      if (!prefer && boot.sharedParam) {
        prefer = await fetchUgcBySlug(boot.sharedParam)
      }
      if (cancelled) return

      if (prefer || community.length) {
        const next = buildFeedBatch(0, prefer, community)
        setFeed(next)
        if (prefer) {
          setPlayingKey(next[0]?.key ?? null)
          setCoachVisible(false)
        }
        roundRef.current = 1
      }
    })()
    return () => {
      cancelled = true
    }
  }, [boot.preferGame, boot.sharedParam])

  useEffect(() => {
    return watchForDeployUpdate(() => {
      if (playingRef.current) {
        reloadWhenIdleRef.current = true
        return
      }
      reloadApp()
    })
  }, [])

  useEffect(() => {
    if (!playingKey && reloadWhenIdleRef.current) reloadApp()
  }, [playingKey])

  const dismissNudge = useCallback(() => setNudgeVisible(false), [])

  const activeGame = feed[activeIndex]?.game
  const activeHighscore = activeGame ? highscores[activeGame.id] ?? 0 : 0

  const appendBatch = useCallback(() => {
    if (appendingRef.current) return
    appendingRef.current = true
    const next = buildFeedBatch(roundRef.current, null, communityRef.current)
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
    setGameOver(null)
    setPlayingKey(key)
    setNudgeVisible(false)
  }, [])

  const pausePlay = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(true)
  }, [])

  const goToNextGame = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex + 1)
  }, [activeIndex, scrollToIndex])

  const goToPrevGame = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex - 1)
  }, [activeIndex, scrollToIndex])

  const dismissCoach = useCallback(
    (via: 'tap' | 'swipe') => {
      markSwipeCoachSeen()
      setCoachVisible(false)
      if (via === 'swipe') goToNextGame()
    },
    [goToNextGame],
  )

  const onGameSwipe = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next') goToNextGame()
      else goToPrevGame()
    },
    [goToNextGame, goToPrevGame],
  )

  const onScore = useCallback((gameId: string, score: number) => {
    const best = recordHighscore(gameId, score)
    setHighscores((prev) =>
      prev[gameId] === best ? prev : { ...prev, [gameId]: best },
    )
  }, [])

  const onDied = useCallback(
    (gameId: string, score: number) => {
      if (autoRestart) return
      if (score > 0) {
        const best = recordHighscore(gameId, score)
        setHighscores((prev) =>
          prev[gameId] === best ? prev : { ...prev, [gameId]: best },
        )
      }
      setGameOver({ gameId, score })
    },
    [autoRestart],
  )

  const playAgain = useCallback(() => {
    setGameOver(null)
    setRestartKey((n) => n + 1)
  }, [])

  const toggleAutoRestart = useCallback(() => {
    setAutoRestart((prev) => {
      const next = !prev
      persistAutoRestart(next)
      return next
    })
    setGameOver(null)
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
      if (coachVisible) {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          dismissCoach('tap')
          return
        }
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          dismissCoach('swipe')
          return
        }
        return
      }
      if (gameOver) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          playAgain()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          goToNextGame()
          return
        }
      }
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
  }, [
    coachVisible,
    dismissCoach,
    gameOver,
    playAgain,
    playingKey,
    pausePlay,
    goToNextGame,
    goToPrevGame,
  ])

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

  const inputEnabled = !!playingKey && !gameOver

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
          {!playingKey && (
            <Link to="/create" className="create-link">
              Create
            </Link>
          )}
          <button
            type="button"
            className={`auto-restart-btn${autoRestart ? ' is-on' : ''}`}
            onClick={toggleAutoRestart}
            aria-pressed={autoRestart}
            aria-label={`Auto-restart ${autoRestart ? 'on' : 'off'}. Tap to ${autoRestart ? 'disable' : 'enable'}.`}
            title="Toggle auto-restart on fail"
          >
            Auto-restart {autoRestart ? 'On' : 'Off'}
          </button>
          <span className="mode">{playingKey ? 'Playing' : 'Browse'}</span>
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
            game={item.game}
            isActive={Math.abs(index - activeIndex) <= 1}
            isPlaying={playingKey === item.key}
            controlsEnabled={playingKey === item.key && !gameOver}
            liked={!!liked[item.game.id]}
            autoRestart={autoRestart}
            restartKey={playingKey === item.key ? restartKey : 0}
            onPlay={() => enterPlay(item.key)}
            onScore={onScore}
            onDied={onDied}
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
      {inputEnabled && !coachVisible && (
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

      {nudgeVisible && !playingKey && !coachVisible && (
        <button type="button" className="nudge" onClick={goToNextGame}>
          <span className="nudge-chevron" aria-hidden="true" />
          Swipe up for the next game
        </button>
      )}

      {gameOver && playingKey && (
        <GameOverOverlay
          score={gameOver.score}
          best={Math.max(activeHighscore, gameOver.score)}
          onPlayAgain={playAgain}
          onPlayAnother={goToNextGame}
        />
      )}

      {coachVisible && <SwipeCoach onDismiss={dismissCoach} />}
    </div>
  )
}
