import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import { loadHighscores, recordHighscore } from '../highscores'
import {
  QUALIFIED_PLAY_MS,
  recordQualifiedPlay,
} from '../lib/playCounts'
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
  const [gameOver, setGameOver] = useState<GameOverState | null>(null)
  const [restartKey, setRestartKey] = useState(0)

  const playingRef = useRef(playingKey)
  const reloadWhenIdleRef = useRef(false)
  const pendingReloadIdRef = useRef<string | null>(null)
  const qualifyTimerRef = useRef<number | null>(null)
  playingRef.current = playingKey

  const clearQualifyTimer = useCallback(() => {
    if (qualifyTimerRef.current != null) {
      window.clearTimeout(qualifyTimerRef.current)
      qualifyTimerRef.current = null
    }
  }, [])

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

  const enterPlay = useCallback(
    (key: string, gameId: string) => {
      setGameOver(null)
      setPlayingKey(key)
      setNudgeVisible(false)
      setRailHintVisible(false)
      clearQualifyTimer()
      const engagementKey = key
      const slug = gameId
      qualifyTimerRef.current = window.setTimeout(() => {
        qualifyTimerRef.current = null
        if (playingRef.current === engagementKey) {
          recordQualifiedPlay(slug)
        }
      }, QUALIFIED_PLAY_MS)
    },
    [clearQualifyTimer],
  )

  const pausePlay = useCallback(() => {
    clearQualifyTimer()
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(true)
  }, [clearQualifyTimer])

  const clearForNavigate = useCallback(() => {
    clearQualifyTimer()
    setGameOver(null)
    setPlayingKey(null)
    setNudgeVisible(false)
  }, [clearQualifyTimer])

  const onScore = useCallback((gameId: string, score: number) => {
    const best = recordHighscore(gameId, score)
    setHighscores((prev) =>
      prev[gameId] === best ? prev : { ...prev, [gameId]: best },
    )
  }, [])

  const onDied = useCallback((gameId: string, score: number) => {
    if (score > 0) {
      const best = recordHighscore(gameId, score)
      setHighscores((prev) =>
        prev[gameId] === best ? prev : { ...prev, [gameId]: best },
      )
    }
    setGameOver({ gameId, score })
  }, [])

  const playAgain = useCallback(() => {
    setGameOver(null)
    setRestartKey((n) => n + 1)
  }, [])

  const handlePlay = useCallback(
    (cardKey: string, gameId: string) => {
      if (introRunningRef.current) {
        cancelIntro()
        return
      }
      enterPlay(cardKey, gameId)
    },
    [cancelIntro, enterPlay, introRunningRef],
  )

  useEffect(() => () => clearQualifyTimer(), [clearQualifyTimer])

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
    dismissNudge,
    dismissCue,
    applyPendingReload,
  }
}
