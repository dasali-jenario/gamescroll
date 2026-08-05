/** Publish + moderate actions for UGC drafts. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { parseLayoutPlan } from './layoutPlan.ts'
import { checkGame } from './qualityGate.ts'

export async function handlePublish(opts: {
  admin: SupabaseClient
  userId: string
  body: Record<string, unknown>
  jsonResponse: (body: unknown, status?: number) => Response
}): Promise<Response> {
  const { admin, userId, body, jsonResponse } = opts
  const user = { id: userId }
    const gameId = body.gameId as string
    if (!gameId) return jsonResponse({ error: 'gameId required' }, 400)

    // Re-run the quality gate so stale drafts that predate stronger checks
    // cannot enter the moderation queue failing. Legacy drafts without a
    // stored bodyJs are grandfathered (nothing to check against).
    const { data: draft, error: loadErr } = await admin
      .from('ugc_games')
      .select('id, title, tip, accent, brief')
      .eq('id', gameId)
      .eq('creator_id', user.id)
      .maybeSingle()
    if (loadErr) return jsonResponse({ error: loadErr.message }, 500)
    if (!draft) return jsonResponse({ error: 'Draft not found' }, 404)
    const brief = (draft.brief || {}) as Record<string, unknown>
    const bodyJs = typeof brief.bodyJs === 'string' ? brief.bodyJs : ''
    if (bodyJs.trim()) {
      const gate = checkGame(
        {
          title: draft.title,
          tip: draft.tip,
          accent: draft.accent,
          bg: typeof brief.bg === 'string' ? brief.bg : draft.accent || '#264653',
          bodyJs,
          layoutPlan: parseLayoutPlan(brief.layoutPlan),
          mechanic: typeof brief.mechanic === 'string' ? brief.mechanic : undefined,
        },
        { requireHarvest: false },
      )
      if (!gate.ok) {
        return jsonResponse(
          {
            error:
              'This draft no longer passes the quality gate — edit it in the creator, then publish again. ' +
              `First issue: ${gate.errors[0] || 'unknown'}`,
            validationErrors: gate.errors,
          },
          422,
        )
      }
    }

    const { data, error } = await admin
      .from('ugc_games')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        rejection_note: null,
      })
      .eq('id', gameId)
      .eq('creator_id', user.id)
      .in('status', ['draft', 'rejected', 'published'])
      .select('*')
      .single()
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ game: data })
}

export async function handleModerate(opts: {
  admin: SupabaseClient
  userId: string
  body: Record<string, unknown>
  jsonResponse: (body: unknown, status?: number) => Response
}): Promise<Response> {
  const { admin, userId, body, jsonResponse } = opts
  const user = { id: userId }
    const { data: mod } = await admin
      .from('moderators')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!mod) return jsonResponse({ error: 'Forbidden' }, 403)
  
    const gameId = body.gameId as string
    const status = body.status as 'approved' | 'rejected'
    const note = (body.note as string | undefined) || null
    if (!gameId || (status !== 'approved' && status !== 'rejected')) {
      return jsonResponse({ error: 'Invalid moderate payload' }, 400)
    }
  
    const patch =
      status === 'approved'
        ? {
            status: 'approved' as const,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            rejection_note: null,
          }
        : {
            status: 'rejected' as const,
            approved_at: null,
            approved_by: null,
            rejection_note: note,
          }
  
    const { data, error } = await admin
      .from('ugc_games')
      .update(patch)
      .eq('id', gameId)
      .select('*')
      .single()
    if (error) return jsonResponse({ error: error.message }, 500)
    return jsonResponse({ game: data })
}
