/** @vitest-environment node */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const creatorIndex = readFileSync(
  join(root, 'supabase/functions/creator/index.ts'),
  'utf8',
)
const modPage = readFileSync(join(root, 'src/pages/ModPage.tsx'), 'utf8')
const css = readFileSync(join(root, 'src/styles/mod.css'), 'utf8')

const sharedModules = [
  'creatorLlm.ts',
  'qualityGate.ts',
  'chatTurn.ts',
  'publishDraft.ts',
  'layoutFix.ts',
  'mechanicScaffolds.ts',
  'layoutMutations.ts',
  'layoutFidelity.ts',
] as const

describe('P2 creator carve + mod lazy iframes', () => {
  it('keeps creator Edge entry thin and wired to _shared handlers', () => {
    expect(creatorIndex.split('\n').length).toBeLessThan(120)
    expect(creatorIndex).toContain("from '../_shared/chatTurn.ts'")
    expect(creatorIndex).toContain("from '../_shared/publishDraft.ts'")
    expect(creatorIndex).toContain("from '../_shared/layoutFix.ts'")
    expect(creatorIndex).toContain('handleChatTurn')
    expect(creatorIndex).toContain('handlePublish')
    expect(creatorIndex).toContain('handleModerate')
    expect(creatorIndex).toContain('handleLayoutFix')
    expect(creatorIndex).toContain("action === 'layout_fix'")
    expect(creatorIndex).not.toContain('SYSTEM_PROMPT')
    expect(creatorIndex).not.toContain('ensureGameQuality')
    expect(creatorIndex).not.toContain('OPENAI_API_KEY')
  })

  it('ships creator pipeline modules under _shared', () => {
    for (const name of sharedModules) {
      const path = join(root, 'supabase/functions/_shared', name)
      expect(existsSync(path), path).toBe(true)
      const src = readFileSync(path, 'utf8')
      expect(src.length).toBeGreaterThan(200)
    }
    const chat = readFileSync(
      join(root, 'supabase/functions/_shared/chatTurn.ts'),
      'utf8',
    )
    const quality = readFileSync(
      join(root, 'supabase/functions/_shared/qualityGate.ts'),
      'utf8',
    )
    const fix = readFileSync(
      join(root, 'supabase/functions/_shared/layoutFix.ts'),
      'utf8',
    )
    expect(chat).toContain('export async function handleChatTurn')
    expect(chat).toContain('materializeScaffold')
    expect(quality).toContain('export async function ensureGameQuality')
    expect(quality).toContain('checkBodyLayoutFidelity')
    expect(fix).toContain('export async function handleLayoutFix')
    expect(fix).toContain('applyLayoutFix')
  })

  it('gates ModPage iframes with visibility/expand + usePlayableFrameSrc', () => {
    expect(modPage).toContain('usePlayableFrameSrc')
    expect(modPage).toContain('IntersectionObserver')
    expect(modPage).toContain('mod-frame-placeholder')
    expect(modPage).not.toMatch(
      /rows\.map[\s\S]*?<iframe[\s\S]*?src=\{game\.src\}/,
    )
    expect(css).toContain('.mod-frame-placeholder')
  })
})
