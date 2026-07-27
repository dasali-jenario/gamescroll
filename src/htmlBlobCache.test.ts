import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  HTML_BLOB_CACHE_MAX,
  clearHtmlBlobCache,
  htmlBlobCacheKeys,
  htmlBlobCacheSize,
  setHtmlBlob,
  touchHtmlBlob,
} from './lib/htmlBlobCache'

afterEach(() => {
  clearHtmlBlobCache()
  vi.restoreAllMocks()
})

describe('htmlBlobCache', () => {
  it('uses a Phase 1 LRU size of 8–12', () => {
    expect(HTML_BLOB_CACHE_MAX).toBeGreaterThanOrEqual(8)
    expect(HTML_BLOB_CACHE_MAX).toBeLessThanOrEqual(12)
  })

  it('touches refresh LRU order', () => {
    setHtmlBlob('a', 'blob:a')
    setHtmlBlob('b', 'blob:b')
    expect(touchHtmlBlob('a')).toBe('blob:a')
    expect(htmlBlobCacheKeys()).toEqual(['b', 'a'])
  })

  it('returns undefined for a cache miss', () => {
    expect(touchHtmlBlob('missing')).toBeUndefined()
  })

  it('evicts least-recently-used and revokes the object URL', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    for (let i = 0; i < HTML_BLOB_CACHE_MAX; i++) {
      setHtmlBlob(`src-${i}`, `blob:${i}`)
    }
    expect(htmlBlobCacheSize()).toBe(HTML_BLOB_CACHE_MAX)

    setHtmlBlob('src-new', 'blob:new')
    expect(htmlBlobCacheSize()).toBe(HTML_BLOB_CACHE_MAX)
    expect(htmlBlobCacheKeys()[0]).toBe('src-1')
    expect(htmlBlobCacheKeys().at(-1)).toBe('src-new')
    expect(revoke).toHaveBeenCalledWith('blob:0')
  })

  it('evicts multiple oldest entries when jumping far over the max', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    for (let i = 0; i < HTML_BLOB_CACHE_MAX; i++) {
      setHtmlBlob(`src-${i}`, `blob:${i}`)
    }
    // Touch mid entries so oldest stay 0..1; then overflow by 1 only via setHtmlBlob.
    // Filling beyond max happens one insert at a time — verify sequential eviction.
    setHtmlBlob('extra-1', 'blob:e1')
    setHtmlBlob('extra-2', 'blob:e2')
    expect(htmlBlobCacheSize()).toBe(HTML_BLOB_CACHE_MAX)
    expect(revoke).toHaveBeenCalledWith('blob:0')
    expect(revoke).toHaveBeenCalledWith('blob:1')
    expect(htmlBlobCacheKeys()).not.toContain('src-0')
    expect(htmlBlobCacheKeys()).not.toContain('src-1')
    expect(htmlBlobCacheKeys().at(-2)).toBe('extra-1')
    expect(htmlBlobCacheKeys().at(-1)).toBe('extra-2')
  })

  it('replacing the same src revokes the previous URL', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    setHtmlBlob('x', 'blob:old')
    setHtmlBlob('x', 'blob:new')
    expect(htmlBlobCacheSize()).toBe(1)
    expect(touchHtmlBlob('x')).toBe('blob:new')
    expect(revoke).toHaveBeenCalledWith('blob:old')
  })

  it('does not revoke when replacing with the same URL', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    setHtmlBlob('x', 'blob:same')
    setHtmlBlob('x', 'blob:same')
    expect(revoke).not.toHaveBeenCalled()
    expect(htmlBlobCacheSize()).toBe(1)
  })

  it('clearHtmlBlobCache revokes every entry', () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    setHtmlBlob('a', 'blob:a')
    setHtmlBlob('b', 'blob:b')
    clearHtmlBlobCache()
    expect(htmlBlobCacheSize()).toBe(0)
    expect(revoke).toHaveBeenCalledWith('blob:a')
    expect(revoke).toHaveBeenCalledWith('blob:b')
  })
})
