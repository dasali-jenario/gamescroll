import { type Ref } from 'react'
import type { Game } from '../games'
import { PrivacyDisclosure } from './PrivacyDisclosure'

type Props = {
  game: Game | undefined
  isPlaying: boolean
  /** Hide play/pause while an end/pause overlay owns the actions. */
  overlayOpen?: boolean
  likedCount?: number
  onShuffle: () => void
  onOpenLikes: () => void
  onPlay: () => void
  onPause: () => void
  navRef?: Ref<HTMLElement | null>
}

/** Viewport-fixed shuffle / likes / play-pause / info bar. */
export function BottomNav({
  game,
  isPlaying,
  overlayOpen = false,
  likedCount = 0,
  onShuffle,
  onOpenLikes,
  onPlay,
  onPause,
  navRef,
}: Props) {
  if (!game) return null

  return (
    <nav
      ref={navRef as never}
      className={`bottom-nav${isPlaying ? ' is-playing' : ''}`}
      aria-label="Game actions"
    >
      <button
        type="button"
        className="nav-btn shuffle-btn"
        aria-label="Play a random game"
        onClick={onShuffle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
      </button>

      <button
        type="button"
        className={`nav-btn likes-btn${likedCount > 0 ? ' has-likes' : ''}`}
        aria-label={
          likedCount > 0
            ? `Open liked games, ${likedCount} liked`
            : 'Open liked games'
        }
        onClick={onOpenLikes}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.2-4.6-9.4-9.1C1.1 8.6 2.7 5.5 6 4.7c1.8-.4 3.5.3 4.5 1.6C11.5 5 13.2 4.3 15 4.7c3.3.8 4.9 3.9 3.4 7.2C19.2 16.4 12 21 12 21z" />
        </svg>
        {likedCount > 0 && (
          <span className="likes-count">{likedCount > 99 ? '99+' : likedCount}</span>
        )}
      </button>

      {!overlayOpen ? (
        isPlaying ? (
          <button
            type="button"
            className="nav-btn nav-play-btn is-pause"
            onClick={onPause}
            aria-label="Pause game"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <span className="nav-label">Pause</span>
          </button>
        ) : (
          <button
            type="button"
            className="nav-btn nav-play-btn is-play"
            onClick={onPlay}
            aria-label={`Play ${game.title}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13l11-6.5L8 5.5z" />
            </svg>
            <span className="nav-label">Play</span>
          </button>
        )
      ) : (
        <span className="nav-play-spacer" aria-hidden="true" />
      )}

      <PrivacyDisclosure />
    </nav>
  )
}
