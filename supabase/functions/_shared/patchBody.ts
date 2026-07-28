/** Deno copy of src/lib/patchBody.ts — keep in sync via `node scripts/sync-shared.mjs`. */

export type BodyPatch = {
  find: string
  replace: string
  /** Replace every occurrence instead of requiring a unique match. */
  all?: boolean
}

export type PatchResult =
  | { ok: true; body: string; applied: number }
  | { ok: false; errors: string[] }

export const MAX_PATCHES = 20
const MAX_PATCH_CHARS = 8_000

export function parseBodyPatches(raw: unknown): BodyPatch[] {
  if (!Array.isArray(raw)) return []
  const out: BodyPatch[] = []
  for (const item of raw.slice(0, MAX_PATCHES)) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const find = typeof o.find === 'string' ? o.find : ''
    const replace = typeof o.replace === 'string' ? o.replace : ''
    if (!find.trim()) continue
    if (find.length > MAX_PATCH_CHARS || replace.length > MAX_PATCH_CHARS) continue
    out.push({ find, replace, all: o.all === true })
  }
  return out
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  let from = 0
  for (;;) {
    const i = haystack.indexOf(needle, from)
    if (i < 0) return count
    count++
    from = i + needle.length
  }
}

/**
 * Apply ordered search/replace edits to an existing body.
 * A non-`all` patch must match exactly once so tweaks stay unambiguous.
 */
export function applyBodyPatches(source: string, patches: BodyPatch[]): PatchResult {
  if (!source.trim()) return { ok: false, errors: ['no existing body to patch'] }
  if (patches.length === 0) return { ok: false, errors: ['no patches provided'] }

  const errors: string[] = []
  let body = source
  let applied = 0

  for (const [i, patch] of patches.entries()) {
    const hits = countOccurrences(body, patch.find)
    const label = `patch ${i + 1} ("${patch.find.slice(0, 48).replace(/\s+/g, ' ')}…")`
    if (hits === 0) {
      errors.push(`${label} did not match the current body`)
      continue
    }
    if (hits > 1 && !patch.all) {
      errors.push(`${label} matched ${hits} places — make it unique or set all:true`)
      continue
    }
    body = patch.all
      ? body.split(patch.find).join(patch.replace)
      : body.replace(patch.find, patch.replace)
    applied++
  }

  if (errors.length) return { ok: false, errors }
  return { ok: true, body, applied }
}
