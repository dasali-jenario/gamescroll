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
  betterScore,
  isLowerBetterScore,
} from './highscores'
import {
  RAIL_HINT_CLASS,
  shouldShowRailHint,
  shouldShowSilentSwipeRail,
} from './lib/playPresentation'
import { noteFeedSwipe } from './metrics'

export default function App() {
  const enterPlayRef = useRef<(key: string, gameId: string) => void>(() => {})
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

  const goToRandomGame = useCallback(() => {
    if (play.applyPendingReload()) return
    if (feed.introRunning) {
      feed.cancelIntro()
      return
    }
    play.dismissCue()
    play.clearForNavigate()
    const items = feed.feedRefState.current
    const currentId = items[feed.activeIndex]?.game.id
    const candidates = items
      .map((item, i) => ({ i, id: item.game.id }))
      .filter((c) => c.id !== currentId)
    const target =
      candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)].i
        : feed.activeIndex + 1
    feed.scrollToIndex(target)
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
    paused: play.paused,
    cancelIntro: feed.cancelIntro,
    goToNextGame,
    goToPrevGame,
    playAgain: play.playAgain,
    pausePlay: play.pausePlay,
    resumePlay: play.resumePlay,
  })

  const [liked, setLiked] = useState<Record<string, boolean>>({})

  const activeGame = feed.feed[feed.activeIndex]?.game
  const activeHighscore = activeGame ? play.highscores[activeGame.id] ?? 0 : 0
  const overlayOpen = !!(play.gameOver || play.paused)

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
    paused: play.paused,
    introRunning: feed.introRunning,
  })

  const toggleLike = () => {
    if (!activeGame) return
    setLiked((prev) => ({
      ...prev,
      [activeGame.id]: !prev[activeGame.id],
    }))
  }

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
        <div className="top-bar-row">
          <div className="brand-mark" aria-label="Gamescroll">
            <span className="brand-mark-dot" aria-hidden="true" />
            Gamescroll
          </div>
        </div>
        <div className="brand-block">
          <div className="title-row">
            <div className="game-title">{activeGame?.title ?? ''}</div>
            {play.playingKey && activeHighscore > 0 && (
              <div
                className="highscore"
                aria-label={
                  activeGame && isLowerBetterScore(activeGame.id)
                    ? `My best time ${activeHighscore} milliseconds`
                    : `My best score ${activeHighscore}`
                }
              >
                My best{' '}
                {activeGame && isLowerBetterScore(activeGame.id)
                  ? `${activeHighscore} ms`
                  : activeHighscore}
              </div>
            )}
          </div>
          {activeGame?.tip && <p className="game-tip">{activeGame.tip}</p>}
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
            isPaused={play.playingKey === item.key && play.paused}
            controlsEnabled={
              play.playingKey === item.key && !play.gameOver && !play.paused
            }
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
        isPlaying={!!play.playingKey}
        overlayOpen={overlayOpen}
        onShuffle={goToRandomGame}
        onPlay={() => {
          const item = feed.feed[feed.activeIndex]
          if (!item) return
          play.handlePlay(item.key, item.game.id)
        }}
        onPause={play.pausePlay}
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

      {play.gameOver && play.playingKey && activeGame && (
        <GameOverOverlay
          mode="over"
          game={activeGame}
          score={play.gameOver.score}
          best={betterScore(
            play.gameOver.gameId,
            activeHighscore,
            play.gameOver.score,
          )}
          previousBest={play.gameOver.previousBest}
          lowerIsBetter={isLowerBetterScore(play.gameOver.gameId)}
          liked={!!liked[activeGame.id]}
          onLike={toggleLike}
          onPlayAgain={play.playAgain}
          onPlayAnother={goToNextGame}
        />
      )}

      {play.paused && play.playingKey && activeGame && !play.gameOver && (
        <GameOverOverlay
          mode="paused"
          game={activeGame}
          score={play.liveScore}
          best={activeHighscore}
          previousBest={activeHighscore}
          lowerIsBetter={isLowerBetterScore(activeGame.id)}
          liked={!!liked[activeGame.id]}
          onLike={toggleLike}
          onPlayAgain={play.resumePlay}
          onPlayAnother={goToNextGame}
        />
      )}
    </div>
  )
}
