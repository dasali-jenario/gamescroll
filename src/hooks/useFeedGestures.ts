import { useCallback, useEffect, useRef, type RefObject } from 'react'

const SWIPE_MIN_DY = 64

type Options = {
  feedRef: RefObject<HTMLDivElement | null>
  introRunning: boolean
  playingKey: string | null
  nudgeVisible: boolean
  gameOver: { gameId: string; score: number } | null
  cancelIntro: () => void
  goToNextGame: () => void
  goToPrevGame: () => void
  playAgain: () => void
  pausePlay: () => void
}

export function useFeedGestures({
  feedRef,
  introRunning,
  playingKey,
  nudgeVisible,
  gameOver,
  cancelIntro,
  goToNextGame,
  goToPrevGame,
  playAgain,
  pausePlay,
}: Options) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const endSwipe = useCallback(
    (clientX: number, clientY: number) => {
      const start = swipeStart.current
      swipeStart.current = null
      if (!start) return
      const dy = start.y - clientY
      const dx = Math.abs(clientX - start.x)
      if (Math.abs(dy) < SWIPE_MIN_DY || Math.abs(dy) < dx * 1.25) return
      if (dy > 0) goToNextGame()
      else goToPrevGame()
    },
    [goToNextGame, goToPrevGame],
  )

  const onGameSwipe = useCallback(
    (direction: 'next' | 'prev') => {
      if (direction === 'next') goToNextGame()
      else goToPrevGame()
    },
    [goToNextGame, goToPrevGame],
  )

  const beginSwipe = useCallback((clientX: number, clientY: number) => {
    swipeStart.current = { x: clientX, y: clientY }
  }, [])

  const cancelSwipe = useCallback(() => {
    swipeStart.current = null
  }, [])

  // While playing, the iframe/host must not scroll the snap feed underneath.
  useEffect(() => {
    const el = feedRef.current
    if (!el || !playingKey) return

    const lockTop = el.scrollTop
    const block = (e: Event) => {
      e.preventDefault()
      el.scrollTop = lockTop
    }

    el.addEventListener('wheel', block, { passive: false })
    el.addEventListener('touchmove', block, { passive: false })
    return () => {
      el.removeEventListener('wheel', block)
      el.removeEventListener('touchmove', block)
    }
  }, [feedRef, playingKey])

  useEffect(() => {
    if (!introRunning) return

    const cancel = () => cancelIntro()
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === ' ' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowUp' ||
        e.key === 'j' ||
        e.key === 'k'
      ) {
        e.preventDefault()
        cancel()
      }
    }

    window.addEventListener('pointerdown', cancel)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', cancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [introRunning, cancelIntro])

  useEffect(() => {
    if (introRunning) return

    const onKey = (e: KeyboardEvent) => {
      if (gameOver) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          playAgain()
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          goToNextGame()
          return
        }
      }
      if (e.key === 'Escape' && playingKey) {
        pausePlay()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        goToNextGame()
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        goToPrevGame()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    introRunning,
    gameOver,
    playAgain,
    playingKey,
    pausePlay,
    goToNextGame,
    goToPrevGame,
  ])

  useEffect(() => {
    if (playingKey || !nudgeVisible || introRunning) return

    const EDGE = 120
    const onDown = (e: PointerEvent) => {
      if (e.clientY < window.innerHeight - EDGE) return
      swipeStart.current = { x: e.clientX, y: e.clientY }
    }
    const onUp = (e: PointerEvent) => endSwipe(e.clientX, e.clientY)
    const onCancel = () => {
      swipeStart.current = null
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
  }, [playingKey, nudgeVisible, endSwipe, introRunning])

  return {
    endSwipe,
    beginSwipe,
    cancelSwipe,
    onGameSwipe,
  }
}
