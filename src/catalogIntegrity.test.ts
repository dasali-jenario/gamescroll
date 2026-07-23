/** @vitest-environment node */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { games } from './games'

const gamesDir = join(process.cwd(), 'public', 'games')

const REQUIRED_BRIDGE_SNIPPETS = [
  'gamescroll:ready',
  'gamescroll:start',
  'gamescroll:pause',
  'gamescroll:score',
  'gamescroll:died',
  'gamescroll:swipe-next',
  'gamescroll:swipe-prev',
  'onFail',
]

describe('catalog integrity', () => {
  it('every catalog game has a generated HTML file', () => {
    for (const game of games) {
      const path = join(gamesDir, `${game.id}.html`)
      expect(existsSync(path), `missing ${game.src}`).toBe(true)
    }
  })

  it('every public game HTML is listed in the catalog', () => {
    const files = readdirSync(gamesDir).filter((f) => f.endsWith('.html'))
    const catalogIds = new Set(games.map((g) => g.id))
    for (const file of files) {
      const id = file.replace(/\.html$/, '')
      expect(catalogIds.has(id), `orphan public/games/${file}`).toBe(true)
    }
    expect(files).toHaveLength(games.length)
  })

  it('generated games include the host bridge contract', () => {
    const sample = readFileSync(join(gamesDir, `${games[0].id}.html`), 'utf8')
    for (const snippet of REQUIRED_BRIDGE_SNIPPETS) {
      expect(sample.includes(snippet), `missing bridge snippet: ${snippet}`).toBe(
        true,
      )
    }
  })

  it('culled games are not shipped', () => {
    for (const id of ['orbit', 'light', 'helix', 'shield']) {
      expect(existsSync(join(gamesDir, `${id}.html`))).toBe(false)
      expect(games.some((g) => g.id === id)).toBe(false)
    }
  })
})
