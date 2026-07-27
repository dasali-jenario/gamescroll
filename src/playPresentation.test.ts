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
const css = readFileSync(join(root, 'src/index.css'), 'utf8')
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8')

function cssVar(name: string): string | null {
  const re = new RegExp(`--${name}:\\s*([^;]+);`)
  const m = css.match(re)
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

  it('letterboxes the playing stage with those inset vars', () => {
    expect(css).toContain('.card.is-playing .stage')
    expect(css).toMatch(/right:\s*var\(--play-inset-right\)/)
    expect(css).toMatch(/left:\s*var\(--play-inset-left\)/)
    expect(css).toMatch(/top:\s*var\(--chrome-top\)/)
    expect(css).toMatch(/bottom:\s*var\(--play-inset-bottom\)/)
  })

  it('keeps the dark rail as a hint class, not a play-mode letterbox reserve', () => {
    expect(css).toContain(`.${RAIL_HINT_CLASS}`)
    expect(css).toMatch(
      /\.swipe-rail--hint[\s\S]*?background:\s*linear-gradient/,
    )
    // Base capture rail must stay transparent (no dark bar while playing).
    const baseBlock = css.match(
      /\/\* Invisible right-edge[\s\S]*?\.swipe-rail \{([\s\S]*?)\}/,
    )
    expect(baseBlock?.[1]).toMatch(/background:\s*transparent/)
    expect(baseBlock?.[1]).not.toMatch(/linear-gradient/)
  })

  it('hides the dark rail hint once enterPlay starts the first game', () => {
    expect(app).toContain('setRailHintVisible(false)')
    expect(app).toContain('shouldShowRailHint(')
    expect(app).toContain('shouldShowSilentSwipeRail(')
    expect(app).toContain('RAIL_HINT_CLASS')
  })
})
