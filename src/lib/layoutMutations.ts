/**
 * Deterministic layoutPlan mutations for creator Fix chips.
 * Deno copy: supabase/functions/_shared/layoutMutations.ts
 */
import type { LayoutRect } from './layoutPlan'
import { validateLayoutPlan } from './layoutPlan'

export type LayoutFixKind = 'fix_overlap' | 'enlarge_cta' | 'move_cta_down'

export type LayoutMutationResult =
  | { ok: true; plan: LayoutRect[]; label: string }
  | { ok: false; errors: string[]; plan: LayoutRect[] }

function clonePlan(plan: LayoutRect[]): LayoutRect[] {
  return plan.map((r) => ({ ...r }))
}

function tooClose(a: LayoutRect, b: LayoutRect, gapX: number, gapY: number): boolean {
  return !(
    a.x + a.w + gapX <= b.x ||
    b.x + b.w + gapX <= a.x ||
    a.y + a.h + gapY <= b.y ||
    b.y + b.h + gapY <= a.y
  )
}

/** Nudge overlapping pairs apart vertically (prefer moving the lower rect down). */
export function fixOverlap(plan: LayoutRect[]): LayoutMutationResult {
  const next = clonePlan(plan)
  const gapX = 12 / 390
  const gapY = 12 / 844
  let moved = false
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i]
      const b = next[j]
      if (!tooClose(a, b, gapX, gapY)) continue
      const lower = a.y + a.h / 2 >= b.y + b.h / 2 ? a : b
      const upper = lower === a ? b : a
      const need = upper.y + upper.h + gapY + 0.002 - lower.y
      if (need > 0) {
        lower.y = Math.min(0.9 - lower.h, lower.y + need)
        moved = true
      }
    }
  }
  if (!moved) {
    return { ok: false, errors: ['no overlapping rects to fix'], plan: next }
  }
  const check = validateLayoutPlan(next)
  if (!check.ok) return { ok: false, errors: check.errors, plan: next }
  return { ok: true, plan: check.plan, label: 'Fixed overlapping layout rects' }
}

/** Grow CTA band hit target slightly (width/height), keep centered. */
export function enlargeCta(plan: LayoutRect[]): LayoutMutationResult {
  const next = clonePlan(plan)
  const cta = next.find((r) => r.band === 'cta') || next.find((r) => /start|cta|btn|catcher|player|base/i.test(r.id))
  if (!cta) return { ok: false, errors: ['no CTA rect found'], plan: next }
  const cx = cta.x + cta.w / 2
  const newW = Math.min(0.86, cta.w + 0.06)
  const newH = Math.min(0.12, Math.max(cta.h + 0.015, 48 / 844))
  cta.w = newW
  cta.h = newH
  cta.x = Math.max(0.02, Math.min(0.98 - newW, cx - newW / 2))
  const check = validateLayoutPlan(next)
  if (!check.ok) return { ok: false, errors: check.errors, plan: next }
  return { ok: true, plan: check.plan, label: 'Enlarged primary button' }
}

/** Shift CTA band further into the lower third. */
export function moveCtaDown(plan: LayoutRect[]): LayoutMutationResult {
  const next = clonePlan(plan)
  const cta = next.find((r) => r.band === 'cta') || next.find((r) => /start|cta|btn|catcher|player|base/i.test(r.id))
  if (!cta) return { ok: false, errors: ['no CTA rect found'], plan: next }
  const cy = Math.min(0.82, Math.max(0.74, cta.y + cta.h / 2 + 0.04))
  cta.y = cy - cta.h / 2
  const check = validateLayoutPlan(next)
  if (!check.ok) return { ok: false, errors: check.errors, plan: next }
  return { ok: true, plan: check.plan, label: 'Moved primary button down' }
}

export function applyLayoutFix(plan: LayoutRect[], kind: LayoutFixKind): LayoutMutationResult {
  switch (kind) {
    case 'fix_overlap':
      return fixOverlap(plan)
    case 'enlarge_cta':
      return enlargeCta(plan)
    case 'move_cta_down':
      return moveCtaDown(plan)
    default:
      return { ok: false, errors: [`unknown layout fix: ${kind}`], plan: clonePlan(plan) }
  }
}
