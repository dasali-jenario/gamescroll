/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')
const feedSession = readFileSync(join(root, 'src/hooks/useFeedSession.ts'), 'utf8')
const playSession = readFileSync(join(root, 'src/hooks/usePlaySession.ts'), 'utf8')
const feedGestures = readFileSync(
  join(root, 'src/hooks/useFeedGestures.ts'),
  'utf8',
)
const bottomNav = readFileSync(
  join(root, 'src/components/BottomNav.tsx'),
  'utf8',
)
const gameOver = readFileSync(
  join(root, 'src/components/GameOverOverlay.tsx'),
  'utf8',
)
const gameCard = readFileSync(join(root, 'src/components/GameCard.tsx'), 'utf8')
const likedPanel = readFileSync(
  join(root, 'src/components/LikedGamesPanel.tsx'),
  'utf8',
)
const gameWrap = readFileSync(join(root, 'src/lib/gameWrap.ts'), 'utf8')
const feedCss = readFileSync(join(root, 'src/styles/feed.css'), 'utf8')

describe('App shell hook split', () => {
  it('keeps App as a composition shell that wires the three session hooks', () => {
    expect(app).toContain("from './hooks/useFeedSession'")
    expect(app).toContain("from './hooks/usePlaySession'")
    expect(app).toContain("from './hooks/useFeedGestures'")
    expect(app).toContain('useFeedSession(')
    expect(app).toContain('usePlaySession(')
    expect(app).toContain('useFeedGestures(')
    // Navigation glue stays in App between feed + play.
    expect(app).toContain('goToNextGame')
    expect(app).toContain('goToPrevGame')
    expect(app).toContain('goToRandomGame')
    expect(app).toContain('clearForNavigate')
    expect(app).toContain('scrollToIndex')
  })

  it('does not re-inline the old monolithic session state machine in App', () => {
    expect(app).not.toContain('runFeedIntroReel')
    expect(app).not.toContain('appendFeedWindow')
    expect(app).not.toContain('watchForDeployUpdate')
    expect(app).not.toContain('recordHighscore')
    expect(app.length).toBeLessThan(14_000)
  })

  it('puts boot / prune / intro in useFeedSession', () => {
    expect(feedSession).toContain('export function useFeedSession')
    expect(feedSession).toContain('runFeedIntroReel')
    expect(feedSession).toContain('appendFeedWindow')
    expect(feedSession).toContain('fetchApprovedUgcGames')
    expect(feedSession).toContain('buildFeedBatch')
    expect(feedSession).toContain('trackFeedPruned')
    expect(feedSession).toContain('jumpToGameId')
    expect(feedSession).toContain('knownGame')
    expect(feedSession).toContain('pinScrollToGameId')
    expect(feedSession).toContain('pinGameIdRef')
    expect(feedSession).toContain('scrollTopForIndex')
    expect(feedSession).toContain('indexFromScrollTop')
  })

  it('puts play / pause / scores / rail hint / cue / deploy reload in usePlaySession', () => {
    expect(playSession).toContain('export function usePlaySession')
    expect(playSession).toContain('setRailHintVisible(false)')
    expect(playSession).toContain('watchForDeployUpdate')
    expect(playSession).toContain('recordHighscore')
    expect(playSession).toContain('setGameOver')
    expect(playSession).toContain('setPaused')
    expect(playSession).toContain('resumePlay')
    expect(playSession).toContain('liveScore')
    expect(playSession).toContain('setCueVisible(true)')
  })

  it('puts keyboard / swipe / play-mode scroll lock in useFeedGestures', () => {
    expect(feedGestures).toContain('export function useFeedGestures')
    expect(feedGestures).toContain('ArrowDown')
    expect(feedGestures).toContain('endSwipe')
    expect(feedGestures).toContain('touchmove')
    expect(feedGestures).toContain('wheel')
    expect(feedGestures).toContain('resumePlay')
    expect(feedGestures).toContain('paused')
  })

  it('ships the hook modules on disk', () => {
    for (const rel of [
      'src/hooks/useFeedSession.ts',
      'src/hooks/usePlaySession.ts',
      'src/hooks/useFeedGestures.ts',
    ]) {
      expect(existsSync(join(root, rel)), `missing ${rel}`).toBe(true)
    }
  })
})

describe('feed chrome contracts', () => {
  it('keeps like/share off the bottom nav; top bar + end/pause overlay own them', () => {
    expect(bottomNav).toContain('shuffle-btn')
    expect(bottomNav).toContain('likes-btn')
    expect(bottomNav).toContain('onOpenLikes')
    expect(bottomNav).toContain('nav-play-btn')
    expect(bottomNav).toContain('PrivacyDisclosure')
    expect(bottomNav).not.toContain('shareGame')
    expect(bottomNav).not.toContain('onLike')

    expect(app).toContain('TopBarActions')
    expect(app).toContain('liked={activeLiked}')
    expect(feedCss).toContain('.top-bar-actions')

    expect(gameOver).toContain("mode === 'paused'")
    expect(gameOver).toContain('Resume')
    expect(gameOver).toContain('Play again')
    expect(gameOver).toContain('Play another')
    expect(gameOver).toContain('like-btn')
    expect(gameOver).toContain('shareGame')
  })

  it('wires shuffle, liked library, pause overlay, and soft-resume from App', () => {
    expect(app).toContain('onShuffle={goToRandomGame}')
    expect(app).toContain('onOpenLikes=')
    expect(app).toContain('LikedGamesPanel')
    expect(app).toContain('goToLikedGame')
    expect(app).toContain('pendingLikedJumpRef')
    expect(app).toContain('pendingLikedPlayKeyRef')
    expect(app).toContain('likedJumpNonce')
    expect(app).toContain('jumpToGameId')
    expect(app).toContain('pinScrollToGameId')
    expect(app).toContain('clearGamePin')
    expect(app).toContain('ResizeObserver')
    expect(app).toContain('onPause={play.pausePlay}')
    expect(app).toContain('mode="paused"')
    expect(app).toContain('mode="over"')
    expect(app).toContain('onPlayAgain={play.resumePlay}')
    expect(app).toContain('onPlayAgain={play.playAgain}')
    expect(app).toContain('isPaused={play.playingKey === item.key && play.paused}')
    expect(app).not.toContain('className="pause-btn"')
  })

  it('liked jumps insert at the visible index and play only after the card commits', () => {
    expect(feedSession).toContain('liked-${Date.now()}')
    expect(feedSession).toContain('knownGame')
    expect(feedSession).toContain('indexFromScrollTop')
    expect(feedSession).toContain('replace in place')
    expect(app).toContain('pendingLikedPlayKeyRef.current = item.key')
    expect(app).toContain('feed.feed.findIndex((item) => item.key === key)')
    expect(likedPanel).toContain('onPlay(game)')
    expect(likedPanel).not.toContain('onPlay(game.id)')
  })

  it('sizes feed cards to the feed viewport (not 100dvh) for jump alignment', () => {
    expect(feedCss).toMatch(/\.card\s*\{[^}]*height:\s*100%;/s)
    expect(feedCss).not.toMatch(/\.card\s*\{[^}]*height:\s*100dvh;/s)
  })

  it('soft-resumes paused games without resetting unless forceReset', () => {
    expect(gameWrap).toContain('started: false')
    expect(gameWrap).toContain('forceReset')
    expect(gameWrap).toContain('const resuming = GS.started && GS.paused && !forceReset')
    expect(gameWrap).toContain('if (!resuming && typeof onHostStart === \'function\') onHostStart()')

    expect(gameCard).toContain('forceReset: freshStart')
    expect(gameCard).toContain('forceReset: true')
    expect(gameCard).toContain('isPaused')
  })

  it('centers play/pause in the fixed bottom nav styles', () => {
    expect(feedCss).toContain('.nav-play-btn')
    expect(feedCss).toContain('.shuffle-btn')
    expect(feedCss).toContain('.game-over-panel')
    expect(feedCss).toMatch(/\.bottom-nav \{[\s\S]*?justify-content:\s*space-between/)
  })
})
