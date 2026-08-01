import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { GameCard } from './components/GameCard'
import { GameOverOverlay } from './components/GameOverOverlay'
import { LikedGamesPanel } from './components/LikedGamesPanel'
import { SwipeCue } from './components/SwipeCue'
import { TopBarActions } from './components/TopBarActions'
import { useChromeInsets } from './hooks/useChromeInsets'
import { useFeedGestures } from './hooks/useFeedGestures'
import { useFeedSession } from './hooks/useFeedSession'
import { usePlaySession } from './hooks/usePlaySession'
import { getGameById, type Game } from './games'
import {
  betterScore,
  isLowerBetterScore,
} from './highscores'
import { loadLikedIds, toggleLikedId } from './likes'
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

  const [likedIds, setLikedIds] = useState(loadLikedIds)
  const [likesOpen, setLikesOpen] = useState(false)
  const pendingLikedJumpRef = useRef<Game | null>(null)
  const pendingLikedPlayKeyRef = useRef<string | null>(null)
  const [likedJumpNonce, setLikedJumpNonce] = useState(0)

  const activeGame = feed.feed[feed.activeIndex]?.game
  const activeHighscore = activeGame ? play.highscores[activeGame.id] ?? 0 : 0
  const overlayOpen = !!(play.gameOver || play.paused)
  const activeLiked = !!(activeGame && likedIds.includes(activeGame.id))

  const likedGames = useMemo(() => {
    const fromFeed = new Map(
      feed.feed.map((item) => [item.game.id, item.game] as const),
    )
    return likedIds
      .map((id) => getGameById(id) ?? fromFeed.get(id))
      .filter((game): game is NonNullable<typeof game> => !!game)
  }, [likedIds, feed.feed])

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
    setLikedIds(toggleLikedId(activeGame.id))
  }

  const goToLikedGame = useCallback(
    (game: Game) => {
      if (play.applyPendingReload()) return
      if (feed.introRunning) feed.cancelIntro()
      play.dismissCue()
      play.clearForNavigate()
      // Close the sheet first, then insert+play after layout so the new card
      // exists in the DOM before we scroll / start it.
      pendingLikedJumpRef.current = game
      pendingLikedPlayKeyRef.current = null
      setLikesOpen(false)
      setLikedJumpNonce((n) => n + 1)
    },
    [
      play.applyPendingReload,
      play.dismissCue,
      play.clearForNavigate,
      feed.introRunning,
      feed.cancelIntro,
    ],
  )

  // Pass 1: insert a fresh liked card at the visible index (no scroll yet).
  useLayoutEffect(() => {
    const game = pendingLikedJumpRef.current
    if (!game || likesOpen) return
    pendingLikedJumpRef.current = null
    const item = feed.jumpToGameId(game.id, game)
    if (!item) {
      feed.clearGamePin()
      return
    }
    pendingLikedPlayKeyRef.current = item.key
  }, [likedJumpNonce, likesOpen, feed.jumpToGameId, feed.clearGamePin])

  // Pass 2: after React commits the inserted card, pin scroll and start it.
  useLayoutEffect(() => {
    const key = pendingLikedPlayKeyRef.current
    if (!key || likesOpen) return
    const index = feed.feed.findIndex((item) => item.key === key)
    if (index < 0) return
    const item = feed.feed[index]
    if (!item) return
    pendingLikedPlayKeyRef.current = null

    feed.pinScrollToGameId(item.game.id, key)
    play.handlePlay(item.key, item.game.id)
    noteFeedSwipe({
      feedLen: feed.feedRefState.current.length,
      activeIndex: feed.activeIndexRef.current,
    })

    const el = feed.feedRef.current
    const repin = () => feed.pinScrollToGameId(item.game.id, key)
    const ro =
      typeof ResizeObserver !== 'undefined' && el
        ? new ResizeObserver(repin)
        : null
    if (ro && el) ro.observe(el)
    let frames = 0
    let raf = 0
    const tick = () => {
      repin()
      frames += 1
      if (frames < 6) {
        raf = window.requestAnimationFrame(tick)
        return
      }
      ro?.disconnect()
      feed.clearGamePin()
    }
    raf = window.requestAnimationFrame(tick)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [
    likedJumpNonce,
    likesOpen,
    feed.feed,
    feed.pinScrollToGameId,
    feed.clearGamePin,
    feed.feedRef,
    feed.feedRefState,
    feed.activeIndexRef,
    play.handlePlay,
  ])

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
          {activeGame && (
            <TopBarActions
              game={activeGame}
              liked={activeLiked}
              onLike={toggleLike}
            />
          )}
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
        likedCount={likedIds.length}
        onShuffle={goToRandomGame}
        onOpenLikes={() => setLikesOpen(true)}
        onPlay={() => {
          const item = feed.feed[feed.activeIndex]
          if (!item) return
          play.handlePlay(item.key, item.game.id)
        }}
        onPause={play.pausePlay}
      />

      <LikedGamesPanel
        open={likesOpen}
        games={likedGames}
        onClose={() => setLikesOpen(false)}
        onPlay={goToLikedGame}
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
          liked={activeLiked}
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
          liked={activeLiked}
          onLike={toggleLike}
          onPlayAgain={play.resumePlay}
          onPlayAnother={goToNextGame}
        />
      )}
    </div>
  )
}
