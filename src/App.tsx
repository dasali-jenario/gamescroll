import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { BottomNav } from './components/BottomNav'
import { GameCard } from './components/GameCard'
import { GameOverOverlay } from './components/GameOverOverlay'
import { SwipeCue } from './components/SwipeCue'
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
import {
  runFeedIntroReel,
} from './lib/feedIntro'
import { appendFeedWindow } from './lib/feedWindow'
import { fetchApprovedUgcGames, fetchUgcBySlug } from './lib/ugc'
import { trackVisit } from './metrics'
import { readSharedGameParam } from './share'
import { reloadApp, stripReloadParamFromLocation, watchForDeployUpdate } from './updateCheck'

const PREFETCH_WITHIN = 3
const SWIPE_MIN_DY = 64

type GameOverState = { gameId: string; score: number }

function createInitialSession() {
  const sharedParam = readSharedGameParam()
  const preferGame = sharedParam ? getGameById(sharedParam) ?? null : null
  const feed = buildFeedBatch(0, preferGame)
  const waitingOnUgc = Boolean(sharedParam && !preferGame)
  return {
    sharedParam,
    preferGame,
    feed,
    // Hold autoplay until boot + optional jackpot reel finish.
    waitingOnUgc,
  }
}

export default function App() {
  const feedRef = useRef<HTMLDivElement>(null)
  const roundRef = useRef(1)
  const appendingRef = useRef(false)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const communityRef = useRef<Game[]>([])
  const introAbortRef = useRef<AbortController | null>(null)
  const feedRefState = useRef<FeedItem[]>([])
  /** After prune, snap scroll to remapped activeIndex before paint. */
  const pendingPruneRef = useRef(false)
  const activeIndexRef = useRef(0)
  const introRunningRef = useRef(false)
  useEffect(() => {
    trackVisit()
  }, [])
  const boot = useMemo(() => createInitialSession(), [])

  const [feed, setFeed] = useState<FeedItem[]>(() => boot.feed)
  feedRefState.current = feed
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [resolvingShare, setResolvingShare] = useState(() => boot.waitingOnUgc)
  const [bootReady, setBootReady] = useState(false)
  const [introRunning, setIntroRunning] = useState(false)
  introRunningRef.current = introRunning
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [cueVisible, setCueVisible] = useState(false)
  const cueTimerRef = useRef<number | null>(null)
  const cueSpentRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)
  activeIndexRef.current = activeIndex
  const [highscores, setHighscores] = useState(loadHighscores)
  const [autoRestart, setAutoRestart] = useState(() => resolveAutoRestart())
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [restartKey, setRestartKey] = useState(0)
  const playingRef = useRef(playingKey)
  const reloadWhenIdleRef = useRef(false)
  const pendingReloadIdRef = useRef<string | null>(null)
  playingRef.current = playingKey

  useEffect(() => {
    stripReloadParamFromLocation()
  }, [])

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

  useEffect(() => {
    return watchForDeployUpdate((remoteId) => {
      pendingReloadIdRef.current = remoteId
      if (playingRef.current) {
        reloadWhenIdleRef.current = true
        return
      }
      reloadApp(remoteId)
    })
  }, [])

  const applyPendingReload = useCallback(() => {
    if (!reloadWhenIdleRef.current) return false
    reloadApp(pendingReloadIdRef.current ?? undefined)
    return true
  }, [])

  useEffect(() => {
    if (!playingKey) applyPendingReload()
  }, [playingKey, applyPendingReload])

  const dismissNudge = useCallback(() => setNudgeVisible(false), [])

  const dismissCue = useCallback(() => {
    cueSpentRef.current = true
    setCueVisible(false)
    if (cueTimerRef.current != null) {
      window.clearTimeout(cueTimerRef.current)
      cueTimerRef.current = null
    }
  }, [])

  // Show the swipe hint briefly after boot/intro, then hide — don't block the game UI.
  useEffect(() => {
    if (!bootReady || resolvingShare || introRunning || cueSpentRef.current) {
      return
    }
    setCueVisible(true)
    const id = window.setTimeout(() => {
      cueSpentRef.current = true
      setCueVisible(false)
      cueTimerRef.current = null
    }, 5000)
    cueTimerRef.current = id
    return () => {
      window.clearTimeout(id)
      if (cueTimerRef.current === id) cueTimerRef.current = null
    }
  }, [bootReady, resolvingShare, introRunning])

  const activeGame = feed[activeIndex]?.game
  const activeHighscore = activeGame ? highscores[activeGame.id] ?? 0 : 0

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
    }
    setFeed(result.feed)
    queueMicrotask(() => {
      appendingRef.current = false
    })
    return result.removedCount
  }, [])

  // Keep the remapped active card glued in place after front-of-feed prune.
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
        // Scroll snap runs in useLayoutEffect after the pruned DOM commits.
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

  const enterPlay = useCallback((key: string) => {
    setGameOver(null)
    setPlayingKey(key)
    setNudgeVisible(false)
  }, [])

  const enterPlayRef = useRef(enterPlay)
  enterPlayRef.current = enterPlay
  const scrollInstantRef = useRef(scrollToIndexInstant)
  scrollInstantRef.current = scrollToIndexInstant

  const settleAfterIntro = useCallback(() => {
    setIntroRunning(false)
    introAbortRef.current = null
    scrollInstantRef.current(0)
    const key = feedRefState.current[0]?.key
    if (key) enterPlayRef.current(key)
  }, [])

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

  const pausePlay = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(true)
  }, [])

  const goToNextGame = useCallback(() => {
    if (applyPendingReload()) return
    if (introRunning) {
      cancelIntro()
      return
    }
    dismissCue()
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex + 1)
  }, [activeIndex, scrollToIndex, introRunning, cancelIntro, applyPendingReload, dismissCue])

  const goToPrevGame = useCallback(() => {
    if (applyPendingReload()) return
    if (introRunning) {
      cancelIntro()
      return
    }
    dismissCue()
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
    scrollToIndex(activeIndex - 1)
  }, [activeIndex, scrollToIndex, introRunning, cancelIntro, applyPendingReload, dismissCue])

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

  const handlePlay = useCallback(
    (cardKey: string) => {
      if (introRunningRef.current) {
        cancelIntro()
        return
      }
      enterPlay(cardKey)
    },
    [cancelIntro, enterPlay],
  )

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
        if (el.scrollTop > 40) dismissNudge()
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
  }, [dismissNudge, appendBatch])

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

  // Tap / key / swipe cancels the jackpot reel early.
  useEffect(() => {
    if (!introRunning) return

    const cancel = () => cancelIntro()
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'j' ||
        e.key === 'k'
      ) {
        e.preventDefault()
        cancel()
      }
    }

    window.addEventListener('pointerdown', cancel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', cancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [introRunning, cancelIntro])

  useEffect(() => {
    if (introRunning) return

    const onKey = (e: KeyboardEvent) => {
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
    introRunning,
    gameOver,
    playAgain,
    playingKey,
    pausePlay,
    goToNextGame,
    goToPrevGame,
  ])

  // After pause: swipe up anywhere from the lower part of the screen advances.
  useEffect(() => {
    if (playingKey || !nudgeVisible || introRunning) return

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
  }, [playingKey, nudgeVisible, endSwipe, introRunning])

  const inputEnabled = !!playingKey && !gameOver && !introRunning
  const showCue =
    cueVisible &&
    bootReady &&
    !resolvingShare &&
    !gameOver &&
    !introRunning &&
    !nudgeVisible

  return (
    <div
      className={`app${playingKey ? ' is-playing' : ''}${introRunning ? ' is-intro' : ''}`}
    >
      {resolvingShare && (
        <div className="share-loading" role="status">
          Loading shared game…
        </div>
      )}
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand">Gamescroll</div>
          <div className="game-title">
            {activeGame?.title ?? ''}
          </div>
          {activeGame?.tip && (
            <p className="game-tip">{activeGame.tip}</p>
          )}
          {playingKey && activeHighscore > 0 && (
            <div className="highscore" aria-label={`High score ${activeHighscore}`}>
              Best {activeHighscore}
            </div>
          )}
        </div>
        <div className="stats" aria-label="Session stats">
          <button
            type="button"
            className={`auto-restart-btn${autoRestart ? ' is-on' : ' is-off'}`}
            onClick={toggleAutoRestart}
            aria-pressed={autoRestart}
            aria-label={`Restart ${autoRestart ? 'on' : 'off'}. Tap to ${autoRestart ? 'disable' : 'enable'} auto-restart.`}
            title="Toggle auto-restart on fail"
          >
            Restart
          </button>
          <span className="mode">
            {introRunning ? 'Browse' : playingKey ? 'Playing' : 'Browse'}
          </span>
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
            cardKey={item.key}
            game={item.game}
            isActive={Math.abs(index - activeIndex) <= 1}
            isPlaying={playingKey === item.key}
            controlsEnabled={playingKey === item.key && !gameOver}
            autoRestart={autoRestart}
            restartKey={playingKey === item.key ? restartKey : 0}
            onPlay={handlePlay}
            onScore={onScore}
            onDied={onDied}
            onSwipe={onGameSwipe}
          />
        ))}
      </div>

      <BottomNav
        game={activeGame}
        liked={!!(activeGame && liked[activeGame.id])}
        isPlaying={!!playingKey}
        onLike={() => {
          if (!activeGame) return
          setLiked((prev) => ({
            ...prev,
            [activeGame.id]: !prev[activeGame.id],
          }))
        }}
      />

      {introRunning && (
        <div className="feed-intro-label" aria-live="polite">
          <span className="feed-intro-chevron" aria-hidden="true" />
          More games this way
        </div>
      )}

      {/* While playing, the iframe eats touches — this host-owned right-edge
          rail stays above it so vertical swipes there always switch games. */}
      {inputEnabled && (
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

      {nudgeVisible && !playingKey && !introRunning && (
        <button type="button" className="nudge" onClick={goToNextGame}>
          <span className="nudge-chevron" aria-hidden="true" />
          Swipe up for the next game
        </button>
      )}

      {showCue && <SwipeCue />}

      {gameOver && playingKey && (
        <GameOverOverlay
          score={gameOver.score}
          best={Math.max(activeHighscore, gameOver.score)}
          onPlayAgain={playAgain}
          onPlayAnother={goToNextGame}
        />
      )}
    </div>
  )
}
