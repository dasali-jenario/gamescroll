import { beforeEach, describe, expect, it } from 'vitest'
import {
  betterScore,
  getHighscore,
  loadHighscores,
  recordHighscore,
} from './highscores'

describe('highscores', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', () => {
    expect(loadHighscores()).toEqual({})
    expect(getHighscore('pong')).toBe(0)
  })

  it('records a new best and ignores lower scores', () => {
    expect(recordHighscore('pong', 12)).toBe(12)
    expect(recordHighscore('pong', 8)).toBe(12)
    expect(recordHighscore('pong', 20)).toBe(20)
    expect(getHighscore('pong')).toBe(20)
    expect(loadHighscores()).toEqual({ pong: 20 })
  })

  it('keeps the lowest score for lower-is-better games', () => {
    expect(recordHighscore('reactflash', 280)).toBe(280)
    expect(recordHighscore('reactflash', 310)).toBe(280)
    expect(recordHighscore('reactflash', 190)).toBe(190)
    expect(getHighscore('reactflash')).toBe(190)
    expect(recordHighscore('race-start-reaction-3be720bf', 240)).toBe(240)
    expect(recordHighscore('race-start-reaction-3be720bf', 300)).toBe(240)
    expect(recordHighscore('race-start-reaction-3be720bf', 180)).toBe(180)
    expect(recordHighscore('storymole', 520)).toBe(520)
    expect(recordHighscore('storymole', 610)).toBe(520)
    expect(recordHighscore('storymole', 410)).toBe(410)
  })

  it('betterScore respects lower-is-better games', () => {
    expect(betterScore('pong', 10, 20)).toBe(20)
    expect(betterScore('reactflash', 10, 20)).toBe(10)
    expect(betterScore('reactflash', 0, 20)).toBe(20)
    expect(betterScore('race-start-reaction-3be720bf', 250, 180)).toBe(180)
    expect(betterScore('storymole', 500, 420)).toBe(420)
  })

  it('rejects non-positive and non-finite scores', () => {
    recordHighscore('pong', 5)
    expect(recordHighscore('pong', 0)).toBe(5)
    expect(recordHighscore('pong', -3)).toBe(5)
    expect(recordHighscore('pong', Number.NaN)).toBe(5)
  })

  it('floors fractional scores', () => {
    expect(recordHighscore('stack', 9.8)).toBe(9)
  })

  it('ignores corrupt localStorage payloads', () => {
    localStorage.setItem('gs_highscores', 'not-json')
    expect(loadHighscores()).toEqual({})
    localStorage.setItem('gs_highscores', JSON.stringify({ pong: 'nope', lanes: 4 }))
    expect(loadHighscores()).toEqual({ lanes: 4 })
  })
})
