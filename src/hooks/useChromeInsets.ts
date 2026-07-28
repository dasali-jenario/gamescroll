import { useLayoutEffect, type RefObject } from 'react'

function readSafeInset(side: 'top' | 'bottom'): number {
  const el = document.createElement('div')
  el.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'pointer-events:none',
    // Older iOS used constant(); modern uses env().
    `padding-${side}:constant(safe-area-inset-${side}, 0px)`,
    `padding-${side}:env(safe-area-inset-${side}, 0px)`,
  ].join(';')
  document.body.appendChild(el)
  const raw = getComputedStyle(el).getPropertyValue(`padding-${side}`)
  el.remove()
  const px = Number.parseFloat(raw)
  return Number.isFinite(px) ? px : 0
}

/**
 * Keep `--chrome-top` / `--bottom-nav` equal to the real chrome boxes so the
 * playfield never sits under the status bar, title tip, or bottom nav —
 * including when tips wrap or safe-area insets change.
 */
export function useChromeInsets(opts: {
  topBarRef: RefObject<HTMLElement | null>
  bottomNavRef: RefObject<HTMLElement | null>
  /** Re-measure when chrome content height may change. */
  deps?: unknown[]
}) {
  const { topBarRef, bottomNavRef, deps = [] } = opts

  useLayoutEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const safeTop = readSafeInset('top')
      const safeBottom = readSafeInset('bottom')
      root.style.setProperty('--safe-top', `${safeTop}px`)
      root.style.setProperty('--safe-bottom', `${safeBottom}px`)

      const topEl = topBarRef.current
      const bottomEl = bottomNavRef.current
      if (topEl) {
        const h = Math.ceil(topEl.getBoundingClientRect().height)
        // Never letterbox above the status bar even if the bar measured short.
        const minTop = Math.ceil(safeTop + 56)
        if (h > 0) root.style.setProperty('--chrome-top', `${Math.max(h, minTop)}px`)
      }
      if (bottomEl) {
        const h = Math.ceil(bottomEl.getBoundingClientRect().height)
        const minBottom = Math.ceil(safeBottom + 56)
        if (h > 0) {
          root.style.setProperty('--bottom-nav', `${Math.max(h, minBottom)}px`)
        }
      }
    }

    apply()
    const ro = new ResizeObserver(apply)
    if (topBarRef.current) ro.observe(topBarRef.current)
    if (bottomNavRef.current) ro.observe(bottomNavRef.current)
    window.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('resize', apply)
    window.visualViewport?.addEventListener('scroll', apply)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('resize', apply)
      window.visualViewport?.removeEventListener('scroll', apply)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes chrome deps
  }, [topBarRef, bottomNavRef, ...deps])
}
