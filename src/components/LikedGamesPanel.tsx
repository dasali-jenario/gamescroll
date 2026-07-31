import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import type { Game } from '../games'

type Props = {
  open: boolean
  games: Game[]
  onClose: () => void
  onPlay: (gameId: string) => void
}

/** Sheet listing liked games; tap a row to jump into that game and play. */
export function LikedGamesPanel({ open, games, onClose, onPlay }: Props) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      id="liked-games"
      className="liked-games"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="liked-games-panel">
        <header className="liked-games-head">
          <h2 id={titleId} className="liked-games-title">
            Liked
          </h2>
          <button
            type="button"
            className="liked-games-close"
            aria-label="Close liked games"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="liked-games-body">
          {games.length === 0 ? (
            <p className="liked-games-empty">
              Games you like show up here — tap the heart in the top bar or on the end-of-round screen.
            </p>
          ) : (
            <ul className="liked-games-list">
              {games.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    className="liked-games-row"
                    style={{ ['--game-accent' as string]: game.accent }}
                    onClick={() => onPlay(game.id)}
                  >
                    <span className="liked-games-swatch" aria-hidden="true" />
                    <span className="liked-games-copy">
                      <span className="liked-games-name">{game.title}</span>
                      <span className="liked-games-tip">{game.tip}</span>
                    </span>
                    <span className="liked-games-play" aria-hidden="true">
                      Play
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
