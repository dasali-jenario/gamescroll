import { useCallback, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { GameCard } from './components/GameCard'
import { GameOverOverlay } from './components/GameOverOverlay'
import { SwipeCue } from './components/SwipeCue'
import { useChromeInsets } from './hooks/useChromeInsets'
import { useFeedGestures } from './hooks/useFeedGestures'
import { useFeedSession } from './hooks/useFeedSession'
import { usePlaySession } from './hooks/usePlaySession'
import {
  RAIL_HINT_CLASS,
  shouldShowRailHint,
  shouldShowSilentSwipeRail,
} from './lib/playPresentation'
import { noteFeedSwipe } from './metrics'

export default function App() {
  const enterPlayRef = useRef<(key: string) => void>(() => {})
  const dismissNudgeRef = useRef<() => void>(() => {})
  const topBarRef = useRef<HTMLElement | null>(null)
  const bottomNavRef = useRef<HTMLElement | null>(null)

  const feed = useFeedSession({
    enterPlayRef,
    dismissNudgeRef,
  })

  const play = usePlaySession({
    cancelIntro: feed.cancelIntro,
    introRunningRef: feed.introRunningRef,
    bootReady: feed.bootReady,
    resolvingShare: feed.resolvingShare,
    introRunning: feed.introRunning,
  })

  enterPlayRef.current = play.enterPlay
  dismissNudgeRef.current = play.dismissNudge

  const goToNextGame = useCallback(() => {
    if (play.applyPendingReload()) return
    if (feed.introRunning) {
      feed.cancelIntro()
      return
    }
    play.dismissCue()
    play.clearForNavigate()
    feed.scrollToIndex(feed.activeIndex + 1)
    noteFeedSwipe({
      feedLen: feed.feedRefState.current.length,
      activeIndex: feed.activeIndexRef.current,
    })
  }, [
    play.applyPendingReload,
    play.dismissCue,
    play.clearForNavigate,
    feed.introRunning,
    feed.cancelIntro,
    feed.scrollToIndex,
    feed.activeIndex,
    feed.feedRefState,
    feed.activeIndexRef,
  ])

  const goToPrevGame = useCallback(() => {
    if (play.applyPendingReload()) return
    if (feed.introRunning) {
      feed.cancelIntro()
      return
    }
    play.dismissCue()
    play.clearForNavigate()
    feed.scrollToIndex(feed.activeIndex - 1)
    noteFeedSwipe({
      feedLen: feed.feedRefState.current.length,
      activeIndex: feed.activeIndexRef.current,
    })
  }, [
    play.applyPendingReload,
    play.dismissCue,
    play.clearForNavigate,
    feed.introRunning,
    feed.cancelIntro,
    feed.scrollToIndex,
    feed.activeIndex,
    feed.feedRefState,
    feed.activeIndexRef,
  ])

  const gestures = useFeedGestures({
    feedRef: feed.feedRef,
    introRunning: feed.introRunning,
    playingKey: play.playingKey,
    nudgeVisible: play.nudgeVisible,
    gameOver: play.gameOver,
    cancelIntro: feed.cancelIntro,
    goToNextGame,
    goToPrevGame,
    playAgain: play.playAgain,
    pausePlay: play.pausePlay,
  })

  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const activeGame = feed.feed[feed.activeIndex]?.game
  const activeHighscore = activeGame ? play.highscores[activeGame.id] ?? 0 : 0

  useChromeInsets({
    topBarRef,
    bottomNavRef,
    deps: [
      activeGame?.id,
      activeGame?.tip,
      play.playingKey,
      activeHighscore,
      feed.introRunning,
    ],
  })

  const showRailHint = shouldShowRailHint({
    railHintVisible: play.railHintVisible,
    playingKey: play.playingKey,
  })
  const showSilentRail = shouldShowSilentSwipeRail({
    playingKey: play.playingKey,
    gameOver: !!play.gameOver,
    introRunning: feed.introRunning,
  })

  return (
    <div
      className={`app${play.playingKey ? ' is-playing' : ''}${feed.introRunning ? ' is-intro' : ''}`}
      onDoubleClick={(e) => e.preventDefault()}
    >
      {feed.resolvingShare && (
        <div className="share-loading" role="status">
          Loading shared game…
        </div>
      )}
      <header className="top-bar" ref={topBarRef}>
        <div className="brand-block">
          <div className="brand">Gamescroll</div>
          <div className="game-title">{activeGame?.title ?? ''}</div>
          {activeGame?.tip && <p className="game-tip">{activeGame.tip}</p>}
          {play.playingKey && activeHighscore > 0 && (
            <div
              className="highscore"
              aria-label={`High score ${activeHighscore}`}
            >
              Best {activeHighscore}
            </div>
          )}
        </div>
        <div className="stats" aria-label="Session stats">
          <button
            type="button"
            className={`auto-restart-btn${play.autoRestart ? ' is-on' : ' is-off'}`}
            onClick={play.toggleAutoRestart}
            aria-pressed={play.autoRestart}
            aria-label={`Restart ${play.autoRestart ? 'on' : 'off'}. Tap to ${play.autoRestart ? 'disable' : 'enable'} auto-restart.`}
            title="Toggle auto-restart on fail"
          >
            Restart
          </button>
          <span className="mode">
            {feed.introRunning
              ? 'Browse'
              : play.playingKey
                ? 'Playing'
                : 'Browse'}
          </span>
          {play.playingKey && (
            <button type="button" className="pause-btn" onClick={play.pausePlay}>
              Pause
            </button>
          )}
        </div>
      </header>

      <div
        ref={feed.feedRef}
        className={`feed${play.playingKey ? ' is-locked' : ''}`}
        tabIndex={0}
      >
        {feed.feed.map((item, index) => (
          <GameCard
            key={item.key}
            cardKey={item.key}
            game={item.game}
            isActive={Math.abs(index - feed.activeIndex) <= 1}
            isPlaying={play.playingKey === item.key}
            controlsEnabled={play.playingKey === item.key && !play.gameOver}
            autoRestart={play.autoRestart}
            restartKey={play.playingKey === item.key ? play.restartKey : 0}
            onPlay={play.handlePlay}
            onScore={play.onScore}
            onDied={play.onDied}
            onSwipe={gestures.onGameSwipe}
          />
        ))}
      </div>

      <BottomNav
        navRef={bottomNavRef}
        game={activeGame}
        liked={!!(activeGame && liked[activeGame.id])}
        isPlaying={!!play.playingKey}
        onLike={() => {
          if (!activeGame) return
          setLiked((prev) => ({
            ...prev,
            [activeGame.id]: !prev[activeGame.id],
          }))
        }}
      />

      {feed.introRunning && (
        <div className="feed-intro-label" aria-live="polite">
          <span className="feed-intro-chevron" aria-hidden="true" />
          More games this way
        </div>
      )}

      {showRailHint && (
        <div className={`swipe-rail ${RAIL_HINT_CLASS}`} aria-hidden="true">
          <span className="swipe-rail-chevron up" />
          <span className="swipe-rail-dot" />
          <span className="swipe-rail-chevron down" />
        </div>
      )}
      {showSilentRail && (
        <div
          className="swipe-rail"
          aria-label="Swipe up or down to switch games"
          onPointerDown={(e) => {
            gestures.beginSwipe(e.clientX, e.clientY)
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerUp={(e) => gestures.endSwipe(e.clientX, e.clientY)}
          onPointerCancel={gestures.cancelSwipe}
        />
      )}

      {play.nudgeVisible && !play.playingKey && !feed.introRunning && (
        <button type="button" className="nudge" onClick={goToNextGame}>
          <span className="nudge-chevron" aria-hidden="true" />
          Swipe up for the next game
        </button>
      )}

      {play.showCue && <SwipeCue />}

      {play.gameOver && play.playingKey && (
        <GameOverOverlay
          score={play.gameOver.score}
          best={Math.max(activeHighscore, play.gameOver.score)}
          onPlayAgain={play.playAgain}
          onPlayAnother={goToNextGame}
        />
      )}
    </div>
  )
}
