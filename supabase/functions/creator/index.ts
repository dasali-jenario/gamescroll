import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { wrapGameHtml } from '../_shared/wrap.ts'
import { validateGameBody, validateWrappedHtml } from '../_shared/validate.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

type LlmGamePayload = {
  title: string
  tip: string
  accent: string
  bg: string
  bodyJs: string
}

type LlmTurn = {
  reply: string
  phase: 'interview' | 'generated' | 'iterated'
  game: LlmGamePayload | null
}

const SYSTEM_PROMPT = `You are Gamescroll's game creator assistant. You help people invent tiny single-player HTML5 canvas minigames for a TikTok-style feed.

Hard product limits (never violate):
- No multiplayer, no networking, no backends
- No saved game state (no localStorage/sessionStorage/indexedDB/cookies)
- Touch-first: tap, hold, drag, or swipe only
- Games MUST be fully playable: every visible control must respond to pointer input
- Portrait-first mobile: design for tall phones in a TikTok-style full-bleed frame (typically W < H). Landscape is secondary — still call layout() from onResize, but primary composition is portrait.

PORTRAIT / MOBILE LAYOUT (required):
- Assume safe playfield inset: top ~12% of H (host score HUD lives near the top), bottom ~10% of H (thumbs / home indicator), sides ~5% of W.
- Primary action buttons: lower third (about y = H*0.68 to H*0.82), centered, width ~70% of W (min 200, max 320), height >= 56px (prefer 64–72 on large phones).
- Main focal content (lights, player, targets): center band y ≈ H*0.28 to H*0.58 — not tiny at the top.
- Use relative layout from W/H in a layout() function; call layout() from onHostStart, onResize, and reset. Never hard-code 1920x1080 or desktop positions.
- Fonts: scale with Math.min(W,H), e.g. title ~0.07*W, body ~0.045*W. Keep text short.
- Hit targets >= 48px. Prefer full-width tap zones when the prompt is "tap anywhere".
- One-thumb play: avoid requiring simultaneous multi-touch or top-corner precision taps.
- Vertical motion/scroll should stay inside the canvas (feed swipe is separate). Don't place critical UI in the extreme top 80px.

Interview: ask at most 4 short follow-ups (mechanic, controls, fail condition, visual vibe). Then generate.

When generating or iterating, respond with ONLY valid JSON (no markdown fences):
{
  "reply": "short message to the user",
  "phase": "interview" | "generated" | "iterated",
  "game": null | {
    "title": "short title",
    "tip": "one-line how to play",
    "accent": "#rrggbb",
    "bg": "#rrggbb",
    "bodyJs": "javascript game body"
  }
}

During interview, phase="interview" and game=null.
When ready to build (or after a tweak request), phase="generated" or "iterated" and game must be set.

CRITICAL host runtime (bodyJs runs inside a shell that already provides canvas, ctx, W, H, score, setScore, bump, die wrapper, GS, Juice):
1. The host posts gamescroll:start after ready. Until then GS.paused === true.
2. Implement onHostStart() to reset into a playable idle state. Do NOT wait for a fake HTML Start button that never receives host start.
3. tick(dt) must early-return when GS.paused; draw() always paints the current UI.
4. NEVER create HTML <button>, <input>, or other DOM controls. Draw all UI on canvas #c.
5. ALWAYS register canvas or window pointer handlers, e.g. canvas.addEventListener('pointerdown', handler).
6. Map taps with getBoundingClientRect: const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(W/r.width); const y=(e.clientY-r.top)*(H/r.height)
7. Hit-test drawn buttons with simple rects (x,y,w,h). Labels like "START" are canvas text only.
8. Timers / light sequences must advance in tick(dt) while !GS.paused — never rely only on setTimeout for core gameplay (setTimeout is ok as a helper, but state machine in tick is required).
9. On fail call die() (host may auto-replay). On success use bump() or setScore() with reaction time in ms as the score when relevant.
10. Keep body under ~80KB. No fetch, WebSocket, localStorage, eval, Worker, import().

Working pattern for a race-start reaction timer (adapt visuals, keep the state machine):
let phase='idle' // idle | waiting | go | result | foul
let waitLeft=0, reactAt=0, lastMs=0
const btn={x:0,y:0,w:0,h:0}
function layout(){
  btn.w=Math.min(300, Math.max(200, W*0.72))
  btn.h=Math.max(56, Math.min(72, H*0.08))
  btn.x=(W-btn.w)/2
  btn.y=H*0.74
}

function reset(){ phase='idle'; waitLeft=0; reactAt=0; setScore(0); layout() }
function die(){ phase='foul'; waitLeft=0.9 }
function hitBtn(x,y){ return x>=btn.x&&x<=btn.x+btn.w&&y>=btn.y&&y<=btn.y+btn.h }
function onHostStart(){ reset() }
function onResize(){ layout() }
canvas.addEventListener('pointerdown', (e)=>{
  if(GS.paused) return
  const r=canvas.getBoundingClientRect()
  const x=(e.clientX-r.left)*(W/r.width), y=(e.clientY-r.top)*(H/r.height)
  if(phase==='idle' && hitBtn(x,y)){
    phase='waiting'; waitLeft=1.2+Math.random()*2.2; return
  }
  if(phase==='waiting'){ die(); return }
  if(phase==='go'){
    lastMs=Math.max(1, Math.round((performance.now()-reactAt)))
    setScore(lastMs); phase='result'; waitLeft=1.6; return
  }
  if(phase==='result' || phase==='foul'){ if(hitBtn(x,y)) reset() }
})
function tick(dt){
  if(GS.paused) return
  if(phase==='waiting'){
    waitLeft-=dt
    if(waitLeft<=0){ phase='go'; reactAt=performance.now() }
  } else if(phase==='result' || phase==='foul'){
    waitLeft-=dt
    if(waitLeft<=0) reset()
  }
}
function draw(){
  ctx.fillStyle='#1b1f3b'; ctx.fillRect(0,0,W,H)
  // draw lights + button label from phase (red/orange/green)
  // ... comic race lights ...
  ctx.fillStyle='#fff'; ctx.font='700 22px sans-serif'; ctx.textAlign='center'
  const label=phase==='idle'?'START':phase==='waiting'?'WAIT':phase==='go'?'TAP!':phase==='foul'?'TOO EARLY':'AGAIN'
  ctx.fillText(label, W/2, btn.y+36)
}

You MUST define tick, draw, die, and register pointerdown. Prefer onHostStart to call reset().
`


function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'game'
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${base}-${suffix}`
}

function extractJson(text: string): LlmTurn {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed) as LlmTurn
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as LlmTurn
    }
    throw new Error('Model did not return JSON')
  }
}

async function callOpenAi(messages: ChatMessage[]): Promise<LlmTurn> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY is not set on the Edge Function')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-4.1',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 429 || errText.includes('insufficient_quota')) {
      throw new Error(
        'OpenAI quota exceeded. Add billing/credits at platform.openai.com, then retry.',
      )
    }
    if (res.status === 401) {
      throw new Error('OpenAI API key is invalid. Update OPENAI_API_KEY and re-run setup.')
    }
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 400)}`)
  }

  const payload = await res.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Empty model response')
  }
  return extractJson(content)
}

async function repairBody(
  bodyJs: string,
  errors: string[],
  prior: ChatMessage[],
): Promise<LlmGamePayload> {
  const turn = await callOpenAi([
    ...prior,
    {
      role: 'user',
      content: `The previous bodyJs failed validation: ${errors.join('; ')}. Return JSON with phase "generated", a fixed game.bodyJs, and keep title/tip/accent/bg.`,
    },
  ])
  if (!turn.game) throw new Error('Repair pass did not return a game')
  return turn.game
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const libBase =
      Deno.env.get('PUBLIC_SITE_URL') || 'https://play.thehappylab.com'

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const body = await req.json()
    const action = body.action as string

    if (action === 'chat') {
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

      let turn = await callOpenAi(userMessages)

      if (turn.game && (turn.phase === 'generated' || turn.phase === 'iterated')) {
        let game = turn.game
        let bodyCheck = validateGameBody(game.bodyJs)
        if (!bodyCheck.ok) {
          game = await repairBody(game.bodyJs, bodyCheck.errors, userMessages)
          bodyCheck = validateGameBody(game.bodyJs)
          if (!bodyCheck.ok) {
            return jsonResponse({
              reply:
                turn.reply ||
                'I hit a snag generating safe game code. Try tweaking your description.',
              phase: 'interview',
              game: null,
              validationErrors: bodyCheck.errors,
            })
          }
        }

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

        const slug = slugify(game.title)
        const path = `${user.id}/${slug}.html`
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
          brief: { bg: game.bg, lastReply: turn.reply },
          conversation: userMessages.concat({
            role: 'assistant' as const,
            content: turn.reply,
          }),
        }

        let saved
        if (gameId) {
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
            .eq('id', gameId)
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
          phase: turn.phase,
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

    if (action === 'publish') {
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

    if (action === 'moderate') {
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

    return jsonResponse({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return jsonResponse({ error: message }, 500)
  }
})
