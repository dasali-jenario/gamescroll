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
    expect(app).toContain('clearForNavigate')
    expect(app).toContain('scrollToIndex')
  })

  it('does not re-inline the old monolithic session state machine in App', () => {
    expect(app).not.toContain('runFeedIntroReel')
    expect(app).not.toContain('appendFeedWindow')
    expect(app).not.toContain('watchForDeployUpdate')
    expect(app).not.toContain('recordHighscore')
    expect(app.length).toBeLessThan(12_000)
  })

  it('puts boot / prune / intro in useFeedSession', () => {
    expect(feedSession).toContain('export function useFeedSession')
    expect(feedSession).toContain('runFeedIntroReel')
    expect(feedSession).toContain('appendFeedWindow')
    expect(feedSession).toContain('fetchApprovedUgcGames')
    expect(feedSession).toContain('buildFeedBatch')
    expect(feedSession).toContain('trackFeedPruned')
  })

  it('puts play / scores / rail hint / cue / deploy reload in usePlaySession', () => {
    expect(playSession).toContain('export function usePlaySession')
    expect(playSession).toContain('setRailHintVisible(false)')
    expect(playSession).toContain('watchForDeployUpdate')
    expect(playSession).toContain('recordHighscore')
    expect(playSession).toContain('setGameOver')
    expect(playSession).toContain('setCueVisible(true)')
  })

  it('puts keyboard / swipe / play-mode scroll lock in useFeedGestures', () => {
    expect(feedGestures).toContain('export function useFeedGestures')
    expect(feedGestures).toContain('ArrowDown')
    expect(feedGestures).toContain('endSwipe')
    expect(feedGestures).toContain('touchmove')
    expect(feedGestures).toContain('wheel')
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
