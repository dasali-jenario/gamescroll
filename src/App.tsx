import { useCallback, useEffect, useRef, useState } from 'react'
import { games } from './games'
import { GameCard } from './components/GameCard'

export default function App() {
  const feedRef = useRef<HTMLDivElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [tipVisible, setTipVisible] = useState(true)
  const [activeIndex, setActiveIndex] = useState(0)

  const dismissTip = useCallback(() => setTipVisible(false), [])

  const scrollToIndex = useCallback((index: number) => {
    const el = feedRef.current
    if (!el) return
    const clamped = Math.max(0, Math.min(games.length - 1, index))
    el.scrollTo({ top: clamped * el.clientHeight, behavior: 'smooth' })
  }, [])

  const enterPlay = useCallback(
    (id: string) => {
      setPlayingId(id)
      dismissTip()
    },
    [dismissTip],
  )

  const exitPlay = useCallback(() => setPlayingId(null), [])

  useEffect(() => {
    const el = feedRef.current
    if (!el) return

    const onScroll = () => {
      const index = Math.round(el.scrollTop / Math.max(el.clientHeight, 1))
      setActiveIndex(index)
      if (el.scrollTop > 40) dismissTip()
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [dismissTip])

  useEffect(() => {
    const el = feedRef.current
    if (!el || !playingId) return

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
  }, [playingId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && playingId) {
        exitPlay()
        return
      }
      if (playingId) return
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        scrollToIndex(activeIndex + 1)
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        scrollToIndex(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [playingId, activeIndex, exitPlay, scrollToIndex])

  return (
    <div className="app">
      <header className="top-bar">
        <div className="brand">Gamescroll</div>
        <div className="mode">{playingId ? 'Playing' : 'Browse'}</div>
      </header>

      <div
        ref={feedRef}
        className={`feed${playingId ? ' is-locked' : ''}`}
        tabIndex={0}
      >
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            isActive={games[activeIndex]?.id === game.id}
            isPlaying={playingId === game.id}
            liked={!!liked[game.id]}
            onPlay={() => enterPlay(game.id)}
            onDone={exitPlay}
            onLike={() => {
              setLiked((prev) => ({ ...prev, [game.id]: !prev[game.id] }))
              dismissTip()
            }}
          />
        ))}
      </div>

      {tipVisible && (
        <button type="button" className="tip" onClick={dismissTip}>
          Swipe for next · Tap to play
        </button>
      )}
    </div>
  )
}
