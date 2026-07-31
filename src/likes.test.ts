import { beforeEach, describe, expect, it } from 'vitest'
import { isLiked, loadLikedIds, toggleLikedId } from './likes'

describe('likes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty and toggles newest-first', () => {
    expect(loadLikedIds()).toEqual([])
    expect(toggleLikedId('flappy')).toEqual(['flappy'])
    expect(toggleLikedId('pong')).toEqual(['pong', 'flappy'])
    expect(isLiked('flappy')).toBe(true)
    expect(toggleLikedId('flappy')).toEqual(['pong'])
    expect(isLiked('flappy')).toBe(false)
  })

  it('ignores blank ids and corrupt storage', () => {
    expect(toggleLikedId('  ')).toEqual([])
    localStorage.setItem('gs_likes', 'not-json')
    expect(loadLikedIds()).toEqual([])
    localStorage.setItem('gs_likes', JSON.stringify([1, 'pong', 'pong', '']))
    expect(loadLikedIds()).toEqual(['pong'])
  })
})
