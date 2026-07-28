import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import {
  persistAutoRestart,
  resolveAutoRestart,
} from '../experiments'
import { loadHighscores, recordHighscore } from '../highscores'
import {
  reloadApp,
  stripReloadParamFromLocation,
  watchForDeployUpdate,
} from '../updateCheck'

export type GameOverState = { gameId: string; score: number }

type Options = {
  cancelIntro: () => void
  introRunningRef: MutableRefObject<boolean>
  bootReady: boolean
  resolvingShare: boolean
  introRunning: boolean
}

export function usePlaySession({
  cancelIntro,
  introRunningRef,
  bootReady,
  resolvingShare,
  introRunning,
}: Options) {
  const [playingKey, setPlayingKey] = useState<string | null>(null)
  const [nudgeVisible, setNudgeVisible] = useState(false)
  const [cueVisible, setCueVisible] = useState(false)
  const cueTimerRef = useRef<number | null>(null)
  const cueSpentRef = useRef(false)
  const [railHintVisible, setRailHintVisible] = useState(true)
  const [highscores, setHighscores] = useState(loadHighscores)
  const [autoRestart, setAutoRestart] = useState(() => resolveAutoRestart())
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [restartKey, setRestartKey] = useState(0)

  const playingRef = useRef(playingKey)
  const reloadWhenIdleRef = useRef(false)
  const pendingReloadIdRef = useRef<string | null>(null)
  playingRef.current = playingKey

  useEffect(() => {
    stripReloadParamFromLocation()
  }, [])

  useEffect(() => {
    return watchForDeployUpdate((remoteId) => {
      pendingReloadIdRef.current = remoteId
      if (playingRef.current) {
        reloadWhenIdleRef.current = true
        return
      }
      reloadApp(remoteId)
    })
  }, [])

  const applyPendingReload = useCallback(() => {
    if (!reloadWhenIdleRef.current) return false
    reloadApp(pendingReloadIdRef.current ?? undefined)
    return true
  }, [])

  useEffect(() => {
    if (!playingKey) applyPendingReload()
  }, [playingKey, applyPendingReload])

  const dismissNudge = useCallback(() => setNudgeVisible(false), [])

  const dismissCue = useCallback(() => {
    cueSpentRef.current = true
    setCueVisible(false)
    if (cueTimerRef.current != null) {
      window.clearTimeout(cueTimerRef.current)
      cueTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!bootReady || resolvingShare || introRunning || cueSpentRef.current) {
      return
    }
    setCueVisible(true)
    const id = window.setTimeout(() => {
      cueSpentRef.current = true
      setCueVisible(false)
      cueTimerRef.current = null
    }, 5000)
    cueTimerRef.current = id
    return () => {
      window.clearTimeout(id)
      if (cueTimerRef.current === id) cueTimerRef.current = null
    }
  }, [bootReady, resolvingShare, introRunning])

  const enterPlay = useCallback((key: string) => {
    setGameOver(null)
    setPlayingKey(key)
    setNudgeVisible(false)
    setRailHintVisible(false)
  }, [])

  const pausePlay = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(true)
  }, [])

  const clearForNavigate = useCallback(() => {
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
  }, [])

  const onScore = useCallback((gameId: string, score: number) => {
    const best = recordHighscore(gameId, score)
    setHighscores((prev) =>
      prev[gameId] === best ? prev : { ...prev, [gameId]: best },
    )
  }, [])

  const onDied = useCallback(
    (gameId: string, score: number) => {
      if (autoRestart) return
      if (score > 0) {
        const best = recordHighscore(gameId, score)
        setHighscores((prev) =>
          prev[gameId] === best ? prev : { ...prev, [gameId]: best },
        )
      }
      setGameOver({ gameId, score })
    },
    [autoRestart],
  )

  const playAgain = useCallback(() => {
    setGameOver(null)
    setRestartKey((n) => n + 1)
  }, [])

  const toggleAutoRestart = useCallback(() => {
    setAutoRestart((prev) => {
      const next = !prev
      persistAutoRestart(next)
      return next
    })
    setGameOver(null)
  }, [])

  const handlePlay = useCallback(
    (cardKey: string) => {
      if (introRunningRef.current) {
        cancelIntro()
        return
      }
      enterPlay(cardKey)
    },
    [cancelIntro, enterPlay, introRunningRef],
  )

  const showCue =
    cueVisible &&
    bootReady &&
    !resolvingShare &&
    !gameOver &&
    !introRunning &&
    !nudgeVisible

  return {
    playingKey,
    gameOver,
    autoRestart,
    restartKey,
    highscores,
    railHintVisible,
    nudgeVisible,
    showCue,
    enterPlay,
    pausePlay,
    clearForNavigate,
    handlePlay,
    onScore,
    onDied,
    playAgain,
    toggleAutoRestart,
    dismissNudge,
    dismissCue,
    applyPendingReload,
  }
}
