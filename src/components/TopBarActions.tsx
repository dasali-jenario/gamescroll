import { useEffect, useState } from 'react'
import type { Game } from '../games'
import { shareGame } from '../share'

type Props = {
  game: Game
  liked: boolean
  onLike: () => void
}

/** Icon Like / Share in the top bar — outside the playable stage. */
export function TopBarActions({ game, liked, onLike }: Props) {
  const [shareNote, setShareNote] = useState<string | null>(null)

  useEffect(() => {
    if (!shareNote) return
    const t = window.setTimeout(() => setShareNote(null), 1800)
    return () => window.clearTimeout(t)
  }, [shareNote])

  return (
    <div className="top-bar-actions">
      <button
        type="button"
        className={`nav-btn like-btn top-bar-action${liked ? ' liked' : ''}`}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        onClick={onLike}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.2-4.6-9.4-9.1C1.1 8.6 2.7 5.5 6 4.7c1.8-.4 3.5.3 4.5 1.6C11.5 5 13.2 4.3 15 4.7c3.3.8 4.9 3.9 3.4 7.2C19.2 16.4 12 21 12 21z" />
        </svg>
      </button>
      <div className="share-wrap top-bar-share">
        <button
          type="button"
          className="nav-btn share-btn top-bar-action"
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
    </div>
  )
}
