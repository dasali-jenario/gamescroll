import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUALIFIED_PLAY_MS, recordQualifiedPlay } from './lib/playCounts'

const rpc = vi.fn(() => Promise.resolve({ error: null }))
const getSupabase = vi.fn(() => ({ rpc }))

vi.mock('./lib/supabase', () => ({
  getSupabase: () => getSupabase(),
}))

vi.mock('./metrics', () => ({
  ensureAnonymousUid: () => 'test-uid-123',
}))

afterEach(() => {
  vi.clearAllMocks()
  getSupabase.mockImplementation(() => ({ rpc }))
})

describe('recordQualifiedPlay', () => {
  it('exports a 10s qualification window', () => {
    expect(QUALIFIED_PLAY_MS).toBe(10_000)
  })

  it('calls record_ugc_play with slug and anonymous uid', async () => {
    recordQualifiedPlay('flappy')
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('record_ugc_play', {
      p_slug: 'flappy',
      p_uid: 'test-uid-123',
    })
  })

  it('trims slug whitespace', async () => {
    recordQualifiedPlay('  pong  ')
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('record_ugc_play', {
      p_slug: 'pong',
      p_uid: 'test-uid-123',
    })
  })

  it('no-ops when slug is empty', () => {
    recordQualifiedPlay('   ')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('no-ops when Supabase is not configured', () => {
    getSupabase.mockReturnValue(null)
    recordQualifiedPlay('flappy')
    expect(rpc).not.toHaveBeenCalled()
  })
})
