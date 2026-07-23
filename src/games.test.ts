import { describe, expect, it, vi } from 'vitest'
import { buildFeedBatch, games, getGameById } from './games'

describe('games catalog', () => {
  it('has unique ids', () => {
    const ids = games.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('entries have required fields and matching src paths', () => {
    for (const game of games) {
      expect(game.id).toMatch(/^[a-z][a-z0-9-]*$/)
      expect(game.title.length).toBeGreaterThan(0)
      expect(game.tip.length).toBeGreaterThan(0)
      expect(game.src).toBe(`/games/${game.id}.html`)
      expect(game.accent).toMatch(/^#[0-9a-fA-F]{3,8}$/)
    }
  })

  it('getGameById finds known games and rejects unknown', () => {
    expect(getGameById(games[0].id)?.title).toBe(games[0].title)
    expect(getGameById('not-a-real-game')).toBeUndefined()
  })
})

describe('buildFeedBatch', () => {
  it('returns one item per catalog game with stable key shape', () => {
    const batch = buildFeedBatch(2)
    expect(batch).toHaveLength(games.length)
    expect(batch.every((item) => item.key.startsWith(`${item.game.id}-2-`))).toBe(
      true,
    )
    expect(new Set(batch.map((item) => item.game.id)).size).toBe(games.length)
  })

  it('pins preferId first on round 0', () => {
    const preferId = games[games.length - 1].id
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
    const batch = buildFeedBatch(0, preferId)
    expect(batch[0].game.id).toBe(preferId)
  })

  it('ignores preferId outside round 0', () => {
    const preferId = games[games.length - 1].id
    // random ≈ 1 → Fisher–Yates is a no-op, so catalog order is preserved
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const batch = buildFeedBatch(3, preferId)
    expect(batch[0].game.id).toBe(games[0].id)
    expect(batch[0].key).toBe(`${games[0].id}-3-0`)
  })
})
