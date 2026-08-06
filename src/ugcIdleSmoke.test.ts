import { describe, expect, it } from 'vitest'
import { smokeGameBody } from './lib/gameSmoke'
import { validateGameBody } from './lib/gameValidator'

/** Minimal legal body that paints safely before onHostStart (official PF style). */
const okBody = `
const btn={x:0,y:0,w:0,h:0}
function scorePos(){ return [btn.x+btn.w/2, btn.y] }
function diePos(){ return [btn.x+btn.w/2, btn.y] }
function layout(){
  btn.w=Math.min(300, Math.max(200, W*0.72))
  btn.h=64
  btn.x=(W-btn.w)/2
  btn.y=H*0.74
}
function reset(){ setScore(0); layout() }
function die(){ reset() }
function tick(dt){ if (GS.paused) return }
function draw(){
  PF.sky(ctx, W, H, '#123', '#234', '#345')
  PF.blobs(ctx, W, H, '#456', 4)
  PF.block(ctx, btn.x, btn.y, btn.w, btn.h, '#fff', '#ccc', 8)
}
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

/**
 * Freeform Sudoku-class idle crash (2026-08-06 creator_run_logs):
 * board=[] until onHostStart, draw does board[r][c] → reading '0' of undefined.
 */
const brokenIdleEmptyBoard = `
const LAYOUT_PLAN = [{"id":"title","x":0.1,"y":0.14,"w":0.8,"h":0.06,"band":"title"},{"id":"focus","x":0.1,"y":0.28,"w":0.8,"h":0.36,"band":"focal"},{"id":"hint","x":0.1,"y":0.66,"w":0.8,"h":0.05,"band":"hint"},{"id":"cta","x":0.15,"y":0.74,"w":0.7,"h":0.08,"band":"cta"}]
let L = {}, board = [], cell = 40, gridRect = {x:40,y:200,w:200,h:200}
function layoutRects(){ return L }
function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }
function scorePos(){ return [W/2,H/2] }
function diePos(){ return [W/2,H/2] }
function reset(){ layout(); board = [[1,0],[0,2]]; setScore(0) }
function onHostStart(){ reset() }
function onResize(){ layout() }
function die(){ reset() }
function tick(){ if (GS.paused) return }
function draw(){
  PF.sky(ctx,W,H,'#fff','#eee','#ddd')
  for (let r=0;r<2;r++) for (let c=0;c<2;c++) {
    if (board[r][c]) ctx.fillText(String(board[r][c]), 0, 0)
  }
}
layout()
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

  it('fails empty-board grid indexing before onHostStart (Sudoku-class)', () => {
    const bad = smokeGameBody(brokenIdleEmptyBoard)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('idle draw'))).toBe(true)
      expect(bad.errors.some((e) => /reading '0'|reading \"0\"/i.test(e))).toBe(true)
      // Stack snippet must land in creator_run_logs for offline debugging.
      expect(bad.errors.some((e) => e.includes('::'))).toBe(true)
    }
  })
})
