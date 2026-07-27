/** Max UGC HTML blob URLs retained for feed reuse. */
export const HTML_BLOB_CACHE_MAX = 10

const cache = new Map<string, string>()

/** Return cached blob URL and mark it most-recently used. */
export function touchHtmlBlob(src: string): string | undefined {
  const url = cache.get(src)
  if (!url) return undefined
  cache.delete(src)
  cache.set(src, url)
  return url
}

/**
 * Store a blob URL for `src`. Evicts least-recently-used entries (and revokes
 * their object URLs) when over {@link HTML_BLOB_CACHE_MAX}.
 */
export function setHtmlBlob(src: string, url: string): void {
  const prev = cache.get(src)
  if (prev !== undefined) {
    cache.delete(src)
    if (prev !== url) URL.revokeObjectURL(prev)
  }
  cache.set(src, url)
  while (cache.size > HTML_BLOB_CACHE_MAX) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    const oldestUrl = cache.get(oldestKey)
    cache.delete(oldestKey)
    if (oldestUrl) URL.revokeObjectURL(oldestUrl)
  }
}

/** Test helper. */
export function htmlBlobCacheSize(): number {
  return cache.size
}

/** Test helper. */
export function htmlBlobCacheKeys(): string[] {
  return [...cache.keys()]
}

/** Test helper — revoke everything and clear. */
export function clearHtmlBlobCache(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url)
  cache.clear()
}
