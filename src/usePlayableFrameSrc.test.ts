import { describe, expect, it } from 'vitest'
import { needsHtmlBlob } from './lib/usePlayableFrameSrc'

describe('needsHtmlBlob', () => {
  it('passes through local official game paths', () => {
    expect(needsHtmlBlob('/games/pong.html')).toBe(false)
    expect(needsHtmlBlob('https://example.com/games/pong.html')).toBe(false)
  })

  it('flags Supabase storage and ugc-play URLs', () => {
    expect(
      needsHtmlBlob(
        'https://abc.supabase.co/storage/v1/object/public/ugc/foo.html',
      ),
    ).toBe(true)
    expect(
      needsHtmlBlob(
        'https://cdn.example.com/storage/v1/object/public/ugc/foo.html',
      ),
    ).toBe(true)
    expect(
      needsHtmlBlob('https://abc.supabase.co/functions/v1/ugc-play?slug=demo'),
    ).toBe(true)
  })

  it('returns false for invalid URLs', () => {
    expect(needsHtmlBlob('not a url ::')).toBe(false)
  })
})
