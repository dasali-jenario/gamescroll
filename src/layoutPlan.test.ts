import { describe, expect, it } from 'vitest'
import {
  layoutPlanAscii,
  renderLayoutPreviewPng,
  validateLayoutPlan,
} from './lib/layoutPlan'
import { inferMechanic, mechanicSeedMessage } from './lib/mechanics'

const goodPlan = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.06, band: 'title' as const },
  { id: 'focus', x: 0.25, y: 0.32, w: 0.5, h: 0.22, band: 'focal' as const },
  { id: 'start', x: 0.15, y: 0.72, w: 0.7, h: 0.08, band: 'cta' as const },
]

describe('layoutPlan', () => {
  it('accepts a clear portrait plan', () => {
    expect(validateLayoutPlan(goodPlan)).toEqual({ ok: true, plan: goodPlan })
  })

  it('rejects overlapping rects', () => {
    const bad = validateLayoutPlan([
      { id: 'a', x: 0.2, y: 0.3, w: 0.4, h: 0.2, band: 'focal' },
      { id: 'b', x: 0.3, y: 0.35, w: 0.4, h: 0.2, band: 'hint' },
    ])
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('overlaps'))).toBe(true)
    }
  })

  it('rejects CTA outside lower third', () => {
    const bad = validateLayoutPlan([
      { id: 'start', x: 0.15, y: 0.2, w: 0.7, h: 0.08, band: 'cta' },
    ])
    expect(bad.ok).toBe(false)
  })

  it('builds ascii wireframe', () => {
    const ascii = layoutPlanAscii(goodPlan)
    expect(ascii).toContain('layout wireframe')
    expect(ascii).toContain('A=title')
  })

  it('renders a PNG preview', async () => {
    const png = await renderLayoutPreviewPng(goodPlan)
    expect(png[0]).toBe(137)
    expect(png[1]).toBe(80)
    expect(png[2]).toBe(78)
    expect(png[3]).toBe(71)
    expect(png.length).toBeGreaterThan(100)
  })
})

describe('mechanics', () => {
  it('infers reaction / drag / stack', () => {
    expect(inferMechanic('green light reaction timer')).toBe('reaction')
    expect(inferMechanic('drag to catch falling fruit')).toBe('drag')
    expect(inferMechanic('stack the blocks by tapping')).toBe('stack')
  })

  it('returns a seed for each family', () => {
    expect(mechanicSeedMessage('timing')).toContain('timing')
    expect(mechanicSeedMessage('custom')).toContain('custom')
  })
})
