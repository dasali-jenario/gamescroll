/**
 * Creator build-path honesty labels (arcade scaffold vs freeform).
 * Deno copy: supabase/functions/_shared/creatorPaths.ts
 */

export type CreatorBuildPath = 'arcade' | 'freeform'

const ARCADE = new Set(['reaction', 'timing', 'dodge', 'drag', 'stack'])

export function isArcadeMechanic(mechanic: string | undefined | null): boolean {
  return ARCADE.has(String(mechanic || '').toLowerCase())
}

export function resolveBuildPath(mechanic: string | undefined | null): CreatorBuildPath {
  return isArcadeMechanic(mechanic) ? 'arcade' : 'freeform'
}

/** Short line prepended to assistant replies on first build. */
export function pathHonestyPrefix(
  path: CreatorBuildPath,
  mechanic: string | undefined | null,
): string {
  if (path === 'arcade') {
    const m = String(mechanic || 'arcade')
    return `Building with the ${m} arcade format (locked layout chrome; theme/slots only).`
  }
  return 'Building a custom game (layout-checked freeform — not an arcade template).'
}

/** Prepend honesty once; skip if reply already states the path. */
export function withPathHonesty(
  reply: string,
  path: CreatorBuildPath,
  mechanic: string | undefined | null,
): string {
  const text = (reply || '').trim()
  const prefix = pathHonestyPrefix(path, mechanic)
  const lower = text.toLowerCase()
  if (
    lower.includes('arcade format') ||
    lower.includes('custom game (layout-checked') ||
    lower.includes('locked layout chrome')
  ) {
    return text || prefix
  }
  if (!text) return prefix
  return `${prefix}\n\n${text}`
}
