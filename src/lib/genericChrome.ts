/**
 * Genre-agnostic portrait chrome for freeform UGC.
 * Locks safe bands via layoutPlan + GS.layoutFromPlan — mechanics fill inside rects.
 * Deno copy: supabase/functions/_shared/genericChrome.ts
 */
import type { LayoutRect } from './layoutPlan'
import { validateLayoutPlan } from './layoutPlan'

/** Default portrait chrome — title / focal / hint / cta. Not a game. */
export const DEFAULT_PORTRAIT_CHROME: LayoutRect[] = [
  { id: 'title', x: 0.1, y: 0.14, w: 0.8, h: 0.06, band: 'title' },
  { id: 'focus', x: 0.1, y: 0.28, w: 0.8, h: 0.36, band: 'focal' },
  { id: 'hint', x: 0.1, y: 0.66, w: 0.8, h: 0.05, band: 'hint' },
  { id: 'cta', x: 0.15, y: 0.74, w: 0.7, h: 0.08, band: 'cta' },
]

export function cloneChromePlan(plan: LayoutRect[] = DEFAULT_PORTRAIT_CHROME): LayoutRect[] {
  return plan.map((r) => ({ ...r }))
}

/** Use model plan when valid; otherwise default portrait chrome. */
export function resolveFreeformLayoutPlan(raw: unknown): LayoutRect[] {
  const check = validateLayoutPlan(raw)
  if (check.ok) return check.plan
  return cloneChromePlan()
}

export function replaceLayoutPlanLiteral(bodyJs: string, plan: LayoutRect[]): string {
  const json = JSON.stringify(plan)
  if (/const LAYOUT_PLAN\s*=\s*\[[\s\S]*?\]/.test(bodyJs)) {
    return bodyJs.replace(/const LAYOUT_PLAN\s*=\s*\[[\s\S]*?\]/, `const LAYOUT_PLAN = ${json}`)
  }
  return bodyJs
}

/**
 * Boilerplate the freeform seed shows the model (and we may prepend if missing).
 * Mechanics go inside L.title / L.focus / L.hint / L.cta — do not invent chrome coords.
 */
export function chromeBoilerplateJs(plan: LayoutRect[] = DEFAULT_PORTRAIT_CHROME): string {
  const json = JSON.stringify(plan)
  return [
    `const LAYOUT_PLAN = ${json}`,
    'let L = {}',
    'function layoutRects(){ return L }',
    'function layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }',
  ].join('\n')
}

export function bodyHasChromeContract(bodyJs: string): boolean {
  return (
    /const\s+LAYOUT_PLAN\s*=/.test(bodyJs) &&
    /GS\.layoutFromPlan/.test(bodyJs) &&
    /function\s+layoutRects\s*\(/.test(bodyJs)
  )
}

/**
 * Ensure freeform body exposes harvestable chrome without being a genre template.
 * - Locks/replaces LAYOUT_PLAN to the resolved plan
 * - Injects layoutFromPlan + layoutRects if missing
 * - Prepends `let L = {}` when needed
 */
export function ensureFreeformChrome(
  bodyJs: string,
  plan: LayoutRect[] = DEFAULT_PORTRAIT_CHROME,
): string {
  let body = bodyJs.trim()
  if (!body) return chromeBoilerplateJs(plan) + '\n'

  if (/const\s+LAYOUT_PLAN\s*=/.test(body)) {
    body = replaceLayoutPlanLiteral(body, plan)
  } else {
    body = `const LAYOUT_PLAN = ${JSON.stringify(plan)}\n` + body
  }

  if (!/\blet\s+L\b|\bvar\s+L\b|\bconst\s+L\b/.test(body)) {
    body = body.replace(
      /const LAYOUT_PLAN\s*=\s*\[[\s\S]*?\]/,
      (m) => `${m}\nlet L = {}`,
    )
  }

  if (!/GS\.layoutFromPlan/.test(body)) {
    if (/function\s+layout\s*\(\s*\)\s*\{/.test(body)) {
      body = body.replace(
        /function\s+layout\s*\(\s*\)\s*\{/,
        'function layout(){\n  L = GS.layoutFromPlan(LAYOUT_PLAN, W, H);',
      )
    } else {
      body +=
        '\nfunction layout(){ L = GS.layoutFromPlan(LAYOUT_PLAN, W, H) }\n'
    }
  }

  if (!/function\s+layoutRects\s*\(/.test(body)) {
    body += '\nfunction layoutRects(){ return L }\n'
  }

  return body
}

/** Text block injected into the custom freeform seed. */
export function freeformChromeSeedSection(
  plan: LayoutRect[] = DEFAULT_PORTRAIT_CHROME,
): string {
  return [
    'GENERIC CHROME CONTRACT (required — not a specific game template):',
    '- Start from this portrait chrome. Invent ANY mechanic inside the rects.',
    '- Do not invent a second freeform coordinate system for title/CTA chrome.',
    '- Keep const LAYOUT_PLAN, layout() via GS.layoutFromPlan, and layoutRects().',
    'Copy this preamble into bodyJs (then add your game logic):',
    '```javascript',
    chromeBoilerplateJs(plan),
    '// … your tick/draw/pointer using L.title, L.focus, L.hint, L.cta …',
    '// Init puzzle/board state here OR call reset() below — draw runs before onHostStart.',
    'layout()',
    '```',
    'Default layoutPlan JSON:',
    JSON.stringify(plan),
  ].join('\n')
}
