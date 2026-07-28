/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const indexCss = readFileSync(join(root, 'src/index.css'), 'utf8')

const surfaces = ['base', 'feed', 'create', 'mod'] as const

describe('CSS by surface', () => {
  it('keeps index.css as an import barrel for surface sheets', () => {
    expect(indexCss).toContain("@import './styles/base.css'")
    expect(indexCss).toContain("@import './styles/feed.css'")
    expect(indexCss).toContain("@import './styles/create.css'")
    expect(indexCss).toContain("@import './styles/mod.css'")
    expect(indexCss.split('\n').length).toBeLessThan(20)
  })

  it('ships one stylesheet per host surface', () => {
    for (const name of surfaces) {
      const path = join(root, `src/styles/${name}.css`)
      expect(existsSync(path), path).toBe(true)
      expect(readFileSync(path, 'utf8').length).toBeGreaterThan(100)
    }
    expect(readFileSync(join(root, 'src/styles/feed.css'), 'utf8')).toContain(
      '.feed',
    )
    expect(readFileSync(join(root, 'src/styles/create.css'), 'utf8')).toContain(
      '.create-page',
    )
    expect(readFileSync(join(root, 'src/styles/mod.css'), 'utf8')).toContain(
      '.mod-list',
    )
    expect(readFileSync(join(root, 'src/styles/base.css'), 'utf8')).toContain(
      ':root',
    )
  })
})
