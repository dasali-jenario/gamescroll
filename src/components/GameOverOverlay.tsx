type Props = {
  score: number
  best: number
  /** When true, lower scores are better (reaction time). */
  lowerIsBetter?: boolean
  onPlayAgain: () => void
  onPlayAnother: () => void
}

export function GameOverOverlay({
  score,
  best,
  lowerIsBetter = false,
  onPlayAgain,
  onPlayAnother,
}: Props) {
  const isNewBest =
    score > 0 && (lowerIsBetter ? score <= best : score >= best)

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
        </div>
      </div>
    </div>
  )
}
