/** Validate / smoke / repair / critique loop for generated UGC bodies. */
import { validateLayoutPlan } from './layoutPlan.ts'
import { smokeGameBody } from './smoke.ts'
import { validateGameBody } from './validate.ts'
import {
  critiqueAndFix,
  repairBody,
  type ChatMessage,
  type LlmGamePayload,
} from './creatorLlm.ts'

export function checkGame(
  game: LlmGamePayload,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const staticCheck = validateGameBody(game.bodyJs)
  if (!staticCheck.ok) errors.push(...staticCheck.errors)
  const planCheck = validateLayoutPlan(game.layoutPlan)
  if (!planCheck.ok) errors.push(...planCheck.errors)
  if (errors.length) return { ok: false, errors }
  const smoke = smokeGameBody(game.bodyJs)
  if (!smoke.ok) return smoke
  return { ok: true }
}

/** Leave headroom under Supabase's ~150s request idle timeout. */
export const QUALITY_DEADLINE_MS = 95_000

export async function ensureGameQuality(
  game: LlmGamePayload,
  prior: ChatMessage[],
  opts?: { skipCritique?: boolean; startedAt?: number },
): Promise<
  | { ok: true; game: LlmGamePayload; critiqueIssues: string[] }
  | { ok: false; errors: string[]; game: LlmGamePayload }
> {
  const startedAt = opts?.startedAt ?? Date.now()
  const remaining = () => QUALITY_DEADLINE_MS - (Date.now() - startedAt)
  let current = game
  let check = checkGame(current)
  if (!check.ok) {
    if (remaining() < 25_000) {
      return { ok: false, errors: check.errors, game: current }
    }
    current = await repairBody(current.bodyJs, check.errors, prior, current)
    check = checkGame(current)
    if (!check.ok) return { ok: false, errors: check.errors, game: current }
  }

  if (opts?.skipCritique || remaining() < 35_000) {
    return {
      ok: true,
      game: current,
      critiqueIssues: opts?.skipCritique
        ? ['critique skipped: clean patch iterate']
        : ['critique skipped: time budget'],
    }
  }

  const critique = await critiqueAndFix(current)
  current = critique.game
  if (critique.changed) {
    check = checkGame(current)
    if (!check.ok) {
      if (remaining() < 25_000) {
        // Prefer shipping the pre-critique body over timing out.
        return { ok: true, game, critiqueIssues: [...critique.issues, ...check.errors] }
      }
      current = await repairBody(current.bodyJs, check.errors, prior, current)
      check = checkGame(current)
      if (!check.ok) return { ok: false, errors: check.errors, game: current }
    }
  }

  return { ok: true, game: current, critiqueIssues: critique.issues }
}

