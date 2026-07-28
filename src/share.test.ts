import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  gameShareText,
  gameShareUrl,
  readSharedGameId,
  readSharedGameParam,
  shareGame,
} from './share'
import { games } from './games'
import { recordHighscore } from './highscores'

describe('share deep links', () => {
  const original = window.location.href

  beforeEach(() => {
    window.history.replaceState({}, '', '/')
    localStorage.clear()
  })

  afterEach(() => {
    window.history.replaceState({}, '', original)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('readSharedGameId returns null without a valid catalog g param', () => {
    expect(readSharedGameId()).toBeNull()
    window.history.replaceState({}, '', '/?g=missing-game')
    expect(readSharedGameId()).toBeNull()
    expect(readSharedGameParam()).toBe('missing-game')
  })

  it('readSharedGameId accepts a catalog id', () => {
    const id = games[0].id
    window.history.replaceState({}, '', `/?g=${id}`)
    expect(readSharedGameId()).toBe(id)
    expect(readSharedGameParam()).toBe(id)
  })

  it('gameShareUrl builds an absolute ?g= link and clears other query/hash', () => {
    window.history.replaceState({}, '', '/play?x=1#section')
    const url = gameShareUrl('flappy')
    const parsed = new URL(url)
    expect(parsed.searchParams.get('g')).toBe('flappy')
    expect(parsed.searchParams.get('x')).toBeNull()
    expect(parsed.hash).toBe('')
  })

  it('gameShareText omits high score when none is stored', () => {
    const game = games[0]
    expect(gameShareText(game)).toBe(`Play ${game.title} — ${game.tip}`)
  })

  it('gameShareText includes personal high score from localStorage', () => {
    const game = games[0]
    recordHighscore(game.id, 42)
    expect(gameShareText(game)).toBe(
      `Play ${game.title} — ${game.tip}\nMy high score: 42`,
    )
  })

  it('gameShareText accepts an explicit best override', () => {
    const game = games[0]
    expect(gameShareText(game, 7)).toContain('My high score: 7')
    expect(gameShareText(game, 0)).not.toContain('My high score')
  })

  it('shareGame clipboard copies URL only when there is no high score', async () => {
    const game = games[0]
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    })

    await expect(shareGame(game)).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(gameShareUrl(game.id))
  })

  it('shareGame clipboard includes high score text and URL when stored', async () => {
    const game = games[0]
    recordHighscore(game.id, 42)
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    })

    await expect(shareGame(game)).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(
      `${gameShareText(game)}\n${gameShareUrl(game.id)}`,
    )
  })

  it('shareGame Web Share passes text with high score when stored', async () => {
    const game = games[0]
    recordHighscore(game.id, 15)
    const share = vi.fn(async () => {})
    vi.stubGlobal('navigator', {
      share,
      canShare: () => true,
    })

    await expect(shareGame(game)).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({
      title: `${game.title} on Gamescroll`,
      text: gameShareText(game),
      url: gameShareUrl(game.id),
    })
  })
})
