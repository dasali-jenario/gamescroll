/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('Better Game Builder Phase 1 contracts', () => {
  it('CreatePage wires layout_fix chips + plan overlay', () => {
    const page = readFileSync(join(root, 'src/pages/CreatePage.tsx'), 'utf8')
    const overlay = join(root, 'src/components/LayoutPlanOverlay.tsx')
    expect(existsSync(overlay)).toBe(true)
    expect(page).toContain('LayoutPlanOverlay')
    expect(page).toContain("action: 'layout_fix'")
    expect(page).toContain('fix_overlap')
    expect(page).toContain('enlarge_cta')
    expect(page).toContain('move_cta_down')
    expect(page).toContain('Show plan')
    expect(page).toContain('Layout / quality issues to fix')
  })

  it('wrap shell exposes GS.layoutFromPlan', () => {
    const wrap = readFileSync(join(root, 'src/lib/gameWrap.ts'), 'utf8')
    expect(wrap).toContain('GS.layoutFromPlan')
  })

  it('chatTurn first builds materialize scaffolds from slots', () => {
    const chat = readFileSync(
      join(root, 'supabase/functions/_shared/chatTurn.ts'),
      'utf8',
    )
    expect(chat).toContain('materializeScaffold')
    expect(chat).toContain('firstBuildSeedMessage')
    expect(chat).toContain('hasArcadeScaffold')
    expect(chat).toContain('useArcadeScaffold')
    expect(chat).toContain('requireHarvest: true')
    expect(chat).toContain('lockBody: useArcadeScaffold')
    expect(chat).not.toContain('canonExampleFor')
    expect(chat).not.toContain('custom → reaction')
  })

  it('qualityGate hard-requires layout fidelity harvest', () => {
    const quality = readFileSync(
      join(root, 'supabase/functions/_shared/qualityGate.ts'),
      'utf8',
    )
    expect(quality).toContain('checkBodyLayoutFidelity')
    expect(quality).toContain('requireHarvest')
    expect(quality).toContain('lockBody')
    expect(quality).toContain('const SLOTS is missing')
    expect(quality).toContain('pre = checkGame(game')
  })

  it('sync-shared rewrites relative imports with .ts for Deno', () => {
    const sync = readFileSync(join(root, 'scripts/sync-shared.mjs'), 'utf8')
    expect(sync).toContain('layoutFidelity.ts')
    expect(sync).toContain('mechanicScaffolds.ts')
    expect(sync).toContain('layoutMutations.ts')
    expect(sync).toContain('${path}.ts')

    const twin = readFileSync(
      join(root, 'supabase/functions/_shared/layoutMutations.ts'),
      'utf8',
    )
    expect(twin).toContain("from './layoutPlan.ts'")
    expect(twin).not.toMatch(/from '\.\/layoutPlan'/)
  })

  it('docs describe scaffold first-build + deploy without angle-bracket placeholder', () => {
    const docs = readFileSync(join(root, 'docs/CREATOR.md'), 'utf8')
    expect(docs).toContain('golden scaffold')
    expect(docs).toContain('FREEFORM')
    expect(docs).toContain('layout_fix')
    expect(docs).toContain('SUPABASE_PROJECT_REF')
    expect(docs).not.toContain('--project-ref <ref>')
  })
})

describe('Variety Phase 0 — custom freeform', () => {
  it('chatTurn applies generic chrome on custom freeform first builds', () => {
    const chat = readFileSync(
      join(root, 'supabase/functions/_shared/chatTurn.ts'),
      'utf8',
    )
    expect(chat).toContain('ensureFreeformChrome')
    expect(chat).toContain('resolveFreeformLayoutPlan')
    expect(chat).toContain('useArcadeScaffold')
  })

  it('sync-shared includes genericChrome', () => {
    const sync = readFileSync(join(root, 'scripts/sync-shared.mjs'), 'utf8')
    expect(sync).toContain('genericChrome.ts')
  })
})

describe('Variety Phase 2 — path honesty', () => {
  it('chatTurn stores buildPath and applies withPathHonesty', () => {
    const chat = readFileSync(
      join(root, 'supabase/functions/_shared/chatTurn.ts'),
      'utf8',
    )
    expect(chat).toContain('withPathHonesty')
    expect(chat).toContain('buildPath')
    expect(chat).toContain('creatorPaths')
  })

  it('Create welcome explains arcade vs custom without genre studios', () => {
    const create = readFileSync(join(root, 'src/pages/CreatePage.tsx'), 'utf8')
    expect(create).toContain('arcade format')
    expect(create).toContain("won't silently turn your idea")
    expect(create).not.toContain('Wordle studio')
  })

  it('sync-shared includes creatorPaths', () => {
    const sync = readFileSync(join(root, 'scripts/sync-shared.mjs'), 'utf8')
    expect(sync).toContain('creatorPaths.ts')
  })

  it('chatTurn logs creator_quality_fail via creatorLog', () => {
    const chat = readFileSync(
      join(root, 'supabase/functions/_shared/chatTurn.ts'),
      'utf8',
    )
    expect(chat).toContain('logCreatorRun')
    expect(chat).toContain('creator_quality_fail')
    expect(chat).toContain('creator_draft_saved')
    const log = readFileSync(
      join(root, 'supabase/functions/_shared/creatorLog.ts'),
      'utf8',
    )
    expect(log).toContain('creator_run_logs')
  })
})
