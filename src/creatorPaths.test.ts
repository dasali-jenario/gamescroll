import { describe, expect, it } from 'vitest'
import {
  pathHonestyPrefix,
  resolveBuildPath,
  withPathHonesty,
} from './lib/creatorPaths'

describe('creatorPaths', () => {
  it('resolves arcade vs freeform from mechanic', () => {
    expect(resolveBuildPath('reaction')).toBe('arcade')
    expect(resolveBuildPath('custom')).toBe('freeform')
    expect(resolveBuildPath('guess')).toBe('freeform')
  })

  it('states arcade format vs custom layout-checked', () => {
    expect(pathHonestyPrefix('arcade', 'timing')).toMatch(/timing arcade format/i)
    expect(pathHonestyPrefix('freeform', 'custom')).toMatch(/custom game/i)
    expect(pathHonestyPrefix('freeform', 'custom')).toMatch(/layout-checked/i)
  })

  it('prepends honesty once', () => {
    const once = withPathHonesty('Looks good.', 'freeform', 'custom')
    expect(once.startsWith('Building a custom game')).toBe(true)
    expect(withPathHonesty(once, 'freeform', 'custom')).toBe(once)
  })
})
