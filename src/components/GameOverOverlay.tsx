import { useEffect, useState } from 'react'
import type { Game } from '../games'
import { shareGame } from '../share'

type Props = {
  game: Game
  score: number
  best: number
  /** When true, lower scores are better (reaction time). */
  lowerIsBetter?: boolean
  onPlayAgain: () => void
  onPlayAnother: () => void
}

export function GameOverOverlay({
  game,
  score,
  best,
  lowerIsBetter = false,
  onPlayAgain,
  onPlayAnother,
}: Props) {
  const [shareNote, setShareNote] = useState<string | null>(null)
  const isNewBest =
    score > 0 && (lowerIsBetter ? score <= best : score >= best)

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
      <div className="game-over-panel">
        <p className="game-over-kicker">Game over</p>
        <h2 id="game-over-title" className="game-over-score">
          {lowerIsBetter ? `${score} ms` : score}
        </h2>
        <p className="game-over-best">
          {isNewBest
            ? 'New best'
            : lowerIsBetter
              ? `Best ${best} ms`
              : `Best ${best}`}
        </p>
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
          <div className="game-over-share-wrap">
            <button
              type="button"
              className="game-over-share"
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
              Share
            </button>
            {shareNote && (
              <span className="share-note" role="status">
                {shareNote}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
