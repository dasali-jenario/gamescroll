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

  it('is backed by the generator-emitted officialCatalog', async () => {
    const { officialCatalog } = await import('./generated/officialCatalog')
    expect(officialCatalog).toHaveLength(games.length)
    expect(games.map((g) => g.id)).toEqual(officialCatalog.map((e) => e.id))
    for (let i = 0; i < games.length; i++) {
      expect(games[i].title).toBe(officialCatalog[i].title)
      expect(games[i].tip).toBe(officialCatalog[i].tip)
      expect(games[i].accent).toBe(officialCatalog[i].accent)
      expect(games[i].src).toBe(`/games/${officialCatalog[i].id}.html`)
    }
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

  it('pins preferGame first on round 0', () => {
    const preferGame = games[games.length - 1]
    vi.spyOn(Math, 'random').mockReturnValue(0.42)
    const batch = buildFeedBatch(0, preferGame)
    expect(batch[0].game.id).toBe(preferGame.id)
  })

  it('ignores preferGame outside round 0', () => {
    const preferGame = games[games.length - 1]
    // random ≈ 1 → Fisher–Yates is a no-op, so catalog order is preserved
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const batch = buildFeedBatch(3, preferGame)
    expect(batch[0].game.id).toBe(games[0].id)
    expect(batch[0].key).toBe(`${games[0].id}-3-0`)
  })

  it('interleaves community games into the batch', () => {
    const community = [
      {
        id: 'ugc-demo',
        title: 'Demo',
        tip: 'Tap',
        src: 'https://example.com/g.html',
        accent: '#123456',
      },
    ]
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const batch = buildFeedBatch(1, null, community)
    expect(batch.some((item) => item.game.id === 'ugc-demo')).toBe(true)
    expect(batch.length).toBeGreaterThan(games.length)
  })
})
