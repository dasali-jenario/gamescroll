import { officialCatalog } from './generated/officialCatalog'

export type Game = {
  id: string
  title: string
  tip: string
  src: string
  accent: string
}

/** Official feed catalog — metadata emitted by `scripts/generate-games.mjs`. */
export const games: Game[] = officialCatalog.map((entry) => ({
  ...entry,
  src: `/games/${entry.id}.html`,
}))

export type FeedItem = {
  key: string
  game: Game
}

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id)
}

function shuffleGames(list: Game[]): Game[] {
  const shuffled = [...list]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/** Insert ~1 community game after every `every` official games. */
export function interleaveCommunity(
  official: Game[],
  community: Game[],
  every = 5,
): Game[] {
  if (!community.length) return official
  const out: Game[] = []
  let u = 0
  for (let i = 0; i < official.length; i++) {
    out.push(official[i])
    if ((i + 1) % every === 0 && community.length) {
      out.push(community[u % community.length])
      u += 1
    }
  }
  return out
}

/**
 * Build a shuffled batch of catalog games for the infinite feed.
 * `preferGame` pins a game first on round 0 (official or UGC).
 * `community` are approved UGC games interleaved into the batch.
 */
export function buildFeedBatch(
  round: number,
  preferGame?: Game | null,
  community: Game[] = [],
): FeedItem[] {
  const mixed = interleaveCommunity(shuffleGames(games), community, 5)

  if (preferGame && round === 0) {
    const without = mixed.filter((game) => game.id !== preferGame.id)
    without.unshift(preferGame)
    return without.map((game, i) => ({
      key: `${game.id}-${round}-${i}`,
      game,
    }))
  }

  return mixed.map((game, i) => ({ key: `${game.id}-${round}-${i}`, game }))
}
