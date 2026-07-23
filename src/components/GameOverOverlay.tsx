type Props = {
  score: number
  best: number
  onPlayAgain: () => void
  onPlayAnother: () => void
}

export function GameOverOverlay({
  score,
  best,
  onPlayAgain,
  onPlayAnother,
}: Props) {
  const isNewBest = score > 0 && score >= best

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
          {score}
        </h2>
        <p className="game-over-best">
          {isNewBest ? 'New best' : `Best ${best}`}
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
