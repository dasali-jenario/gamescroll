import { describe, expect, it } from 'vitest'
import { wrapGameHtml } from './lib/gameWrap'
import { smokeGameBody } from './lib/gameSmoke'
import { validateGameBody, validateWrappedHtml } from './lib/gameValidator'

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

describe('gameValidator', () => {
  it('accepts a minimal legal body', () => {
    expect(validateGameBody(okBody)).toEqual({ ok: true })
  })

  it('rejects networking and storage APIs', () => {
    const bad = validateGameBody(`${okBody}\nfetch('/x')\nlocalStorage.setItem('a', '1')`)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('fetch'))).toBe(true)
      expect(bad.errors.some((e) => e.includes('localStorage'))).toBe(true)
    }
  })

  it('requires layout and onResize', () => {
    const bad = validateGameBody(`
function die(){}
function tick(){}
function draw(){}
function onHostStart(){}
canvas.addEventListener('pointerdown', () => {})
`)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('layout'))).toBe(true)
      expect(bad.errors.some((e) => e.includes('onResize'))).toBe(true)
    }
  })

  it('rejects clientX without getBoundingClientRect', () => {
    const bad = validateGameBody(`
function layout(){}
function onHostStart(){ layout() }
function onResize(){ layout() }
function die(){}
function tick(){}
function draw(){}
canvas.addEventListener('pointerdown', (e) => { const x = e.clientX })
`)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('getBoundingClientRect'))).toBe(true)
    }
  })

  it('rejects host-owned effect calls', () => {
    const bad = validateGameBody(`${okBody}\nJuice.update()\nJuice.onDie()\nPF.t = 0`)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('Juice.update'))).toBe(true)
      expect(bad.errors.some((e) => e.includes('Juice.onDie'))).toBe(true)
      expect(bad.errors.some((e) => e.includes('PF.t'))).toBe(true)
    }
  })

  it('wrapped HTML includes the bridge contract', () => {
    const html = wrapGameHtml({
      title: 'Test',
      bg: '#000',
      accent: '#fff',
      body: okBody,
      libBase: 'https://play.thehappylab.com',
    })
    expect(validateWrappedHtml(html)).toEqual({ ok: true })
    expect(html).toContain('https://play.thehappylab.com/lib/juice.js')
  })
})

describe('gameSmoke', () => {
  it('runs a legal body without throwing', () => {
    expect(smokeGameBody(okBody)).toEqual({ ok: true })
  })

  it('catches ReferenceErrors in tick', () => {
    const bad = smokeGameBody(`
function layout(){}
function onHostStart(){ layout() }
function onResize(){ layout() }
function die(){}
function tick(){ totallyMissingFn() }
function draw(){}
canvas.addEventListener('pointerdown', () => {})
`)
    expect(bad.ok).toBe(false)
    if (!bad.ok) {
      expect(bad.errors.some((e) => e.includes('tick'))).toBe(true)
    }
  })
})
