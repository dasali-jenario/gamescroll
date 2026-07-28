/** Publish + moderate actions for UGC drafts. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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
