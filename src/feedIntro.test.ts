import { describe, expect, it } from 'vitest'
import {
  buildReelSequence,
  reelDelayBeforeStep,
} from './lib/feedIntro'

describe('buildReelSequence', () => {
  it('lands on 0 after climbing neighbors', () => {
    expect(buildReelSequence(10)).toEqual([0, 1, 2, 3, 4, 0])
  })

  it('caps peak to feed length', () => {
    expect(buildReelSequence(3)).toEqual([0, 1, 2, 0])
  })

  it('handles a single card', () => {
    expect(buildReelSequence(1)).toEqual([0])
  })
})

describe('reelDelayBeforeStep', () => {
  it('is instant for the first step and longer for the landing', () => {
    const count = 6
    expect(reelDelayBeforeStep(0, count)).toBe(0)
    expect(reelDelayBeforeStep(count - 1, count)).toBe(320)
    expect(reelDelayBeforeStep(2, count)).toBeLessThan(
      reelDelayBeforeStep(1, count),
    )
  })
})
