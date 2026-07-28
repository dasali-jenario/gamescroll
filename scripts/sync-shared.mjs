#!/usr/bin/env node
/**
 * Sync Deno Edge `_shared` twins from `src/lib/*`.
 *
 * Usage:
 *   node scripts/sync-shared.mjs          # write Deno copies
 *   node scripts/sync-shared.mjs --check  # exit 1 if out of date
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const checkOnly = process.argv.includes('--check')

/** @type {{ src: string, dest: string, label: string }[]} */
const PAIRS = [
  {
    src: 'src/lib/gameWrap.ts',
    dest: 'supabase/functions/_shared/wrap.ts',
    label: 'src/lib/gameWrap.ts',
  },
  {
    src: 'src/lib/gameValidator.ts',
    dest: 'supabase/functions/_shared/validate.ts',
    label: 'src/lib/gameValidator.ts',
  },
  {
    src: 'src/lib/gameSmoke.ts',
    dest: 'supabase/functions/_shared/smoke.ts',
    label: 'src/lib/gameSmoke.ts',
  },
  {
    src: 'src/lib/layoutPlan.ts',
    dest: 'supabase/functions/_shared/layoutPlan.ts',
    label: 'src/lib/layoutPlan.ts',
  },
  {
    src: 'src/lib/mechanics.ts',
    dest: 'supabase/functions/_shared/mechanics.ts',
    label: 'src/lib/mechanics.ts',
  },
  {
    src: 'src/lib/patchBody.ts',
    dest: 'supabase/functions/_shared/patchBody.ts',
    label: 'src/lib/patchBody.ts',
  },
]

function stripLeadingFileComment(text) {
  const lines = text.split(/\n/)
  if (!lines.length) return text
  if (lines[0].startsWith('/**') && lines[0].includes('*/')) {
    return lines.slice(1).join('\n').replace(/^\n+/, '')
  }
  if (lines[0].startsWith('/**')) {
    let i = 0
    while (i < lines.length) {
      if (lines[i].includes('*/')) {
        return lines.slice(i + 1).join('\n').replace(/^\n+/, '')
      }
      i += 1
    }
  }
  return text
}

function denoBanner(label) {
  return `/** Deno copy of ${label} — keep in sync via \`node scripts/sync-shared.mjs\`. */\n\n`
}

function renderDeno(srcText, label) {
  return denoBanner(label) + stripLeadingFileComment(srcText)
}

let dirty = 0
for (const pair of PAIRS) {
  const srcPath = join(root, pair.src)
  const destPath = join(root, pair.dest)
  if (!existsSync(srcPath)) {
    console.error(`[sync-shared] missing source ${pair.src}`)
    process.exit(1)
  }
  const expected = renderDeno(readFileSync(srcPath, 'utf8'), pair.label)
  const current = existsSync(destPath) ? readFileSync(destPath, 'utf8') : null
  if (current === expected) {
    console.log(`[sync-shared] ok ${pair.dest}`)
    continue
  }
  dirty += 1
  if (checkOnly) {
    console.error(`[sync-shared] out of date: ${pair.dest}`)
    continue
  }
  writeFileSync(destPath, expected)
  console.log(`[sync-shared] wrote ${pair.dest}`)
}

if (checkOnly && dirty > 0) {
  console.error(
    `[sync-shared] ${dirty} file(s) drift — run: node scripts/sync-shared.mjs`,
  )
  process.exit(1)
}

if (!checkOnly) {
  console.log(`[sync-shared] done (${dirty} updated)`)
}
