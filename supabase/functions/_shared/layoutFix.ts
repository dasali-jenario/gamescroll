/** Deterministic layout Fix chips for creator drafts. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { parseLayoutPlan } from './layoutPlan.ts'
import {
  applyLayoutFix,
  type LayoutFixKind,
} from './layoutMutations.ts'
import { replaceLayoutPlanInBody } from './mechanicScaffolds.ts'
import { wrapGameHtml } from './wrap.ts'
import { validateWrappedHtml } from './validate.ts'
import { briefBodyJs, briefBg } from './creatorLlm.ts'
import { checkGame } from './qualityGate.ts'

const FIX_KINDS = new Set<LayoutFixKind>([
  'fix_overlap',
  'enlarge_cta',
  'move_cta_down',
])

export async function handleLayoutFix(opts: {
  admin: SupabaseClient
  userId: string
  body: Record<string, unknown>
  libBase: string
  jsonResponse: (body: unknown, status?: number) => Response
}): Promise<Response> {
  const { admin, userId, body, libBase, jsonResponse } = opts
  const gameId = body.gameId as string | undefined
  const fix = body.fix as string | undefined
  if (!gameId) return jsonResponse({ error: 'gameId required' }, 400)
  if (!fix || !FIX_KINDS.has(fix as LayoutFixKind)) {
    return jsonResponse({
      error: `fix must be one of: ${[...FIX_KINDS].join(', ')}`,
    }, 400)
  }

  const { data: row, error: loadErr } = await admin
    .from('ugc_games')
    .select('id, slug, title, tip, accent, html_path, brief, conversation, status')
    .eq('id', gameId)
    .eq('creator_id', userId)
    .maybeSingle()
  if (loadErr) return jsonResponse({ error: loadErr.message }, 500)
  if (!row) return jsonResponse({ error: 'Draft not found' }, 404)

  const brief = (row.brief || {}) as Record<string, unknown>
  const bodyJs = briefBodyJs(brief)
  const plan = parseLayoutPlan(brief.layoutPlan)
  if (!bodyJs) {
    return jsonResponse({ error: 'Draft has no bodyJs to fix' }, 400)
  }
  if (!plan.length) {
    return jsonResponse({ error: 'Draft has no layoutPlan to fix' }, 400)
  }

  const mutated = applyLayoutFix(plan, fix as LayoutFixKind)
  if (!mutated.ok) {
    return jsonResponse({
      reply: mutated.errors.join(' · '),
      phase: 'iterated',
      game: null,
      validationErrors: mutated.errors,
    })
  }

  const nextBody = replaceLayoutPlanInBody(bodyJs, mutated.plan)
  const bg = briefBg(brief) || row.accent || '#264653'
  const gamePayload = {
    title: row.title,
    tip: row.tip,
    accent: row.accent,
    bg,
    bodyJs: nextBody,
    layoutPlan: mutated.plan,
    mechanic: typeof brief.mechanic === 'string' ? brief.mechanic : undefined,
  }
  const check = checkGame(gamePayload, { requireHarvest: true })
  if (!check.ok) {
    return jsonResponse({
      reply: `Layout fix failed checks: ${check.errors.join(' · ')}`,
      phase: 'iterated',
      game: null,
      validationErrors: check.errors,
    })
  }

  const html = wrapGameHtml({
    title: row.title,
    bg,
    accent: row.accent,
    body: nextBody,
    libBase,
  })
  const htmlCheck = validateWrappedHtml(html)
  if (!htmlCheck.ok) {
    return jsonResponse({ error: htmlCheck.errors.join('; ') }, 500)
  }

  const path = row.html_path as string
  const bytes = new TextEncoder().encode(html)
  const { error: uploadError } = await admin.storage
    .from('ugc-games')
    .upload(path, bytes, {
      contentType: 'text/html; charset=utf-8',
      upsert: true,
    })
  if (uploadError) {
    return jsonResponse({ error: `Upload failed: ${uploadError.message}` }, 500)
  }

  const conversation = Array.isArray(row.conversation) ? [...row.conversation] : []
  conversation.push({
    role: 'assistant',
    content: `${mutated.label}. Preview updated — no full rewrite.`,
  })

  const nextBrief = {
    ...brief,
    bodyJs: nextBody,
    layoutPlan: mutated.plan,
    editMode: 'patch',
    critiqueIssues: [`layout fix: ${fix}`],
  }

  const { data: saved, error: saveErr } = await admin
    .from('ugc_games')
    .update({
      brief: nextBrief,
      conversation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gameId)
    .eq('creator_id', userId)
    .select('*')
    .maybeSingle()
  if (saveErr) return jsonResponse({ error: saveErr.message }, 500)

  return jsonResponse({
    reply: `${mutated.label}.`,
    phase: 'iterated',
    game: saved,
    previewHtml: html,
    validationErrors: [],
  })
}
