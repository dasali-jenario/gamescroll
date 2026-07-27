import { useEffect, useRef } from 'react'
import { autoRestartForBridge } from '../experiments'
import type { Game } from '../games'
import { usePlayableFrameSrc } from '../lib/usePlayableFrameSrc'

type Props = {
  game: Game
  isActive: boolean
  isPlaying: boolean
  /** When false (e.g. game-over overlay), iframe ignores pointer input. */
  controlsEnabled: boolean
  autoRestart: boolean
  /** Bumps to re-send start while still playing (play-again after game over). */
  restartKey: number
  onPlay: () => void
  onScore: (gameId: string, score: number) => void
  onDied: (gameId: string, score: number) => void
  onSwipe: (direction: 'next' | 'prev') => void
}

function postToFrame(
  frame: HTMLIFrameElement | null,
  type: 'gamescroll:start' | 'gamescroll:pause',
  autoRestart?: boolean,
) {
  const payload: { type: string; onFail?: string } = { type }
  if (type === 'gamescroll:start' && autoRestart !== undefined) {
    payload.onFail = autoRestartForBridge(autoRestart)
  }
  frame?.contentWindow?.postMessage(payload, '*')
}

export function GameCard({
  game,
  isActive,
  isPlaying,
  controlsEnabled,
  autoRestart,
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
  const autoRestartRef = useRef(autoRestart)
  autoRestartRef.current = autoRestart

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const type = event.data?.type
      if (event.source !== frameRef.current?.contentWindow) return

      if (type === 'gamescroll:ready') {
        readyRef.current = true
        if (isPlaying) {
          postToFrame(
            frameRef.current,
            'gamescroll:start',
            autoRestartRef.current,
          )
        }
      }
      if (type === 'gamescroll:score' && isPlaying) {
        const score = Number(event.data?.score)
        if (Number.isFinite(score) && score > 0) onScore(game.id, score)
      }
      if (type === 'gamescroll:died' && isPlaying) {
        const score = Number(event.data?.score)
        onDied(game.id, Number.isFinite(score) ? score : 0)
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
  }, [game.id, isPlaying, onScore, onDied, onSwipe])

  useEffect(() => {
    if (!shouldLoad) {
      readyRef.current = false
      return
    }
    if (isPlaying && readyRef.current) {
      postToFrame(frameRef.current, 'gamescroll:start', autoRestart)
    }
    if (!isPlaying && readyRef.current) {
      postToFrame(frameRef.current, 'gamescroll:pause')
    }
  }, [isPlaying, shouldLoad, autoRestart])

  useEffect(() => {
    if (!isPlaying || !readyRef.current || restartKey === 0) return
    postToFrame(frameRef.current, 'gamescroll:start', autoRestartRef.current)
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
