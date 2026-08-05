/** Validate / smoke / repair / critique loop for generated UGC bodies. */
import { validateLayoutPlan } from './layoutPlan.ts'
import { checkBodyLayoutFidelity } from './layoutFidelity.ts'
import { driveGameBody, smokeGameBody } from './smoke.ts'
import { validateGameBody } from './validate.ts'
import {
  critiqueAndFix,
  repairBody,
  type ChatMessage,
  type LlmGamePayload,
} from './creatorLlm.ts'

export function checkGame(
  game: LlmGamePayload,
  opts?: { requireHarvest?: boolean },
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const staticCheck = validateGameBody(game.bodyJs)
  if (!staticCheck.ok) errors.push(...staticCheck.errors)
  const planCheck = validateLayoutPlan(game.layoutPlan)
  if (!planCheck.ok) errors.push(...planCheck.errors)
  // Catch critique/repair rewrites that drop `const SLOTS` but leave SLOTS.foo usage.
  if (/\bSLOTS\s*[.\[]/.test(game.bodyJs) && !/const\s+SLOTS\s*=/.test(game.bodyJs)) {
    errors.push(
      'bodyJs references SLOTS but const SLOTS is missing (preserve scaffold SLOTS / rematerialize)',
    )
  }
  if (errors.length) return { ok: false, errors }
  const smoke = smokeGameBody(game.bodyJs)
  if (!smoke.ok) return smoke
  const fidelity = checkBodyLayoutFidelity(game.bodyJs, planCheck.plan, {
    requireHarvest: opts?.requireHarvest !== false,
  })
  if (!fidelity.ok) return { ok: false, errors: fidelity.errors }
  // Driven playability run: hard fail for new drafts — a draft must survive a
  // started game, a pointer-tap sweep, and the die()/recovery path.
  const play = driveGameBody(game.bodyJs, { seconds: 6 })
  if (!play.ok) return { ok: false, errors: play.errors }
  return { ok: true }
}

/** Leave headroom under Supabase's ~150s request idle timeout. */
export const QUALITY_DEADLINE_MS = 95_000

export async function ensureGameQuality(
  game: LlmGamePayload,
  prior: ChatMessage[],
  opts?: {
    skipCritique?: boolean
    startedAt?: number
    requireHarvest?: boolean
    /** Scaffold first builds: never LLM-rewrite bodyJs (slots-only path). */
    lockBody?: boolean
  },
): Promise<
  | { ok: true; game: LlmGamePayload; critiqueIssues: string[] }
  | { ok: false; errors: string[]; game: LlmGamePayload }
> {
  const startedAt = opts?.startedAt ?? Date.now()
  const remaining = () => QUALITY_DEADLINE_MS - (Date.now() - startedAt)
  const requireHarvest = opts?.requireHarvest !== false
  const lockBody = Boolean(opts?.lockBody)
  let current = game
  let check = checkGame(current, { requireHarvest })
  if (!check.ok) {
    if (lockBody || remaining() < 25_000) {
      return { ok: false, errors: check.errors, game: current }
    }
    current = await repairBody(current.bodyJs, check.errors, prior, current)
    check = checkGame(current, { requireHarvest })
    if (!check.ok) return { ok: false, errors: check.errors, game: current }
  }

  if (opts?.skipCritique || lockBody || remaining() < 35_000) {
    return {
      ok: true,
      game: current,
      critiqueIssues: opts?.skipCritique || lockBody
        ? ['critique skipped: scaffold/patch path']
        : ['critique skipped: time budget'],
    }
  }

  const critique = await critiqueAndFix(current)
  current = critique.game
  if (critique.changed) {
    check = checkGame(current, { requireHarvest })
    if (!check.ok) {
      if (remaining() < 25_000) {
        // Prefer shipping the pre-critique body only if it still passes geometry.
        const pre = checkGame(game, { requireHarvest })
        if (pre.ok) {
          return { ok: true, game, critiqueIssues: [...critique.issues, ...check.errors] }
        }
        return { ok: false, errors: check.errors, game: current }
      }
      current = await repairBody(current.bodyJs, check.errors, prior, current)
      check = checkGame(current, { requireHarvest })
      if (!check.ok) return { ok: false, errors: check.errors, game: current }
    }
  }

  return { ok: true, game: current, critiqueIssues: critique.issues }
}
