/** Persist creator Edge diagnostics to public.creator_run_logs (+ console). */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const MAX_BODY = 14_000
const MAX_PROMPT = 2_000
const MAX_ERRORS = 24

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
    errors: (input.errors || []).slice(0, MAX_ERRORS).map((e) => String(e).slice(0, 500)),
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
