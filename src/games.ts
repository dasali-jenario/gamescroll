export type Game = {
  id: string
  title: string
  tip: string
  src: string
  accent: string
}

export const games: Game[] = [
  { id: 'pong', title: 'Pocket Pong', tip: 'Drag to keep the ball bouncing', src: '/games/pong.html', accent: '#1b4332' },
  { id: 'flappy', title: 'Flappy', tip: 'Tap to stay airborne', src: '/games/flappy.html', accent: '#2d6a4f' },
  { id: 'fish', title: 'Tiny Fish', tip: 'Hold to swim up through coral, release to dive', src: '/games/fish.html', accent: '#0077b6' },
  { id: 'lanes', title: 'Lane Switch', tip: 'Tap to switch lanes', src: '/games/lanes.html', accent: '#1d3557' },
  { id: 'stack', title: 'Falling Stack', tip: 'Tap to drop the moving block', src: '/games/stack.html', accent: '#7b2d26' },
  { id: 'orbit', title: 'Orbit Jump', tip: 'Tap to leap to the next planet', src: '/games/orbit.html', accent: '#22223b' },
  { id: 'ski', title: 'Endless Ski', tip: 'Slide to dodge trees', src: '/games/ski.html', accent: '#457b9d' },
  { id: 'gravity', title: 'Gravity Flip', tip: 'Tap to flip floor and ceiling', src: '/games/gravity.html', accent: '#3d405b' },
  { id: 'bubbles', title: 'Bubble Pressure', tip: 'Tap bubbles before they escape', src: '/games/bubbles.html', accent: '#0077b6' },
  { id: 'helix', title: 'Helix Drop', tip: 'Drag to rotate the tower', src: '/games/helix.html', accent: '#6a4c93' },
  { id: 'road', title: 'Stay on the Road', tip: 'Drag to stay on the winding road', src: '/games/road.html', accent: '#264653' },
  { id: 'balloon', title: 'Balloon Tap', tip: 'Tap the balloon to keep it up', src: '/games/balloon.html', accent: '#e76f51' },
  { id: 'colour', title: 'Colour Gate', tip: 'Tap to match the next gate', src: '/games/colour.html', accent: '#9b2226' },
  { id: 'doodle', title: 'Endless Doodle Jump', tip: 'Tilt sideways between platforms', src: '/games/doodle.html', accent: '#2a9d8f' },
  { id: 'tunnel', title: 'Tunnel Drift', tip: 'Drag through the moving tunnel', src: '/games/tunnel.html', accent: '#023e8a' },
  { id: 'shield', title: 'Shield the Core', tip: 'Drag to block incoming hits', src: '/games/shield.html', accent: '#4a4e69' },
  { id: 'pulse', title: 'Perfect Pulse', tip: 'Tap when the rings overlap', src: '/games/pulse.html', accent: '#5e548e' },
  { id: 'snake', title: 'Snake Lite', tip: 'Swipe to turn toward dots', src: '/games/snake.html', accent: '#386641' },
  { id: 'cross', title: 'Cross Forever', tip: 'Tap to hop across lanes', src: '/games/cross.html', accent: '#6c584c' },
  { id: 'catch', title: 'Catch or Dodge', tip: 'Catch friends, dodge threats', src: '/games/catch.html', accent: '#3c096c' },
  { id: 'ridge', title: 'Rolling Ridge', tip: 'Steer along the narrow ridge', src: '/games/ridge.html', accent: '#582f0e' },
  { id: 'wall', title: 'Wall Bounce', tip: 'Tap to bounce between walls', src: '/games/wall.html', accent: '#bc4749' },
  { id: 'dance', title: 'Two-Dot Dance', tip: 'Tap to reverse the spin', src: '/games/dance.html', accent: '#7209b7' },
  { id: 'balance', title: 'Keep It Balanced', tip: 'Tilt to keep the ball on', src: '/games/balance.html', accent: '#b08968' },
  { id: 'shapes', title: 'Shape Squeeze', tip: 'Tap to match the next hole', src: '/games/shapes.html', accent: '#d62828' },
  { id: 'rain', title: 'Rain Dodger', tip: 'Drag sideways under the rain', src: '/games/rain.html', accent: '#415a77' },
  { id: 'magnet', title: 'Magnet Flip', tip: 'Tap to reverse polarity', src: '/games/magnet.html', accent: '#9d4edd' },
  { id: 'light', title: 'Light Chaser', tip: 'Chase the glow before darkness', src: '/games/light.html', accent: '#f4a261' },
  { id: 'breakout', title: 'Mini Breakout', tip: 'Bounce through endless bricks', src: '/games/breakout.html', accent: '#e9c46a' },
]

export type FeedItem = {
  key: string
  game: Game
}

export function getGameById(id: string): Game | undefined {
  return games.find((game) => game.id === id)
}

/** Build a shuffled batch of catalog games for the infinite feed. */
export function buildFeedBatch(
  round: number,
  preferId?: string | null,
): FeedItem[] {
  const shuffled = [...games]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  if (preferId && round === 0) {
    const idx = shuffled.findIndex((game) => game.id === preferId)
    if (idx > 0) {
      const [picked] = shuffled.splice(idx, 1)
      shuffled.unshift(picked)
    }
  }

  return shuffled.map((game, i) => ({ key: `${game.id}-${round}-${i}`, game }))
}
