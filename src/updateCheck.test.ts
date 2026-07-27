import { describe, expect, it } from 'vitest'
import { buildReloadUrl } from './updateCheck'

describe('buildReloadUrl', () => {
  it('adds a cache-bust param while keeping share ids', () => {
    expect(buildReloadUrl('https://play.thehappylab.com/?g=flappy', 'abc')).toBe(
      '/?g=flappy&_gsb=abc',
    )
  })

  it('replaces a previous bust param', () => {
    expect(
      buildReloadUrl('https://play.thehappylab.com/?_gsb=old&g=pong', 'new'),
    ).toBe('/?_gsb=new&g=pong')
  })
})
