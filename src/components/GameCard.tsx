import { memo, useEffect, useRef } from 'react'
import type { Game } from '../games'
import { registerFeedBridge } from '../lib/feedMessageHub'
import { usePlayableFrameSrc } from '../lib/usePlayableFrameSrc'

type Props = {
  game: Game
  cardKey: string
  isActive: boolean
  isPlaying: boolean
  /** When false (e.g. game-over overlay), iframe ignores pointer input. */
  controlsEnabled: boolean
  /** Bumps to re-send start while still playing (play-again after game over). */
  restartKey: number
  onPlay: (cardKey: string, gameId: string) => void
  onScore: (gameId: string, score: number) => void
  onDied: (gameId: string, score: number) => void
  onSwipe: (direction: 'next' | 'prev') => void
}

function postToFrame(
  frame: HTMLIFrameElement | null,
  type: 'gamescroll:start' | 'gamescroll:pause',
) {
  const payload: { type: string; onFail?: string } = { type }
  if (type === 'gamescroll:start') {
    payload.onFail = 'gameover'
  }
  frame?.contentWindow?.postMessage(payload, '*')
}

export const GameCard = memo(function GameCard({
  game,
  cardKey,
  isActive,
  isPlaying,
  controlsEnabled,
  restartKey,
  onPlay,
  onScore,
  onDied,
  onSwipe,
}: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const readyRef = useRef(false)
  const shouldLoad = isActive || isPlaying
  const frameSrc = usePlayableFrameSrc(game.src, shouldLoad)
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying
  const onScoreRef = useRef(onScore)
  onScoreRef.current = onScore
  const onDiedRef = useRef(onDied)
  onDiedRef.current = onDied
  const onSwipeRef = useRef(onSwipe)
  onSwipeRef.current = onSwipe

  useEffect(() => {
    if (!shouldLoad) return
    return registerFeedBridge({
      getSource: () => frameRef.current?.contentWindow ?? null,
      onMessage: (event) => {
        const type = event.data?.type
        const playing = isPlayingRef.current

        if (type === 'gamescroll:ready') {
          readyRef.current = true
          if (playing) {
            postToFrame(frameRef.current, 'gamescroll:start')
          }
        }
        if (type === 'gamescroll:score' && playing) {
          const score = Number(event.data?.score)
          if (Number.isFinite(score) && score > 0) {
            onScoreRef.current(game.id, score)
          }
        }
        if (type === 'gamescroll:died' && playing) {
          const score = Number(event.data?.score)
          onDiedRef.current(game.id, Number.isFinite(score) ? score : 0)
        }
        if (type === 'gamescroll:swipe-next' && playing) {
          onSwipeRef.current('next')
        }
        if (type === 'gamescroll:swipe-prev' && playing) {
          onSwipeRef.current('prev')
        }
      },
    })
  }, [shouldLoad, game.id])

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
    if (!isPlaying || !readyRef.current || restartKey === 0) return
    postToFrame(frameRef.current, 'gamescroll:start')
  }, [restartKey, isPlaying])

  return (
    <article
      className={`card${isPlaying ? ' is-playing' : ''}`}
      style={{ ['--accent' as string]: game.accent }}
    >
      <div className="stage" style={{ background: game.accent }}>
        {shouldLoad && frameSrc ? (
          <iframe
            ref={frameRef}
            title={game.title}
            src={frameSrc}
            className="game-frame"
            sandbox="allow-scripts"
            style={{
              pointerEvents: isPlaying && controlsEnabled ? 'auto' : 'none',
            }}
          />
        ) : (
          <div className="stage-placeholder" />
        )}
      </div>

      {!isPlaying && (
        <button
          type="button"
          className="play-layer"
          onClick={() => onPlay(cardKey, game.id)}
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
})
