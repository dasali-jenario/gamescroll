import { describe, expect, it } from 'vitest'
import { layoutFromPlan } from './lib/layoutPlan'
import { smokeGameBody } from './lib/gameSmoke'
import { checkBodyLayoutFidelity } from './lib/layoutFidelity'
import {
  applyScaffoldSlots,
  customFreeformSeedMessage,
  firstBuildSeedMessage,
  getScaffold,
  hasArcadeScaffold,
  materializeScaffold,
  missingSlotsBinding,
  replaceLayoutPlanInBody,
} from './lib/mechanicScaffolds'
import { applyLayoutFix } from './lib/layoutMutations'
import { validateGameBody } from './lib/gameValidator'

describe('layoutFromPlan', () => {
  it('maps fractions to pixels by id', () => {
    const L = layoutFromPlan(
      [{ id: 'start', x: 0.15, y: 0.72, w: 0.7, h: 0.08, band: 'cta' }],
      390,
      844,
    )
    expect(L.start.x).toBeCloseTo(0.15 * 390)
    expect(L.start.y).toBeCloseTo(0.72 * 844)
    expect(L.start.w).toBeCloseTo(0.7 * 390)
    expect(L.start.h).toBeCloseTo(0.08 * 844)
  })
})

describe('mechanic scaffolds', () => {
  for (const family of ['reaction', 'timing', 'dodge', 'drag', 'stack'] as const) {
    it(`${family} scaffold validates, smokes, and matches layoutPlan`, () => {
      const built = materializeScaffold(family)
      expect(validateGameBody(built.bodyJs)).toEqual({ ok: true })
      expect(smokeGameBody(built.bodyJs)).toEqual({ ok: true })
      const fidelity = checkBodyLayoutFidelity(built.bodyJs, built.layoutPlan)
      expect(fidelity.ok).toBe(true)
      if (fidelity.ok) {
        expect(fidelity.compared).toBe(built.layoutPlan.length)
        expect(fidelity.source).toBe('layoutRects')
      }
    })
  }

  it('applies slot overrides without breaking harvest', () => {
    const scaffold = getScaffold('reaction')
    const body = applyScaffoldSlots(scaffold.bodyJs, scaffold.defaultSlots, {
      titleText: 'GO',
      sky0: '#112233',
    })
    expect(body).toContain('"titleText":"GO"')
    expect(checkBodyLayoutFidelity(body, scaffold.layoutPlan).ok).toBe(true)
  })

  it('detects bodies that reference SLOTS without const SLOTS', () => {
    expect(missingSlotsBinding('function draw(){ PF.sky(ctx,W,H,String(SLOTS.sky0)) }')).toBe(
      true,
    )
    expect(
      missingSlotsBinding('const SLOTS={sky0:"#000"}\nfunction draw(){ String(SLOTS.sky0) }'),
    ).toBe(false)
  })

  it('does not map custom to reaction; freeform seed is separate', () => {
    expect(hasArcadeScaffold('custom')).toBe(false)
    expect(hasArcadeScaffold('reaction')).toBe(true)
    expect(() => getScaffold('custom')).toThrow(/No arcade scaffold/)
    const free = firstBuildSeedMessage('custom')
    expect(free).toContain('FREEFORM PATH')
    expect(free).toContain('Do NOT substitute')
    expect(free).toBe(customFreeformSeedMessage())
    expect(firstBuildSeedMessage('reaction')).toContain('GOLDEN SCAFFOLD PATH')
  })

  it('replaceLayoutPlanInBody updates the embedded plan', () => {
    const built = materializeScaffold('reaction')
    const mutated = applyLayoutFix(built.layoutPlan, 'move_cta_down')
    expect(mutated.ok).toBe(true)
    if (!mutated.ok) return
    const body = replaceLayoutPlanInBody(built.bodyJs, mutated.plan)
    expect(checkBodyLayoutFidelity(body, mutated.plan).ok).toBe(true)
  })
})

describe('layoutMutations', () => {
  it('enlarges and moves CTA within validateLayoutPlan', () => {
    const plan = getScaffold('reaction').layoutPlan
    const big = applyLayoutFix(plan, 'enlarge_cta')
    expect(big.ok).toBe(true)
    const down = applyLayoutFix(plan, 'move_cta_down')
    expect(down.ok).toBe(true)
  })

  it('fixes synthetic overlap', () => {
    const bad = [
      { id: 'a', x: 0.2, y: 0.3, w: 0.5, h: 0.2, band: 'focal' as const },
      { id: 'b', x: 0.25, y: 0.35, w: 0.5, h: 0.2, band: 'hint' as const },
    ]
    const fixed = applyLayoutFix(bad, 'fix_overlap')
    expect(fixed.ok).toBe(true)
  })
})
