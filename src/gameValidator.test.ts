import { describe, expect, it } from 'vitest'
import { wrapGameHtml } from './lib/gameWrap'
import { validateGameBody, validateWrappedHtml } from './lib/gameValidator'

const okBody = `
function reset(){ setScore(0) }
function die(){ reset() }
function tick(dt){ if (GS.paused) return }
function draw(){ ctx.fillStyle = '#123'; ctx.fillRect(0,0,W,H) }
function onHostStart(){ reset() }
canvas.addEventListener('pointerdown', () => { if (!GS.paused) bump(1) })
reset()
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
