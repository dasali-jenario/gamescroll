export type Game = {
  id: string
  title: string
  tip: string
  src: string
  accent: string
}

export const games: Game[] = [
  {
    id: 'flap',
    title: 'Pipe Hop',
    tip: 'Tap to flap through the gap',
    src: '/games/flap.html',
    accent: '#2d6a4f',
  },
  {
    id: 'dodge',
    title: 'Lane Shift',
    tip: 'Tap left or right half to dodge',
    src: '/games/dodge.html',
    accent: '#1d3557',
  },
  {
    id: 'react',
    title: 'Green Flash',
    tip: 'Tap only when the circle turns green',
    src: '/games/react.html',
    accent: '#22223b',
  },
  {
    id: 'stack',
    title: 'Beat Stack',
    tip: 'Tap on the beat to stack higher',
    src: '/games/stack.html',
    accent: '#7b2d26',
  },
  {
    id: 'aim',
    title: 'Orb Hunt',
    tip: 'Tap the glowing orb before it fades',
    src: '/games/aim.html',
    accent: '#264653',
  },
  {
    id: 'catch',
    title: 'Sky Catch',
    tip: 'Tap left or right to catch falling stars',
    src: '/games/catch.html',
    accent: '#3c096c',
  },
]

export type FeedItem = {
  key: string
  game: Game
}

/** Build a shuffled batch of catalog games for the infinite feed. */
export function buildFeedBatch(round: number): FeedItem[] {
  const shuffled = [...games]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  // First open: keep a stable opener so the tip lands on a known card.
  if (round === 0) {
    return games.map((game, i) => ({ key: `${game.id}-0-${i}`, game }))
  }
  return shuffled.map((game, i) => ({ key: `${game.id}-${round}-${i}`, game }))
}
