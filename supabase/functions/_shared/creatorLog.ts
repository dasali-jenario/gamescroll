/** Persist creator Edge diagnostics to public.creator_run_logs (+ console). */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Keep enough bodyJs to reproduce idle/smoke crashes offline (no auto-TTL on table). */
const MAX_BODY = 48_000
const MAX_PROMPT = 2_500
const MAX_ERRORS = 32
const MAX_ERROR_CHARS = 1_200

export type CreatorLogInput = {
  user_id: string
  event: string
  game_id?: string | null
  slug?: string | null
  phase?: string | null
  mechanic?: string | null
  build_path?: string | null
  ok?: boolean | null
  errors?: string[] | null
  duration_ms?: number | null
  user_prompt?: string | null
  body_js?: string | null
  props?: Record<string, unknown> | null
}

function clip(text: string | null | undefined, max: number): string | null {
  if (text == null) return null
  const s = String(text)
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n…[truncated ${s.length - max} chars]`
}

/** Best-effort insert; never throws into the request path. */
export async function logCreatorRun(
  admin: SupabaseClient,
  input: CreatorLogInput,
): Promise<void> {
  const row = {
    user_id: input.user_id,
    game_id: input.game_id || null,
    slug: input.slug || null,
    event: String(input.event || 'creator_event').slice(0, 64),
    phase: input.phase ? String(input.phase).slice(0, 64) : null,
    mechanic: input.mechanic ? String(input.mechanic).slice(0, 64) : null,
    build_path: input.build_path ? String(input.build_path).slice(0, 32) : null,
    ok: input.ok ?? null,
    errors: (input.errors || [])
      .slice(0, MAX_ERRORS)
      .map((e) => String(e).slice(0, MAX_ERROR_CHARS)),
    duration_ms:
      typeof input.duration_ms === 'number' && Number.isFinite(input.duration_ms)
        ? Math.round(input.duration_ms)
        : null,
    user_prompt: clip(input.user_prompt, MAX_PROMPT),
    body_js: clip(input.body_js, MAX_BODY),
    props: input.props && typeof input.props === 'object' ? input.props : {},
  }

  // Always visible in Supabase Edge Function logs.
  console.log(
    '[creator_run]',
    JSON.stringify({
      event: row.event,
      user_id: row.user_id,
      game_id: row.game_id,
      slug: row.slug,
      phase: row.phase,
      mechanic: row.mechanic,
      build_path: row.build_path,
      ok: row.ok,
      errors: row.errors,
      duration_ms: row.duration_ms,
      body_len: input.body_js?.length ?? 0,
      props: row.props,
    }),
  )

  try {
    const { error } = await admin.from('creator_run_logs').insert(row)
    if (error) {
      console.error('[creator_run] insert failed:', error.message)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[creator_run] insert threw:', msg)
  }
}

export function lastUserPrompt(messages: Array<{ role?: string; content?: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user' && typeof messages[i].content === 'string') {
      return messages[i].content as string
    }
  }
  return null
}

/** Mirror of src/lib/creatorMetrics.classifyGateErrors for Edge props (keep labels aligned). */
export function classifyCreatorErrors(errors: string[]): string[] {
  if (!errors.length) return ['ok']
  const found = new Set<string>()
  for (const raw of errors) {
    const e = raw.toLowerCase()
    if (
      e.includes('no layoutrects') ||
      e.includes('missing harvest') ||
      e.includes('no harvest') ||
      (e.includes('harvest:') && e.includes('no '))
    ) {
      found.add('no_harvest')
    } else if (e.includes('playability')) found.add('playability_crash')
    else if (e.includes('scoring loop') || e.includes('bump()/setscore')) found.add('no_scoring')
    else if (e.includes('overlap')) found.add('overlap')
    else if (e.includes('cta') && (e.includes('lower third') || e.includes('band') || e.includes('off')))
      found.add('cta_off_band')
    else if (
      e.includes('idle draw') ||
      e.includes('before start') ||
      (e.includes('smoke') && e.includes('threw'))
    )
      found.add('idle_crash')
    else if (e.includes('pointer') || e.includes('hit target') || e.includes('unresponsive'))
      found.add('unresponsive_hit')
    else if (e.includes('layout fidelity') || e.includes('drifts') || e.includes('playfield'))
      found.add('playfield_mismatch')
    else found.add('other')
  }
  if (found.size > 1) found.delete('other')
  return [...found]
}
