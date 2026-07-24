import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gameShareUrl, readSharedGameId, readSharedGameParam } from './share'
import { games } from './games'

describe('share deep links', () => {
  const original = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    window.history.replaceState({}, '', original)
  })

  it('readSharedGameId returns null without a valid catalog g param', () => {
    expect(readSharedGameId()).toBeNull()
    window.history.replaceState({}, '', '/?g=missing-game')
    expect(readSharedGameId()).toBeNull()
    expect(readSharedGameParam()).toBe('missing-game')
  })

  it('readSharedGameId accepts a catalog id', () => {
    const id = games[0].id
    window.history.replaceState({}, '', `/?g=${id}`)
    expect(readSharedGameId()).toBe(id)
    expect(readSharedGameParam()).toBe(id)
  })

  it('gameShareUrl builds an absolute ?g= link and clears other query/hash', () => {
    window.history.replaceState({}, '', '/play?x=1#section')
    const url = gameShareUrl('flappy')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('g')).toBe('flappy')
    expect(parsed.searchParams.get('x')).toBeNull()
    expect(parsed.hash).toBe('')
  })
})
