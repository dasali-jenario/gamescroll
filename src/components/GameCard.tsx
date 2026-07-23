import { useEffect, useRef, useState } from 'react'
import type { Game } from '../games'
import { shareGame } from '../share'

type Props = {
  game: Game
  isActive: boolean
  isPlaying: boolean
  liked: boolean
  onPlay: () => void
  onLike: () => void
  onScore: (gameId: string, score: number) => void
  onSwipe: (direction: 'next' | 'prev') => void
}

function postToFrame(
  frame: HTMLIFrameElement | null,
  type: 'gamescroll:start' | 'gamescroll:pause',
) {
  frame?.contentWindow?.postMessage({ type }, '*')
}

export function GameCard({
  game,
  isActive,
  isPlaying,
  liked,
  onPlay,
  onLike,
  onScore,
  onSwipe,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const [shareNote, setShareNote] = useState<string | null>(null)
  const shouldLoad = isActive || isPlaying

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type
      if (event.source !== frameRef.current?.contentWindow) return

      if (type === 'gamescroll:ready') {
        readyRef.current = true
        if (isPlaying) postToFrame(frameRef.current, 'gamescroll:start')
      }
      if (type === 'gamescroll:score' && isPlaying) {
        const score = Number(event.data?.score)
        if (Number.isFinite(score) && score > 0) onScore(game.id, score)
      }
      if (type === 'gamescroll:swipe-next' && isPlaying) {
        onSwipe('next')
      }
      if (type === 'gamescroll:swipe-prev' && isPlaying) {
        onSwipe('prev')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [game.id, isPlaying, onScore, onSwipe])

  useEffect(() => {
    if (!shouldLoad) {
      readyRef.current = false
      return
    }
    if (isPlaying && readyRef.current) {
      postToFrame(frameRef.current, 'gamescroll:start')
    }
    if (!isPlaying && readyRef.current) {
      postToFrame(frameRef.current, 'gamescroll:pause')
    }
  }, [isPlaying, shouldLoad])

  useEffect(() => {
    if (!shareNote) return
    const t = window.setTimeout(() => setShareNote(null), 1800)
    return () => window.clearTimeout(t)
  }, [shareNote])

  return (
    <article
      className={`card${isPlaying ? ' is-playing' : ''}`}
      style={{ ['--accent' as string]: game.accent }}
    >
      <div className="stage" style={{ background: game.accent }}>
        {shouldLoad ? (
          <iframe
            ref={frameRef}
            title={game.title}
            src={game.src}
            className="game-frame"
            sandbox="allow-scripts"
            style={{ pointerEvents: isPlaying ? 'auto' : 'none' }}
          />
        ) : (
          <div className="stage-placeholder" />
        )}
      </div>

      <div className="meta">
        <h2>{game.title}</h2>
        <p>{game.tip}</p>
      </div>

      <div className="rail">
        <button
          type="button"
          className={`like-btn${liked ? ' liked' : ''}`}
          aria-label={liked ? 'Unlike' : 'Like'}
          onClick={onLike}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7.2-4.6-9.4-9.1C1.1 8.6 2.7 5.5 6 4.7c1.8-.4 3.5.3 4.5 1.6C11.5 5 13.2 4.3 15 4.7c3.3.8 4.9 3.9 3.4 7.2C19.2 16.4 12 21 12 21z" />
          </svg>
        </button>
        <button
          type="button"
          className="share-btn"
          aria-label={`Share ${game.title}`}
          onClick={async () => {
            const result = await shareGame(game)
            if (result === 'copied') setShareNote('Link copied')
            else if (result === 'failed') setShareNote('Couldn’t share')
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="18" cy="5" r="2.5" />
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="19" r="2.5" />
            <path d="M8.4 13.2 15.6 17.3M15.6 6.7 8.4 10.8" />
          </svg>
        </button>
        {shareNote && (
          <span className="share-note" role="status">
            {shareNote}
          </span>
        )}
      </div>

      {!isPlaying && (
        <button
          type="button"
          className="play-layer"
          onClick={onPlay}
          aria-label={`Play ${game.title}`}
        >
          <span className="play-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5L8 5.5z" />
            </svg>
          </span>
        </button>
      )}
    </article>
  )
}
