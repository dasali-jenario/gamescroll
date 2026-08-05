import { describe, expect, it, vi } from 'vitest'
import { resolveFeedBoot } from './lib/feedBoot'
import {
  UGC_FEED_COLUMNS,
  UGC_MOD_COLUMNS,
  UGC_MY_COLUMNS,
} from './lib/ugc'
import type { Game } from './games'

const demo: Game = {
  id: 'demo',
  title: 'Demo',
  tip: 'Tap',
  src: '/games/demo.html',
  accent: '#123',
}

describe('resolveFeedBoot', () => {
  it('fetches community only when the shared game is already known', async () => {
    const fetchCommunity = vi.fn(async () => [demo])
    const fetchShared = vi.fn(async () => demo)
    const result = await resolveFeedBoot({
      preferGame: demo,
      sharedParam: 'demo',
      fetchCommunity,
      fetchShared,
    })
    expect(fetchCommunity).toHaveBeenCalledOnce()
    expect(fetchShared).not.toHaveBeenCalled()
    expect(result.prefer).toBe(demo)
    expect(result.community).toEqual([demo])
  })

  it('fetches community and shared slug in parallel when needed', async () => {
    let communityStarted = 0
    let shareStarted = 0
    let bothInFlight = false

    const fetchCommunity = vi.fn(async () => {
      communityStarted += 1
      await Promise.resolve()
      if (shareStarted === 1 && communityStarted === 1) bothInFlight = true
      return [demo]
    })
    const shared: Game = { ...demo, id: 'ugc-share', title: 'Shared' }
    const fetchShared = vi.fn(async () => {
      shareStarted += 1
      await Promise.resolve()
      if (shareStarted === 1 && communityStarted === 1) bothInFlight = true
      return shared
    })

    const result = await resolveFeedBoot({
      preferGame: null,
      sharedParam: 'ugc-share',
      fetchCommunity,
      fetchShared,
    })

    expect(fetchCommunity).toHaveBeenCalledOnce()
    expect(fetchShared).toHaveBeenCalledWith('ugc-share')
    expect(bothInFlight).toBe(true)
    expect(result.prefer?.id).toBe('ugc-share')
  })

  it('skips share fetch when there is no shared param', async () => {
    const fetchCommunity = vi.fn(async () => [])
    const fetchShared = vi.fn(async () => demo)
    const result = await resolveFeedBoot({
      preferGame: null,
      sharedParam: null,
      fetchCommunity,
      fetchShared,
    })
    expect(fetchShared).not.toHaveBeenCalled()
    expect(result.prefer).toBeNull()
  })
})

describe('UGC select columns', () => {
  it('keeps feed selects free of heavy conversation/brief fields', () => {
    expect(UGC_FEED_COLUMNS).toContain('slug')
    expect(UGC_FEED_COLUMNS).toContain('html_path')
    expect(UGC_FEED_COLUMNS).not.toContain('conversation')
    expect(UGC_FEED_COLUMNS).not.toContain('brief')
  })

  it('mod selects include brief (gate context) but never conversation', () => {
    expect(UGC_MOD_COLUMNS).toContain('published_at')
    expect(UGC_MOD_COLUMNS).toContain('brief')
    expect(UGC_MOD_COLUMNS).not.toContain('conversation')
  })

  it('includes the playable fields feed mapping needs', () => {
    for (const col of [
      'id',
      'slug',
      'title',
      'tip',
      'accent',
      'html_path',
      'html_url',
      'updated_at',
      'status',
      'source',
    ]) {
      expect(UGC_FEED_COLUMNS.split(',')).toContain(col)
    }
  })
})
