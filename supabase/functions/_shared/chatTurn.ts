/** Creator chat action: interview → generate/iterate → quality → draft upload. */
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { applyBodyPatches } from './patchBody.ts'
import { parseLayoutPlan, type LayoutRect } from './layoutPlan.ts'
import {
  inferMechanicFromMessages,
  type MechanicFamily,
} from './mechanics.ts'
import {
  firstBuildSeedMessage,
  hasArcadeScaffold,
  materializeScaffold,
  missingSlotsBinding,
  parseScaffoldSlots,
} from './mechanicScaffolds.ts'
import {
  ensureFreeformChrome,
  resolveFreeformLayoutPlan,
} from './genericChrome.ts'
import {
  resolveBuildPath,
  withPathHonesty,
} from './creatorPaths.ts'
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
import { lastUserPrompt, logCreatorRun, classifyCreatorErrors } from './creatorLog.ts'

function applyScaffoldToGame(
  game: LlmGamePayload,
  mechanic: MechanicFamily,
): LlmGamePayload {
  const family = (game.mechanic as MechanicFamily) || mechanic
  if (!hasArcadeScaffold(family)) {
    throw new Error(`applyScaffoldToGame called for non-arcade family "${family}"`)
  }
  const slots = parseScaffoldSlots(game.slots)
  const built = materializeScaffold(family, slots)
  return {
    ...game,
    mechanic: built.family,
    layoutPlan: built.layoutPlan,
    bodyJs: built.bodyJs,
  }
}

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
    const userPrompt = lastUserPrompt(userMessages)

    await logCreatorRun(admin, {
      user_id: user.id,
      event: 'creator_chat_start',
      game_id: gameId || null,
      slug: existing?.slug || null,
      mechanic,
      user_prompt: userPrompt,
      props: {
        has_existing_body: Boolean(existingBodyJs),
        message_count: userMessages.length,
      },
    })
  
    if (!existingBodyJs) {
      // Arcade → scaffold seed; custom → freeform bodyJs seed.
      const seed: ChatMessage = {
        role: 'user',
        content: firstBuildSeedMessage(mechanic),
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
            await logCreatorRun(admin, {
              user_id: user.id,
              event: 'creator_patch_fail',
              game_id: existing?.id || gameId || null,
              slug: existing?.slug || null,
              phase: 'interview',
              mechanic,
              ok: false,
              errors: patched.errors,
              duration_ms: Date.now() - startedAt,
              user_prompt: userPrompt,
              body_js: existingBodyJs,
            })
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
  
      const family = (game.mechanic as MechanicFamily) || mechanic
      const useArcadeScaffold = !existingBodyJs && hasArcadeScaffold(family)

      if (useArcadeScaffold) {
        // Arcade first builds: locked scaffold body; LLM fills slots only.
        game = applyScaffoldToGame(game, family)
        editMode = 'full'
      } else if (!existingBodyJs) {
        // Custom freeform: lock genre-agnostic chrome plan + layoutFromPlan harvest.
        const plan = resolveFreeformLayoutPlan(
          game.layoutPlan.length ? game.layoutPlan : undefined,
        )
        game = {
          ...game,
          mechanic: 'custom',
          layoutPlan: plan,
          bodyJs: ensureFreeformChrome(game.bodyJs, plan),
        }
        editMode = 'full'
      }

      if (!game.bodyJs.trim()) {
        await logCreatorRun(admin, {
          user_id: user.id,
          event: 'creator_empty_body',
          game_id: existing?.id || gameId || null,
          slug: existing?.slug || null,
          phase: turn.phase,
          mechanic: game.mechanic || mechanic,
          ok: false,
          errors: ['model returned no bodyJs'],
          duration_ms: Date.now() - startedAt,
          user_prompt: userPrompt,
        })
        return jsonResponse({
          reply: 'The generated game came back empty. Try describing it again.',
          phase: 'interview',
          game: null,
          validationErrors: ['model returned no bodyJs'],
        })
      }

      let quality = await ensureGameQuality(game, llmMessages, {
        startedAt,
        skipCritique: editMode === 'patch' || useArcadeScaffold,
        requireHarvest: true,
        lockBody: useArcadeScaffold,
      })
      if (!quality.ok && useArcadeScaffold) {
        // Rematerialize once if anything still failed (should be rare).
        game = applyScaffoldToGame(game, family)
        quality = await ensureGameQuality(game, llmMessages, {
          startedAt,
          skipCritique: true,
          requireHarvest: true,
          lockBody: true,
        })
      }
      if (
        quality.ok &&
        useArcadeScaffold &&
        missingSlotsBinding(quality.game.bodyJs)
      ) {
        game = applyScaffoldToGame(quality.game, family)
        quality = { ok: true, game, critiqueIssues: quality.critiqueIssues, repairAttempted: quality.repairAttempted }
      }
      if (!quality.ok) {
        const failPath = useArcadeScaffold
          ? 'arcade'
          : resolveBuildPath(family)
        await logCreatorRun(admin, {
          user_id: user.id,
          event: 'creator_quality_fail',
          game_id: existing?.id || gameId || null,
          slug: existing?.slug || null,
          phase: turn.phase,
          mechanic: game.mechanic || mechanic,
          build_path: failPath,
          ok: false,
          errors: quality.errors,
          duration_ms: Date.now() - startedAt,
          user_prompt: userPrompt,
          body_js: quality.game?.bodyJs || game.bodyJs,
          props: {
            edit_mode: editMode,
            use_arcade_scaffold: useArcadeScaffold,
            title: game.title,
            failure_classes: classifyCreatorErrors(quality.errors),
            repair_attempted: quality.repairAttempted,
            body_len: (quality.game?.bodyJs || game.bodyJs || '').length,
          },
        })
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

      const buildPath = useArcadeScaffold ? 'arcade' : resolveBuildPath(family)
      const defaultBuilt = `Built "${game.title}". Preview it, then publish when ready.`
      // First builds: state arcade vs custom clearly (never silent genre swap).
      const publicReply = !existingBodyJs
        ? withPathHonesty(
            turn.reply || defaultBuilt,
            buildPath,
            useArcadeScaffold ? family : game.mechanic || 'custom',
          )
        : turn.reply || defaultBuilt
  
      const html = wrapGameHtml({
        title: game.title,
        bg: game.bg || game.accent || '#264653',
        accent: game.accent || '#e9c46a',
        body: game.bodyJs,
        libBase,
      })
      const htmlCheck = validateWrappedHtml(html)
      if (!htmlCheck.ok) {
        await logCreatorRun(admin, {
          user_id: user.id,
          event: 'creator_html_fail',
          game_id: existing?.id || gameId || null,
          slug: existing?.slug || null,
          phase: turn.phase,
          mechanic: game.mechanic || mechanic,
          build_path: buildPath,
          ok: false,
          errors: htmlCheck.errors,
          duration_ms: Date.now() - startedAt,
          user_prompt: userPrompt,
          body_js: game.bodyJs,
        })
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
        await logCreatorRun(admin, {
          user_id: user.id,
          event: 'creator_upload_fail',
          game_id: existing?.id || gameId || null,
          slug,
          phase: turn.phase,
          mechanic: game.mechanic || mechanic,
          build_path: buildPath,
          ok: false,
          errors: [uploadError.message],
          duration_ms: Date.now() - startedAt,
          user_prompt: userPrompt,
        })
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
          lastReply: publicReply,
          bodyJs: game.bodyJs,
          layoutPlan: game.layoutPlan,
          mechanic: game.mechanic || mechanic,
          buildPath,
          editMode,
          critiqueIssues: quality.critiqueIssues.slice(0, 12),
        },
        conversation: userMessages.concat({
          role: 'assistant' as const,
          content: publicReply,
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
        if (error) {
          await logCreatorRun(admin, {
            user_id: user.id,
            event: 'creator_db_fail',
            game_id: existing.id,
            slug,
            mechanic: game.mechanic || mechanic,
            build_path: buildPath,
            ok: false,
            errors: [error.message],
            duration_ms: Date.now() - startedAt,
            user_prompt: userPrompt,
          })
          return jsonResponse({ error: error.message }, 500)
        }
        saved = data
      } else {
        const { data, error } = await admin
          .from('ugc_games')
          .insert(row)
          .select('*')
          .single()
        if (error) {
          await logCreatorRun(admin, {
            user_id: user.id,
            event: 'creator_db_fail',
            slug,
            mechanic: game.mechanic || mechanic,
            build_path: buildPath,
            ok: false,
            errors: [error.message],
            duration_ms: Date.now() - startedAt,
            user_prompt: userPrompt,
          })
          return jsonResponse({ error: error.message }, 500)
        }
        saved = data
      }

      await logCreatorRun(admin, {
        user_id: user.id,
        event: 'creator_draft_saved',
        game_id: saved?.id || null,
        slug,
        phase: existingBodyJs ? 'iterated' : turn.phase,
        mechanic: game.mechanic || mechanic,
        build_path: buildPath,
        ok: true,
        errors: [],
        duration_ms: Date.now() - startedAt,
        user_prompt: userPrompt,
        body_js: game.bodyJs,
        props: {
          edit_mode: editMode,
          use_arcade_scaffold: useArcadeScaffold,
          critique_issues: quality.critiqueIssues.slice(0, 8),
          title: game.title,
          repair_attempted: quality.repairAttempted,
        },
      })
  
      return jsonResponse({
        reply: publicReply,
        phase: existingBodyJs ? 'iterated' : turn.phase,
        game: saved,
        previewHtml: html,
      })
    }
  
    await logCreatorRun(admin, {
      user_id: user.id,
      event: 'creator_interview',
      game_id: existing?.id || gameId || null,
      slug: existing?.slug || null,
      phase: 'interview',
      mechanic,
      ok: true,
      duration_ms: Date.now() - startedAt,
      user_prompt: userPrompt,
      props: { llm_phase: turn.phase },
    })

    return jsonResponse({
      reply: turn.reply || 'Tell me more about the game you want.',
      phase: 'interview',
      game: null,
    })
}
