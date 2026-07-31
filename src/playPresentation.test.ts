/** @vitest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PLAY_INSET_SIDE,
  RAIL_HINT_CLASS,
  isPortraitPlayfield,
  playInsetsAreSymmetric,
  playfieldSize,
  shouldShowRailHint,
  shouldShowSilentSwipeRail,
} from './lib/playPresentation'

const root = process.cwd()
const baseCss = readFileSync(join(root, 'src/styles/base.css'), 'utf8')
const feedCss = readFileSync(join(root, 'src/styles/feed.css'), 'utf8')
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')

function cssVar(name: string): string | null {
  const re = new RegExp(`--${name}:\\s*([^;]+);`)
  const m = baseCss.match(re)
  return m ? m[1].trim() : null
}

describe('playInsetsAreSymmetric', () => {
  it('accepts matching side gutters', () => {
    expect(
      playInsetsAreSymmetric({
        left: PLAY_INSET_SIDE,
        right: PLAY_INSET_SIDE,
      }),
    ).toBe(true)
  })

  it('rejects a rail-skewed right gutter', () => {
    expect(
      playInsetsAreSymmetric({ left: '0.5rem', right: '2.75rem' }),
    ).toBe(false)
  })
})

describe('rail hint lifecycle', () => {
  it('shows the dark rail only before the first game starts', () => {
    expect(
      shouldShowRailHint({ railHintVisible: true, playingKey: null }),
    ).toBe(true)
    expect(
      shouldShowRailHint({ railHintVisible: true, playingKey: 'card-0' }),
    ).toBe(false)
    expect(
      shouldShowRailHint({ railHintVisible: false, playingKey: null }),
    ).toBe(false)
  })

  it('keeps an invisible edge capture only while input is enabled', () => {
    expect(
      shouldShowSilentSwipeRail({
        playingKey: 'card-0',
        gameOver: false,
        introRunning: false,
      }),
    ).toBe(true)
    expect(
      shouldShowSilentSwipeRail({
        playingKey: 'card-0',
        gameOver: true,
        introRunning: false,
      }),
    ).toBe(false)
    expect(
      shouldShowSilentSwipeRail({
        playingKey: 'card-0',
        gameOver: false,
        paused: true,
        introRunning: false,
      }),
    ).toBe(false)
    expect(
      shouldShowSilentSwipeRail({
        playingKey: null,
        gameOver: false,
        introRunning: false,
      }),
    ).toBe(false)
  })
})

describe('playfield geometry', () => {
  it('yields a portrait playfield on a phone viewport with equal side insets', () => {
    const size = playfieldSize({
      viewportWidth: 390,
      viewportHeight: 844,
      topPx: 86,
      bottomPx: 62,
      sidePx: 8,
    })
    expect(isPortraitPlayfield(size)).toBe(true)
    expect(size.aspectRatio).toBeGreaterThan(1.2)
  })

  it('stays symmetric when left and right sides match', () => {
    const size = playfieldSize({
      viewportWidth: 390,
      viewportHeight: 844,
      topPx: 86,
      bottomPx: 62,
      sidePx: 8,
    })
    // Equal sides → full width minus 2*side; a 2.75rem-only right rail would shrink width unevenly.
    expect(size.width).toBe(390 - 16)
  })
})

describe('host CSS / App presentation contract', () => {
  it('declares equal play-inset left and right gutters', () => {
    const left = cssVar('play-inset-left')
    const right = cssVar('play-inset-right')
    expect(left).toBe(PLAY_INSET_SIDE)
    expect(right).toBe(PLAY_INSET_SIDE)
    expect(playInsetsAreSymmetric({ left: left!, right: right! })).toBe(true)
  })

  it('letterboxes the stage with chrome insets at all times (stable playfield)', () => {
    // Base .stage — not only .card.is-playing — so start does not resize the iframe.
    const stageBlock = feedCss.match(/\.stage \{([\s\S]*?)\n\}/)
    expect(stageBlock?.[1]).toMatch(/top:\s*var\(--chrome-top\)/)
    expect(stageBlock?.[1]).toMatch(/right:\s*var\(--play-inset-right\)/)
    expect(stageBlock?.[1]).toMatch(/left:\s*var\(--play-inset-left\)/)
    expect(stageBlock?.[1]).toMatch(/bottom:\s*var\(--play-inset-bottom\)/)
    expect(feedCss).toContain('.card.is-playing .stage')
  })

  it('sizes the top bar from content + safe-area (no circular min-height)', () => {
    const block = feedCss.match(/\.top-bar \{([\s\S]*?)\n\}/)
    expect(block?.[1]).toMatch(
      /padding:\s*calc\(0\.55rem \+ var\(--safe-top\)\)/,
    )
    expect(block?.[1]).not.toMatch(/min-height:\s*var\(--chrome-top\)/)
    expect(baseCss).toMatch(/--safe-top:\s*env\(safe-area-inset-top/)
  })

  it('locks the bottom nav to a fixed height so it cannot expand', () => {
    const block = feedCss.match(/\.bottom-nav \{([\s\S]*?)\n\}/)
    expect(block?.[1]).toMatch(/height:\s*var\(--bottom-nav\)/)
    expect(block?.[1]).toMatch(/min-height:\s*var\(--bottom-nav\)/)
    expect(block?.[1]).toMatch(/max-height:\s*var\(--bottom-nav\)/)
    expect(block?.[1]).toMatch(/overflow:\s*hidden/)
    expect(block?.[1]).toMatch(/justify-content:\s*space-between/)
    expect(baseCss).toMatch(/touch-action:\s*manipulation/)
  })

  it('styles the shared end-of-round / pause panel as a paper card', () => {
    expect(feedCss).toContain('.game-over-panel')
    expect(feedCss).toContain('.game-over-social')
    expect(feedCss).toContain('.game-over-again')
    expect(feedCss).toMatch(/\.game-over-panel \{[\s\S]*?background:\s*var\(--paper\)/)
  })

  it('keeps the dark rail as a hint class, not a play-mode letterbox reserve', () => {
    expect(feedCss).toContain(`.${RAIL_HINT_CLASS}`)
    expect(feedCss).toMatch(
      /\.swipe-rail--hint[\s\S]*?background:\s*linear-gradient/,
    )
    // Base capture rail must stay transparent (no dark bar while playing).
    const baseBlock = feedCss.match(
      /\/\* Invisible right-edge[\s\S]*?\.swipe-rail \{([\s\S]*?)\}/,
    )
    expect(baseBlock?.[1]).toMatch(/background:\s*transparent/)
    expect(baseBlock?.[1]).not.toMatch(/linear-gradient/)
  })

  it('hides the dark rail hint once enterPlay starts the first game', () => {
    const playSession = readFileSync(
      join(root, 'src/hooks/usePlaySession.ts'),
      'utf8',
    )
    expect(playSession).toContain('setRailHintVisible(false)')
    expect(app).toContain('shouldShowRailHint(')
    expect(app).toContain('shouldShowSilentSwipeRail(')
    expect(app).toContain('RAIL_HINT_CLASS')
  })
})
