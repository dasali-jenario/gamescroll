import { beforeEach, describe, expect, it } from 'vitest'
import {
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
