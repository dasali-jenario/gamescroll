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
]
