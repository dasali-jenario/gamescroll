/** Creator chat action: interview → generate/iterate → quality → draft upload. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { canonExampleFor } from './canonExamples.ts'
import { applyBodyPatches } from './patchBody.ts'
import { parseLayoutPlan, type LayoutRect } from './layoutPlan.ts'
import {
  inferMechanicFromMessages,
  mechanicSeedMessage,
  type MechanicFamily,
} from './mechanics.ts'
import { wrapGameHtml } from './wrap.ts'
import { validateWrappedHtml } from './validate.ts'
import {
  buildIterateContext,
  briefBg,
  briefBodyJs,
  callOpenAi,
  extractBodyFromHtml,
  slugify,
  trimConversation,
  type ChatMessage,
  type ExistingDraft,
  type LlmGamePayload,
} from './creatorLlm.ts'
import { ensureGameQuality } from './qualityGate.ts'

export async function handleChatTurn(opts: {
  admin: SupabaseClient
  userId: string
  body: Record<string, unknown>
  libBase: string
  supabaseUrl: string
  jsonResponse: (body: unknown, status?: number) => Response
}): Promise<Response> {
  const { admin, userId: user_id, body, libBase, supabaseUrl, jsonResponse } = opts
  const user = { id: user_id }
    const startedAt = Date.now()
    const messages = (body.messages || []) as ChatMessage[]
    const gameId = body.gameId as string | undefined
    const userMessages = messages.filter((m) => m.role !== 'system')
  
    // Soft rate limit: 30 chats / day
    const dayAgo = new Date(Date.now() - 864e5).toISOString()
    const { count } = await admin
      .from('ugc_games')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .gte('updated_at', dayAgo)
    if ((count ?? 0) > 40) {
      return jsonResponse({ error: 'Daily creator limit reached. Try again tomorrow.' }, 429)
    }
  
    let existing: ExistingDraft | null = null
    let existingBodyJs: string | null = null
    let existingBg = '#264653'
    let existingLayoutPlan: LayoutRect[] = []
    let existingMechanic: string | undefined
    if (gameId) {
      const { data: row, error: loadErr } = await admin
        .from('ugc_games')
        .select('id, slug, title, tip, accent, html_path, brief')
        .eq('id', gameId)
        .eq('creator_id', user.id)
        .maybeSingle()
      if (loadErr) return jsonResponse({ error: loadErr.message }, 500)
      if (row) {
        existing = row as ExistingDraft
        existingBodyJs = briefBodyJs(existing.brief)
        existingBg = briefBg(existing.brief) || existing.accent || existingBg
        existingLayoutPlan = parseLayoutPlan(existing.brief?.layoutPlan)
        existingMechanic =
          typeof existing.brief?.mechanic === 'string'
            ? existing.brief.mechanic
            : undefined
        if (!existingBodyJs && existing.html_path) {
          const { data: file, error: dlErr } = await admin.storage
            .from('ugc-games')
            .download(existing.html_path)
          if (!dlErr && file) {
            const html = await file.text()
            existingBodyJs = extractBodyFromHtml(html)
          }
        }
      }
    }
  
    const llmMessages: ChatMessage[] = trimConversation(userMessages)
    const mechanic = existingBodyJs
      ? ((existingMechanic as MechanicFamily) ||
        inferMechanicFromMessages(userMessages))
      : inferMechanicFromMessages(userMessages)
  
    if (!existingBodyJs) {
      // Seed first builds with a mechanic family template + one matching canon example.
      const seed: ChatMessage = {
        role: 'user',
        content: [
          mechanicSeedMessage(mechanic),
          '',
          'Copy this canon structure — same HTML5/JS + PF style as official Gamescroll games (adapt visuals/mechanics, keep quality):',
          canonExampleFor(mechanic),
        ].join('\n'),
      }
      const lastUserIdx = (() => {
        for (let i = llmMessages.length - 1; i >= 0; i--) {
          if (llmMessages[i].role === 'user') return i
        }
        return -1
      })()
      if (lastUserIdx >= 0) llmMessages.splice(lastUserIdx, 0, seed)
      else llmMessages.push(seed)
    }
  
    if (existing && existingBodyJs) {
      // Insert before the latest user turn so the model sees code + the tweak request.
      const lastUserIdx = (() => {
        for (let i = llmMessages.length - 1; i >= 0; i--) {
          if (llmMessages[i].role === 'user') return i
        }
        return -1
      })()
      const ctx = buildIterateContext({
        title: existing.title,
        tip: existing.tip,
        accent: existing.accent,
        bg: existingBg,
        bodyJs: existingBodyJs,
        layoutPlan: existingLayoutPlan,
        mechanic: existingMechanic || mechanic,
      })
      if (lastUserIdx >= 0) llmMessages.splice(lastUserIdx, 0, ctx)
      else llmMessages.push(ctx)
    }
  
    const turn = await callOpenAi(llmMessages, {
      temperature: existingBodyJs ? 0.35 : 0.7,
      modelKind: existingBodyJs ? 'iterate' : 'generate',
    })
  
    if (turn.game && (turn.phase === 'generated' || turn.phase === 'iterated')) {
      let game = turn.game
      // Prefer preserving identity/meta on iterate unless the model returned new values.
      if (existing && existingBodyJs) {
        game = {
          ...game,
          title: (game.title || existing.title).slice(0, 64),
          tip: (game.tip || existing.tip).slice(0, 120),
          accent: game.accent || existing.accent,
          bg: game.bg || existingBg,
          layoutPlan:
            game.layoutPlan.length > 0 ? game.layoutPlan : existingLayoutPlan,
          mechanic: game.mechanic || existingMechanic || mechanic,
        }
      } else if (!game.mechanic) {
        game = { ...game, mechanic }
      }
  
      let editMode: 'full' | 'patch' = 'full'
      const patches = game.patches || []
      if (patches.length && !game.bodyJs.trim()) {
        const patched = existingBodyJs
          ? applyBodyPatches(existingBodyJs, patches)
          : { ok: false as const, errors: ['no stored game body to patch'] }
        if (patched.ok) {
          game = { ...game, bodyJs: patched.body }
          editMode = 'patch'
        } else {
          // Ambiguous or stale patch: ask once for the whole body instead.
          const retry = await callOpenAi(
            [
              ...llmMessages,
              {
                role: 'user',
                content: `Those patches could not be applied: ${patched.errors.join('; ')}. Return the complete corrected game.bodyJs for this game (no patches).`,
              },
            ],
            { temperature: 0.2, modelKind: 'iterate' },
          )
          if (retry.game?.bodyJs.trim()) {
            game = {
              ...game,
              bodyJs: retry.game.bodyJs,
              layoutPlan: retry.game.layoutPlan.length
                ? retry.game.layoutPlan
                : game.layoutPlan,
            }
          } else {
            return jsonResponse({
              reply:
                'I could not apply that edit cleanly. Try describing the change again.',
              phase: 'interview',
              game: null,
              validationErrors: patched.errors,
            })
          }
        }
      }
  
      if (!game.bodyJs.trim()) {
        return jsonResponse({
          reply: 'The generated game came back empty. Try describing it again.',
          phase: 'interview',
          game: null,
          validationErrors: ['model returned no bodyJs'],
        })
      }
  
      const quality = await ensureGameQuality(game, llmMessages, {
        startedAt,
        skipCritique: editMode === 'patch',
      })
      if (!quality.ok) {
        return jsonResponse({
          reply:
            turn.reply ||
            'I hit a snag generating safe playable game code. Try tweaking your description.',
          phase: 'interview',
          game: null,
          validationErrors: quality.errors,
        })
      }
      game = quality.game
  
      const html = wrapGameHtml({
        title: game.title,
        bg: game.bg || game.accent || '#264653',
        accent: game.accent || '#e9c46a',
        body: game.bodyJs,
        libBase,
      })
      const htmlCheck = validateWrappedHtml(html)
      if (!htmlCheck.ok) {
        return jsonResponse({
          reply: 'Generated HTML failed safety checks. Please try again.',
          phase: 'interview',
          game: null,
          validationErrors: htmlCheck.errors,
        })
      }
  
      // Keep stable slug/path when updating an existing draft so iterates overwrite in place.
      const slug = existing?.slug || slugify(game.title)
      const path = existing?.html_path || `${user.id}/${slug}.html`
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
  
      const { data: publicUrl } = admin.storage.from('ugc-games').getPublicUrl(path)
      const playUrl = `${supabaseUrl}/functions/v1/ugc-play?slug=${encodeURIComponent(slug)}`
      const row = {
        creator_id: user.id,
        slug,
        title: game.title.slice(0, 64),
        tip: (game.tip || 'Tap to play').slice(0, 120),
        accent: game.accent || '#264653',
        status: 'draft' as const,
        html_path: path,
        html_url: playUrl || publicUrl.publicUrl,
        brief: {
          bg: game.bg,
          lastReply: turn.reply,
          bodyJs: game.bodyJs,
          layoutPlan: game.layoutPlan,
          mechanic: game.mechanic || mechanic,
          editMode,
          critiqueIssues: quality.critiqueIssues.slice(0, 12),
        },
        conversation: userMessages.concat({
          role: 'assistant' as const,
          content: turn.reply,
        }),
      }
  
      let saved
      if (existing) {
        const { data, error } = await admin
          .from('ugc_games')
          .update({
            title: row.title,
            tip: row.tip,
            accent: row.accent,
            html_path: row.html_path,
            html_url: row.html_url,
            brief: row.brief,
            conversation: row.conversation,
            status: 'draft',
            rejection_note: null,
          })
          .eq('id', existing.id)
          .eq('creator_id', user.id)
          .select('*')
          .single()
        if (error) return jsonResponse({ error: error.message }, 500)
        saved = data
      } else {
        const { data, error } = await admin
          .from('ugc_games')
          .insert(row)
          .select('*')
          .single()
        if (error) return jsonResponse({ error: error.message }, 500)
        saved = data
      }
  
      return jsonResponse({
        reply: turn.reply || `Built "${game.title}". Preview it, then publish when ready.`,
        phase: existingBodyJs ? 'iterated' : turn.phase,
        game: saved,
        previewHtml: html,
      })
    }
  
    return jsonResponse({
      reply: turn.reply || 'Tell me more about the game you want.',
      phase: 'interview',
      game: null,
    })
}
