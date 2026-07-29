import { describe, expect, it } from 'vitest'
import {
  LAYOUT_FIDELITY_EPS,
  checkBodyLayoutFidelity,
  collectRectsFromGraph,
  compareLayoutFidelity,
  harvestLayoutRects,
} from './lib/layoutFidelity'
import type { LayoutRect } from './lib/layoutPlan'

const plan: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.06, band: 'title' },
  { id: 'focus', x: 0.25, y: 0.32, w: 0.5, h: 0.22, band: 'focal' },
  { id: 'start', x: 0.15, y: 0.72, w: 0.7, h: 0.08, band: 'cta' },
]

const faithfulBody = `
const layoutRects = {}
function scorePos(){ return [0,0] }
function diePos(){ return [0,0] }
function layout(){
  layoutRects.title = { x: W*0.1, y: H*0.14, w: W*0.8, h: H*0.06 }
  layoutRects.focus = { x: W*0.25, y: H*0.32, w: W*0.5, h: H*0.22 }
  layoutRects.start = { x: W*0.15, y: H*0.72, w: W*0.7, h: H*0.08 }
}
function reset(){ layout() }
function die(){ reset() }
function tick(){}
function draw(){}
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown', () => {})
`

const driftedBody = `
const layoutRects = {}
function layout(){
  layoutRects.title = { x: W*0.1, y: H*0.14, w: W*0.8, h: H*0.06 }
  layoutRects.focus = { x: W*0.25, y: H*0.32, w: W*0.5, h: H*0.22 }
  // CTA far from plan (upper third)
  layoutRects.start = { x: W*0.15, y: H*0.2, w: W*0.7, h: H*0.08 }
}
function tick(){}
function draw(){}
function die(){}
function onHostStart(){ layout() }
function onResize(){ layout() }
`

const noHarvestBody = `
const btn={x:0,y:0,w:0,h:0}
function layout(){
  btn.w=W*0.7; btn.h=H*0.08; btn.x=(W-btn.w)/2; btn.y=H*0.72
}
function tick(){}
function draw(){}
function die(){}
function onHostStart(){ layout() }
function onResize(){ layout() }
`

describe('layoutFidelity', () => {
  it('collects named rects from a graph', () => {
    const rects = collectRectsFromGraph(
      {
        title: { x: 1, y: 2, w: 3, h: 4 },
        skip: 'nope',
        focus: { x: 5, y: 6, w: 7, h: 8 },
      },
      ['title', 'focus', 'start'],
    )
    expect(rects).toEqual([
      { id: 'title', x: 1, y: 2, w: 3, h: 4 },
      { id: 'focus', x: 5, y: 6, w: 7, h: 8 },
    ])
  })

  it('passes when harvested px match plan fractions', () => {
    const harvested = plan.map((p) => ({
      id: p.id,
      x: p.x * 390,
      y: p.y * 844,
      w: p.w * 390,
      h: p.h * 844,
    }))
    expect(compareLayoutFidelity(plan, harvested)).toEqual({ ok: true, compared: 3 })
  })

  it('fails when a rect drifts beyond ε', () => {
    const harvested = plan.map((p) => ({
      id: p.id,
      x: p.x * 390,
      y: p.y * 844,
      w: p.w * 390,
      h: p.h * 844,
    }))
    harvested[2] = { ...harvested[2], y: 0.2 * 844 }
    const bad = compareLayoutFidelity(plan, harvested, { eps: LAYOUT_FIDELITY_EPS })
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('"start"') && e.includes('drifts'))).toBe(true)
    }
  })

  it('harvests layoutRects after layout()', () => {
    const h = harvestLayoutRects(faithfulBody, plan.map((p) => p.id))
    expect(h.ok).toBe(true)
    if (h.ok) {
      expect(h.source).toBe('layoutRects')
      expect(h.rects.map((r) => r.id).sort()).toEqual(['focus', 'start', 'title'])
    }
  })

  it('checkBodyLayoutFidelity accepts a faithful body', () => {
    const r = checkBodyLayoutFidelity(faithfulBody, plan)
    expect(r).toEqual({ ok: true, compared: 3, source: 'layoutRects' })
  })

  it('checkBodyLayoutFidelity rejects drifted rects', () => {
    const r = checkBodyLayoutFidelity(driftedBody, plan)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.missingHarvest).toBe(false)
      expect(r.errors.some((e) => e.includes('start'))).toBe(true)
    }
  })

  it('reports missingHarvest when body has no harvest graph', () => {
    const r = checkBodyLayoutFidelity(noHarvestBody, plan)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.missingHarvest).toBe(true)
    }
  })

  it('can soft-skip missing harvest when requireHarvest=false', () => {
    const r = checkBodyLayoutFidelity(noHarvestBody, plan, { requireHarvest: false })
    expect(r).toEqual({ ok: true, compared: 0, source: null })
  })
})
