/** @vitest-environment node */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const router = readFileSync(join(root, 'src/AppRouter.tsx'), 'utf8')
const feedSession = readFileSync(
  join(root, 'src/hooks/useFeedSession.ts'),
  'utf8',
)
const feedBoot = readFileSync(join(root, 'src/lib/feedBoot.ts'), 'utf8')
const ugc = readFileSync(join(root, 'src/lib/ugc.ts'), 'utf8')
const css = readFileSync(join(root, 'src/styles/base.css'), 'utf8')

describe('P2 cold-path contracts', () => {
  it('lazy-loads Create and Mod routes behind Suspense', () => {
    expect(router).toContain('lazy(')
    expect(router).toContain('Suspense')
    expect(router).toContain('route-loading')
    expect(router).toMatch(/import\('\.\/pages\/CreatePage'\)/)
    expect(router).toMatch(/import\('\.\/pages\/ModPage'\)/)
    expect(router).not.toMatch(
      /import \{ CreatePage \} from '\.\/pages\/CreatePage'/,
    )
    expect(router).not.toMatch(/import \{ ModPage \} from '\.\/pages\/ModPage'/)
    expect(css).toMatch(/\.route-loading\s*,|\.share-loading,\s*\n\.route-loading/)
  })

  it('boots feed UGC via resolveFeedBoot (parallel share + community)', () => {
    expect(feedSession).toContain('resolveFeedBoot')
    expect(feedSession).toContain('fetchCommunity: fetchApprovedUgcGames')
    expect(feedSession).toContain('fetchShared: fetchUgcBySlug')
    expect(feedBoot).toContain('Promise.all')
  })

  it('uses slim column lists instead of select(*) for UGC queries', () => {
    expect(ugc).toContain('UGC_FEED_COLUMNS')
    expect(ugc).toContain('UGC_MOD_COLUMNS')
    expect(ugc).toContain('UGC_MY_COLUMNS')
    expect(ugc).not.toMatch(/\.select\('\*'\)/)
    for (const col of [
      'slug',
      'title',
      'tip',
      'accent',
      'html_path',
      'html_url',
      'updated_at',
    ]) {
      expect(ugc).toMatch(new RegExp(`UGC_FEED_COLUMNS[\\s\\S]*${col}`))
    }
  })
})
