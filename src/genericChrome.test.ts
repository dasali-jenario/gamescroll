import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PORTRAIT_CHROME,
  bodyHasChromeContract,
  chromeBoilerplateJs,
  ensureFreeformChrome,
  freeformChromeSeedSection,
  resolveFreeformLayoutPlan,
} from './lib/genericChrome'
import { checkBodyLayoutFidelity } from './lib/layoutFidelity'
import { smokeGameBody } from './lib/gameSmoke'
import { validateGameBody } from './lib/gameValidator'
import { customFreeformSeedMessage } from './lib/mechanicScaffolds'

/** Minimal freeform body missing chrome — ensureFreeformChrome should repair harvest. */
const bareBody = `
function scorePos(){ return [W/2, H*0.4] }
function diePos(){ return scorePos() }
function layout(){ /* coords TBD */ }
function reset(){ setScore(0); layout() }
function die(){ reset() }
function onHostStart(){ reset() }
function onResize(){ layout() }
function tick(){ if (GS.paused) return }
function draw(){
  PF.sky(ctx,W,H,'#123','#234','#345')
  if (L.focus) PF.soft(ctx, L.focus.x+L.focus.w/2, L.focus.y+L.focus.h/2, 24, '#2ec4b6', '#20a4a0')
}
canvas.addEventListener('pointerdown', () => { if (!GS.paused) bump(1) })
layout()
`

describe('genericChrome', () => {
  it('default portrait chrome validates', () => {
    const plan = resolveFreeformLayoutPlan(DEFAULT_PORTRAIT_CHROME)
    expect(plan).toHaveLength(4)
    expect(plan.map((r) => r.id).sort()).toEqual(['cta', 'focus', 'hint', 'title'])
  })

  it('falls back to default when plan is invalid', () => {
    expect(resolveFreeformLayoutPlan([])).toEqual(DEFAULT_PORTRAIT_CHROME)
    expect(resolveFreeformLayoutPlan(null)).toEqual(DEFAULT_PORTRAIT_CHROME)
  })

  it('ensureFreeformChrome makes a bare body harvestable and smokeable', () => {
    const plan = DEFAULT_PORTRAIT_CHROME
    const body = ensureFreeformChrome(bareBody, plan)
    expect(bodyHasChromeContract(body)).toBe(true)
    expect(body).toContain('GS.layoutFromPlan')
    expect(validateGameBody(body)).toEqual({ ok: true })
    expect(smokeGameBody(body)).toEqual({ ok: true })
    const fidelity = checkBodyLayoutFidelity(body, plan)
    expect(fidelity.ok).toBe(true)
  })

  it('boilerplate alone is not a full game but documents the contract', () => {
    expect(chromeBoilerplateJs()).toContain('LAYOUT_PLAN')
    expect(chromeBoilerplateJs()).toContain('layoutFromPlan')
    expect(freeformChromeSeedSection()).toContain('GENERIC CHROME CONTRACT')
    expect(customFreeformSeedMessage()).toContain('GENERIC CHROME CONTRACT')
    expect(customFreeformSeedMessage()).toContain('L.focus')
  })

  it('does not invent genre scaffolds', () => {
    const seed = customFreeformSeedMessage()
    expect(seed).not.toMatch(/word_grid|guess.?scaffold|hangman scaffold/i)
  })
})
