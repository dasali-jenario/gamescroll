import { beforeEach, describe, expect, it } from 'vitest'
import {
  AUTO_RESTART_KEY,
  autoRestartForBridge,
  persistAutoRestart,
  resolveAutoRestart,
} from './experiments'

describe('experiments auto-restart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('maps bridge onFail values', () => {
    expect(autoRestartForBridge(true)).toBe('replay')
    expect(autoRestartForBridge(false)).toBe('gameover')
  })

  it('defaults to auto-restart on', () => {
    expect(resolveAutoRestart('')).toBe(true)
  })

  it('reads and persists URL autorestart', () => {
    expect(resolveAutoRestart('?autorestart=0')).toBe(false)
    expect(localStorage.getItem(AUTO_RESTART_KEY)).toBe('0')
    expect(resolveAutoRestart('?autorestart=1')).toBe(true)
    expect(localStorage.getItem(AUTO_RESTART_KEY)).toBe('1')
  })

  it('accepts legacy fail query values', () => {
    expect(resolveAutoRestart('?fail=gameover')).toBe(false)
    expect(resolveAutoRestart('?fail=replay')).toBe(true)
  })

  it('falls back to persisted preference when URL is absent', () => {
    persistAutoRestart(false)
    expect(resolveAutoRestart('')).toBe(false)
    persistAutoRestart(true)
    expect(resolveAutoRestart('')).toBe(true)
  })

  it('migrates legacy localStorage fail mode', () => {
    localStorage.setItem('gs_fail_mode', 'gameover')
    expect(resolveAutoRestart('')).toBe(false)
  })
})
