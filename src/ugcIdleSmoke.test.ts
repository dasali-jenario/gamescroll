import { describe, expect, it } from 'vitest'
import { smokeGameBody } from './lib/gameSmoke'
import { validateGameBody } from './lib/gameValidator'

/** Minimal legal body that paints safely before onHostStart. */
const okBody = `
const btn={x:0,y:0,w:0,h:0}
function layout(){
  btn.w=Math.min(300, Math.max(200, W*0.72))
  btn.h=64
  btn.x=(W-btn.w)/2
  btn.y=H*0.74
}
function reset(){ setScore(0); layout() }
function die(){ reset() }
function tick(dt){ if (GS.paused) return }
function draw(){ ctx.fillStyle = '#123'; ctx.fillRect(0,0,W,H); ctx.fillRect(btn.x,btn.y,btn.w,btn.h) }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown', (e) => {
  if (GS.paused) return
  const r = canvas.getBoundingClientRect()
  const x = (e.clientX - r.left) * (W / r.width)
  const y = (e.clientY - r.top) * (H / r.height)
  if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) bump(1)
})
`

/**
 * Regression: Wordle Mini blank screen — draw read empty grid / layoutRects
 * before onHostStart, threw, and killed the rAF loop.
 */
const brokenIdleWordle = `
let answer = "", phase = "idle", grid = [], row = 0, col = 0, layoutRects = {}
function layout(){
  layoutRects.title = {x:W*0.1, y:H*0.14, w:W*0.8, h:H*0.06}
  layoutRects.grid = {x:W*0.08, y:H*0.22, w:W*0.84, h:H*0.36}
  layoutRects.hint = {x:W*0.1, y:H*0.6, w:W*0.8, h:H*0.05}
  layoutRects.kb = {x:W*0.05, y:H*0.68, w:W*0.9, h:H*0.22}
  layoutRects.cells = []
  layoutRects.kbKeys = []
}
function reset(){
  layout()
  grid = Array(6).fill(0).map(() => Array(5).fill(""))
  phase = "play"
}
function onHostStart(){ reset() }
function onResize(){ layout() }
function die(){ phase = "fail" }
function tick(){ if (GS.paused) return }
function draw(){
  // throws when grid is still [] (before reset) — blank teal shell in production
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const ch = grid[r][c]
      ctx.fillText(ch || '', 0, 0)
    }
  }
  ctx.fillText('Wordle', W/2, layoutRects.title.y)
}
canvas.addEventListener('pointerdown', () => {})
`

describe('idle / browse smoke (Wordle-class regressions)', () => {
  it('accepts a body that paints before onHostStart', () => {
    expect(validateGameBody(okBody)).toEqual({ ok: true })
    expect(smokeGameBody(okBody)).toEqual({ ok: true })
  })

  it('fails bodies that throw on idle draw before start', () => {
    const bad = smokeGameBody(brokenIdleWordle)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('idle draw'))).toBe(true)
    }
  })
})
