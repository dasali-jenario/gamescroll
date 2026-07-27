import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  ANTI_PATTERNS,
  JUICE_RULES,
  OFFICIAL_STRUCTURE,
  canonExampleFor,
} from '../_shared/canonExamples.ts'
import {
  applyBodyPatches,
  parseBodyPatches,
  type BodyPatch,
} from '../_shared/patchBody.ts'
import {
  layoutPlanAscii,
  parseLayoutPlan,
  validateLayoutPlan,
  type LayoutRect,
} from '../_shared/layoutPlan.ts'
import {
  inferMechanicFromMessages,
  mechanicSeedMessage,
  type MechanicFamily,
} from '../_shared/mechanics.ts'
import { smokeGameBody } from '../_shared/smoke.ts'
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
  layoutPlan: LayoutRect[]
  mechanic?: MechanicFamily | string
  /** Small iterate edits: applied to the stored body instead of a full rewrite. */
  patches?: BodyPatch[]
}

type LlmTurn = {
  reply: string
  phase: 'interview' | 'generated' | 'iterated'
  game: LlmGamePayload | null
}

type ModelKind = 'generate' | 'iterate' | 'fast'

function resolveModel(kind: ModelKind): string {
  const strong = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1'
  const fast = Deno.env.get('OPENAI_MODEL_FAST') || strong
  return kind === 'generate' ? strong : fast
}

function normalizeGame(raw: Partial<LlmGamePayload> | null | undefined): LlmGamePayload | null {
  if (!raw) return null
  const bodyJs = typeof raw.bodyJs === 'string' ? raw.bodyJs : ''
  const patches = parseBodyPatches(raw.patches)
  if (!bodyJs.trim() && patches.length === 0) return null
  return {
    title: String(raw.title || 'Untitled').slice(0, 64),
    tip: String(raw.tip || 'Tap to play').slice(0, 120),
    accent: String(raw.accent || '#e9c46a'),
    bg: String(raw.bg || raw.accent || '#264653'),
    bodyJs,
    layoutPlan: parseLayoutPlan(raw.layoutPlan),
    mechanic: raw.mechanic,
    patches,
  }
}

const MAX_HISTORY_TURNS = 12
const MAX_HISTORY_CHARS = 6_000

/**
 * Keep the opening brief plus recent turns; the stored bodyJs carries the game state,
 * so long interview transcripts only dilute the edit request.
 */
function trimConversation(messages: ChatMessage[]): ChatMessage[] {
  const clipped = messages.map((m) => ({
    role: m.role,
    content: m.content.length > MAX_HISTORY_CHARS
      ? `${m.content.slice(0, MAX_HISTORY_CHARS)}…`
      : m.content,
  }))
  if (clipped.length <= MAX_HISTORY_TURNS) return clipped
  const firstUserIdx = clipped.findIndex((m) => m.role === 'user')
  const head = firstUserIdx >= 0 ? [clipped[firstUserIdx]] : []
  const tail = clipped.slice(-(MAX_HISTORY_TURNS - head.length))
  return [...head, ...tail]
}

const SYSTEM_PROMPT = `You are Gamescroll's game creator assistant. You invent tiny single-player HTML5 canvas minigames for a TikTok-style feed.

Quality bar: bodyJs must match the same structure, feel, and requirements as official catalog games authored in scripts/generate-games.mjs — plain HTML5 + JavaScript canvas bodies in the shared wrap shell (not React, not Phaser, not external engines).

Hard product limits (never violate):
- No multiplayer, no networking, no backends
- No saved game state (no localStorage/sessionStorage/indexedDB/cookies)
- Touch-first: tap, hold, drag, or swipe only
- Games MUST be fully playable: every visible control must respond to pointer input
- Portrait-first mobile: design for tall phones in a TikTok-style full-bleed frame (typically W < H). Landscape is secondary — still call layout() from onResize, but primary composition is portrait.
${OFFICIAL_STRUCTURE}
MECHANIC FAMILIES:
When a MECHANIC TEMPLATE seed is provided, follow that family. Also set game.mechanic to one of: reaction | timing | dodge | drag | stack | custom.

PORTRAIT / MOBILE LAYOUT (required):
- Assume safe playfield inset: top ~8% of H (in-game score HUD), bottom ~8% of H, sides ~4% of W. The host letterboxes the iframe away from app chrome (top bar, bottom like/share nav, swipe rail) — do not draw interactive hit targets into the extreme corners.
- Primary action buttons: lower third (about y = H*0.68 to H*0.82), centered, width ~70% of W (min 200, max 320), height >= 56px (prefer 64–72 on large phones).
- Main focal content (lights, player, targets): center band y ≈ H*0.28 to H*0.58 — not tiny at the top.
- Use relative layout from W/H in a layout() function; call layout() from onHostStart, onResize, and reset. Never hard-code 1920x1080 or desktop positions.
- Fonts: scale with Math.min(W,H), e.g. title ~0.07*W, body ~0.045*W. Keep text short.
- Hit targets >= 48px. Prefer full-width tap zones when the prompt is "tap anywhere".
- One-thumb play: avoid requiring simultaneous multi-touch or top-corner precision taps.
- Vertical motion/scroll should stay inside the canvas (feed swipe is separate). Don't place critical UI in the extreme top 80px.

LAYOUT PLAN (required on every generate/iterate with a game):
- Include game.layoutPlan: an array of rects {id, x, y, w, h, band} where x,y,w,h are fractions of W/H in 0–1.
- band is one of: hud | title | focal | hint | cta | other
- Rects must not overlap (leave ≥12px gap on a ~390×844 phone). CTA band center y ≈ 0.68–0.82. Focal center y ≈ 0.28–0.58.
- layout() in bodyJs must realize these rects (same ids / roles). Keep plan and code in sync when iterating.

NO OVERLAP / CLEAR COMPOSITION (required on every generate and iterate):
- Treat every interactive or important visual as a layout rect with x,y,w,h set in layout().
- Rects must not overlap (including text labels sitting on buttons/targets). Leave >= 12px gap between distinct UI groups.
- Stack vertically with clear bands: HUD-safe top → focal play area → instructions (optional) → primary CTA bottom. Never pile title + score + buttons + targets in the same band.
- Draw text with baseline/alignment that keeps glyphs inside their reserved rect; measure roughly (charWidth ≈ fontSize*0.55) so long labels do not spill into neighbors.
- If the user asks to add something, place it in empty space (or shrink/move existing rects in layout()) — do not drop new elements on top of existing ones.
- After any layout change, mentally verify: buttons clear of play objects, labels clear of each other, nothing under the host score HUD.

ITERATE ON EXISTING CODE (critical):
- When a CURRENT GAME CODE block is provided, you are EDITING that game — not inventing a new one.
- Start from the provided bodyJs. Apply only the user's requested change. Preserve working mechanics, variable names, state machine, colors, and structure unless the user asks to change them.
- Prefer surgical edits: adjust layout(), draw(), handlers, or a small helper. Do NOT rewrite the whole game from scratch for tweaks like "make the button bigger", "add a score", "fix overlap", or "change color".
- phase must be "iterated" when CURRENT GAME CODE was provided; keep title/tip/accent/bg unless the user asks to change them.
- Update layoutPlan to match the edited layout().
- If CURRENT GAME CODE is missing/broken and the user wants a new game, you may generate fresh code with phase "generated".

PATCH EDITS (preferred for small tweaks):
- For localised changes (button size/position, colour, speed, label, one new rect), return game.patches instead of game.bodyJs:
  "patches": [{"find": "exact snippet from the current body", "replace": "new snippet", "all": false}]
- Each find must be copied character-for-character from CURRENT GAME CODE and must match exactly one place (include surrounding lines to make it unique), or set "all": true to replace every occurrence.
- Keep patches minimal and ordered; still return layoutPlan for the resulting layout.
- Return a full game.bodyJs (and no patches) only for structural rewrites: new mechanic, new state machine, or the tweak touches most of the file.

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
    "mechanic": "reaction" | "timing" | "dodge" | "drag" | "stack" | "custom",
    "layoutPlan": [{"id":"title","x":0.1,"y":0.14,"w":0.8,"h":0.06,"band":"title"}],
    "bodyJs": "javascript game body",
    "patches": [{"find":"...","replace":"...","all":false}]
  }
}
Send either bodyJs (new game / rewrite) or patches (small edit to CURRENT GAME CODE), not both.

During interview, phase="interview" and game=null.
When ready to build the first version, phase="generated" and game must be set.
When CURRENT GAME CODE was provided and you applied a tweak, phase="iterated" and game must be set.

CRITICAL host runtime (bodyJs runs inside the same shell as official games — canvas, ctx, W, H, score, setScore, bump, die wrapper, GS, Juice, PF):
1. The host posts gamescroll:start after ready. Until then GS.paused === true.
2. Implement onHostStart() to reset into a playable idle state. Do NOT wait for a fake HTML Start button that never receives host start.
3. tick(dt) must early-return when GS.paused; draw() always paints the current UI (safe when called before onHostStart after layout()).
4. NEVER create HTML <button>, <input>, or other DOM controls. Draw all UI on canvas #c.
5. ALWAYS register canvas or window pointer handlers, e.g. canvas.addEventListener('pointerdown', handler).
6. Map taps with getBoundingClientRect: const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(W/r.width); const y=(e.clientY-r.top)*(H/r.height)
7. Hit-test drawn buttons with simple rects (x,y,w,h). Labels like "START" are canvas text only.
8. Timers / light sequences must advance in tick(dt) while !GS.paused — never rely only on setTimeout for core gameplay (setTimeout is ok as a helper, but state machine in tick is required).
9. On fail call die() (host may auto-replay). On success use bump() or setScore() with reaction time in ms as the score when relevant.
10. Keep body under ~80KB. No fetch, WebSocket, localStorage, eval, Worker, import().
11. Do NOT draw a second large score counter — the host already shows score at the top. Use bump()/setScore() only.
12. Always define layout, onHostStart, onResize, scorePos, diePos; call layout() from those and from reset; end the body with layout() or reset().
13. draw() MUST use PF.sky (plus blobs/dots and buddy/block/soft as appropriate) — catalog visual quality.

You MUST define tick, draw, die, layout, onHostStart, onResize, scorePos, diePos, and register pointerdown.
When a CANON EXAMPLE is provided in the conversation, copy its structure (PF draw, layout/onHostStart/tick/draw/pointer mapping) and adapt visuals/mechanics — do not downgrade to flat fillRect stubs.
${JUICE_RULES}
${ANTI_PATTERNS}
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
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
    } else {
      throw new Error('Model did not return JSON')
    }
  }
  const phase = parsed.phase
  const reply = typeof parsed.reply === 'string' ? parsed.reply : ''
  const game = normalizeGame(parsed.game as Partial<LlmGamePayload> | null)
  return {
    reply,
    phase:
      phase === 'generated' || phase === 'iterated' || phase === 'interview'
        ? phase
        : game
          ? 'generated'
          : 'interview',
    game,
  }
}

type ExistingDraft = {
  id: string
  slug: string
  title: string
  tip: string
  accent: string
  html_path: string
  brief: Record<string, unknown> | null
}

function briefBodyJs(brief: Record<string, unknown> | null | undefined): string | null {
  if (!brief) return null
  const raw = brief.bodyJs
  return typeof raw === 'string' && raw.trim() ? raw : null
}

function briefBg(brief: Record<string, unknown> | null | undefined): string | null {
  if (!brief) return null
  const raw = brief.bg
  return typeof raw === 'string' && raw.trim() ? raw : null
}

/** Recover bodyJs from wrapped HTML when brief.bodyJs is missing (older drafts). */
function extractBodyFromHtml(html: string): string | null {
  const marker = 'if (window.Juice) Juice.init('
  const startHint = html.indexOf(marker)
  if (startHint < 0) return null
  const afterInit = html.indexOf('\n', startHint)
  if (afterInit < 0) return null
  const endMarker = '\n    ;(function () {\n      const __halt = GS.halt'
  const end = html.indexOf(endMarker, afterInit)
  if (end < 0) return null
  const body = html.slice(afterInit + 1, end).replace(/\n$/, '')
  return body.trim() ? body : null
}

function buildIterateContext(existing: {
  title: string
  tip: string
  accent: string
  bg: string
  bodyJs: string
  layoutPlan?: LayoutRect[]
  mechanic?: string
}): ChatMessage {
  return {
    role: 'user',
    content: [
      'CURRENT GAME CODE — edit this in place for the latest user request.',
      'Return a full bodyJs derived from this source with only the requested changes.',
      'Keep layoutPlan in sync with layout(); fix any overlapping UI / bad positioning while you edit.',
      `title: ${existing.title}`,
      `tip: ${existing.tip}`,
      `accent: ${existing.accent}`,
      `bg: ${existing.bg}`,
      `mechanic: ${existing.mechanic || 'custom'}`,
      `layoutPlan: ${JSON.stringify(existing.layoutPlan || [])}`,
      'bodyJs:',
      '```javascript',
      existing.bodyJs,
      '```',
    ].join('\n'),
  }
}

async function callOpenAi(
  messages: ChatMessage[],
  opts?: { temperature?: number; modelKind?: ModelKind; maxTokens?: number },
): Promise<LlmTurn> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) throw new Error('OPENAI_API_KEY is not set on the Edge Function')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveModel(opts?.modelKind || 'generate'),
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.maxTokens ?? 12_000,
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
  meta: LlmGamePayload,
): Promise<LlmGamePayload> {
  // Keep repair lean — full chat history was a major timeout source.
  const recent = prior.slice(-4)
  const turn = await callOpenAi(
    [
      ...recent,
      {
        role: 'user',
        content: [
          `The previous game failed checks: ${errors.join('; ')}.`,
          'Return JSON with phase "generated", keep title/tip/accent/bg/mechanic, fixed bodyJs, and a corrected layoutPlan (0–1 fractions, no overlaps).',
          'Follow official catalog structure: layout/onHostStart/onResize/scorePos/diePos, PF.sky + PF helpers, getBoundingClientRect for pointer coords, no overlapping UI.',
          `title: ${meta.title}`,
          `tip: ${meta.tip}`,
          `accent: ${meta.accent}`,
          `bg: ${meta.bg}`,
          `mechanic: ${meta.mechanic || 'custom'}`,
          `prior layoutPlan: ${JSON.stringify(meta.layoutPlan)}`,
          'Broken bodyJs to repair:',
          '```javascript',
          bodyJs.length > 24_000 ? `${bodyJs.slice(0, 24_000)}\n/* truncated */` : bodyJs,
          '```',
        ].join('\n'),
      },
    ],
    { temperature: 0.2, modelKind: 'fast', maxTokens: 10_000 },
  )
  const fixed = turn.game
  if (!fixed) throw new Error('Repair pass did not return a game')
  return fixed
}

type CritiqueTurn = LlmTurn & { issues?: string[]; ok?: boolean }

/** Text-only layout/code QA — vision PNG was too slow and caused 504s. */
async function critiqueAndFix(
  game: LlmGamePayload,
): Promise<{ game: LlmGamePayload; issues: string[]; changed: boolean }> {
  const key = Deno.env.get('OPENAI_API_KEY')
  if (!key) return { game, issues: ['critique skipped: no API key'], changed: false }

  const ascii = layoutPlanAscii(game.layoutPlan)
  const bodySnippet =
    game.bodyJs.length > 10_000
      ? `${game.bodyJs.slice(0, 6_000)}\n/* … */\n${game.bodyJs.slice(-3_000)}`
      : game.bodyJs

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolveModel('fast'),
      temperature: 0.15,
      max_tokens: 8_000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a strict QA reviewer for Gamescroll canvas minigames. Respond with ONLY JSON:
{"ok":true|false,"issues":["..."],"reply":"short","phase":"generated","game":null|full game object}

If the body + layoutPlan already pass every checklist item, set ok=true, game=null, issues=[].
If anything fails, set ok=false, list issues, and return a FIXED complete game (title/tip/accent/bg/mechanic/layoutPlan/bodyJs) with minimal changes.

Checklist:
1. layout() matches layoutPlan; called from onHostStart/onResize/reset; body ends with layout()/reset()
2. No overlapping rects; CTA lower third; focal center band; clear of host HUD (y≳0.12)
3. tick respects GS.paused; pointer coords via getBoundingClientRect when using clientX/Y
4. Fail → die(); scoring via bump/setScore — no second score HUD; scorePos+diePos defined
5. Required fns: tick, draw, die, layout, onHostStart, onResize, scorePos, diePos
6. draw uses PF.sky (+ PF layers / buddy/block) like official catalog games — not flat fillRect-only`
        },
        {
          role: 'user',
          content: [
            `title: ${game.title}`,
            `tip: ${game.tip}`,
            `mechanic: ${game.mechanic || 'custom'}`,
            `layoutPlan: ${JSON.stringify(game.layoutPlan)}`,
            ascii,
            'bodyJs:',
            '```javascript',
            bodySnippet,
            '```',
          ].join('\n'),
        },
      ],
    }),
  })
  if (!res.ok) {
    return { game, issues: [`critique skipped: OpenAI ${res.status}`], changed: false }
  }
  const payload = await res.json()
  const content = payload.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    return { game, issues: ['critique skipped: empty response'], changed: false }
  }
  let parsed: CritiqueTurn
  try {
    parsed = extractJson(content) as CritiqueTurn
    const raw = JSON.parse(
      content.trim().startsWith('{')
        ? content.trim()
        : content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1),
    ) as { ok?: boolean; issues?: unknown }
    parsed.ok = raw.ok
    parsed.issues = Array.isArray(raw.issues) ? raw.issues.map(String) : []
  } catch {
    return { game, issues: ['critique skipped: bad JSON'], changed: false }
  }
  const issues = parsed.issues || []
  if (parsed.ok === true || !parsed.game?.bodyJs) {
    return { game, issues, changed: false }
  }
  return { game: parsed.game, issues, changed: true }
}

function checkGame(
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
const QUALITY_DEADLINE_MS = 95_000

async function ensureGameQuality(
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
