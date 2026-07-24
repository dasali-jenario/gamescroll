import { useEffect, useState } from 'react'

const blobCache = new Map<string, string>()

function needsHtmlBlob(src: string): boolean {
  try {
    const host = new URL(src, window.location.origin).hostname
    return (
      host.endsWith('supabase.co') ||
      src.includes('/storage/v1/object/') ||
      src.includes('/functions/v1/ugc-play')
    )
  } catch {
    return false
  }
}

/**
 * Supabase Storage (and sometimes Edge) serve UGC HTML as text/plain, which
 * browsers display as source. Fetch and re-wrap as a text/html blob for iframes.
 */
export function usePlayableFrameSrc(src: string, enabled: boolean): string {
  const [frameSrc, setFrameSrc] = useState(() =>
    enabled && !needsHtmlBlob(src) ? src : '',
  )

  useEffect(() => {
    if (!enabled || !src) {
      setFrameSrc('')
      return
    }
    if (!needsHtmlBlob(src)) {
      setFrameSrc(src)
      return
    }

    const cached = blobCache.get(src)
    if (cached) {
      setFrameSrc(cached)
      return
    }

    let cancelled = false
    let created: string | null = null
    ;(async () => {
      try {
        const res = await fetch(src)
        const text = await res.text()
        if (cancelled) return
        const url = URL.createObjectURL(
          new Blob([text], { type: 'text/html;charset=utf-8' }),
        )
        created = url
        blobCache.set(src, url)
        setFrameSrc(url)
      } catch {
        if (!cancelled) setFrameSrc(src)
      }
    })()

    return () => {
      cancelled = true
      // Keep cache for feed reuse; only revoke if we replace later.
      void created
    }
  }, [src, enabled])

  return frameSrc
}
