import { useEffect, useState } from 'react'
import type { Game } from '../games'
import { shareGame } from '../share'

type Props = {
  game: Game
  score: number
  /** Best after this round (includes a new record). */
  best: number
  /** Best before this round; 0 means first recorded play. */
  previousBest: number
  /** When true, lower scores are better (reaction time). */
  lowerIsBetter?: boolean
  liked: boolean
  onLike: () => void
  onPlayAgain: () => void
  onPlayAnother: () => void
}

function formatScore(value: number, lowerIsBetter: boolean): string {
  if (value <= 0) return '—'
  return lowerIsBetter ? `${value} ms` : String(value)
}

export function GameOverOverlay({
  game,
  score,
  best,
  previousBest,
  lowerIsBetter = false,
  liked,
  onLike,
  onPlayAgain,
  onPlayAnother,
}: Props) {
  const [shareNote, setShareNote] = useState<string | null>(null)
  const hasPriorBest = previousBest > 0
  const isNewBest =
    score > 0 &&
    (hasPriorBest
      ? lowerIsBetter
        ? score < previousBest
        : score > previousBest
      : true)

  useEffect(() => {
    if (!shareNote) return
    const t = window.setTimeout(() => setShareNote(null), 1800)
    return () => window.clearTimeout(t)
  }, [shareNote])

  return (
    <div
      className="game-over"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
    >
      <div
        className={`game-over-panel${isNewBest ? ' is-new-best' : ''}`}
        style={{ ['--game-accent' as string]: game.accent }}
      >
        <div className="game-over-accent" aria-hidden="true" />
        <p className="game-over-kicker">{game.title}</p>
        <p className="game-over-label">Score</p>
        <h2 id="game-over-title" className="game-over-score">
          {formatScore(score, lowerIsBetter)}
        </h2>

        {isNewBest ? (
          <p className="game-over-best is-fresh" role="status">
            <span className="game-over-best-dot" aria-hidden="true" />
            {hasPriorBest ? 'New best!' : 'First best!'}
          </p>
        ) : hasPriorBest ? (
          <p className="game-over-best">
            Best {formatScore(best, lowerIsBetter)}
          </p>
        ) : null}

        <div className="game-over-social">
          <button
            type="button"
            className={`nav-btn like-btn game-over-chip${liked ? ' liked' : ''}`}
            aria-label={liked ? 'Unlike' : 'Like'}
            onClick={onLike}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-7.2-4.6-9.4-9.1C1.1 8.6 2.7 5.5 6 4.7c1.8-.4 3.5.3 4.5 1.6C11.5 5 13.2 4.3 15 4.7c3.3.8 4.9 3.9 3.4 7.2C19.2 16.4 12 21 12 21z" />
            </svg>
            <span className="nav-label">{liked ? 'Liked' : 'Like'}</span>
          </button>
          <div className="share-wrap">
            <button
              type="button"
              className="nav-btn share-btn game-over-chip"
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
              <span className="nav-label">Share</span>
            </button>
            {shareNote && (
              <span className="share-note" role="status">
                {shareNote}
              </span>
            )}
          </div>
        </div>

        <div className="game-over-actions">
          <button type="button" className="game-over-again" onClick={onPlayAgain}>
            Play again
          </button>
          <button
            type="button"
            className="game-over-another"
            onClick={onPlayAnother}
          >
            Play another
          </button>
        </div>
      </div>
    </div>
  )
}
