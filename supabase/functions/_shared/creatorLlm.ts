/** OpenAI chat helpers + system prompt for the creator Edge Function. */
import {
  ANTI_PATTERNS,
  JUICE_RULES,
  OFFICIAL_STRUCTURE,
  PROGRESSION_PATTERNS,
} from './canonExamples.ts'
import { parseBodyPatches, type BodyPatch } from './patchBody.ts'
import {
  layoutPlanAscii,
  parseLayoutPlan,
  type LayoutRect,
} from './layoutPlan.ts'
import type { MechanicFamily } from './mechanics.ts'

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export type LlmGamePayload = {
  title: string
  tip: string
  accent: string
  bg: string
  bodyJs: string
  layoutPlan: LayoutRect[]
  mechanic?: MechanicFamily | string
  /** Small iterate edits: applied to the stored body instead of a full rewrite. */
  patches?: BodyPatch[]
  /** Scaffold theme overrides (labels, colors, rates) — first-build preferred path. */
  slots?: Record<string, string | number>
}

export type LlmTurn = {
  reply: string
  phase: 'interview' | 'generated' | 'iterated'
  game: LlmGamePayload | null
}

export type ModelKind = 'generate' | 'iterate' | 'fast'

export function resolveModel(kind: ModelKind): string {
  const strong = Deno.env.get('OPENAI_MODEL') || 'gpt-4.1'
  const fast = Deno.env.get('OPENAI_MODEL_FAST') || strong
  return kind === 'generate' ? strong : fast
}

/**
 * GPT-5-class / o-series reasoning models reject `temperature` and require
 * `max_completion_tokens`; older chat models still use `temperature` + `max_tokens`.
 * Extra token headroom covers hidden reasoning tokens; low effort keeps latency
 * within Edge Function limits.
 */
export function modelRequestParams(
  model: string,
  temperature: number,
  maxTokens: number,
): Record<string, unknown> {
  if (/^(gpt-5|o\d)/.test(model)) {
    return {
      model,
      max_completion_tokens: maxTokens + 4_000,
      reasoning_effort: 'low',
    }
  }
  return { model, temperature, max_tokens: maxTokens }
}

export function normalizeGame(raw: Partial<LlmGamePayload> | null | undefined): LlmGamePayload | null {
  if (!raw) return null
  const bodyJs = typeof raw.bodyJs === 'string' ? raw.bodyJs : ''
  const patches = parseBodyPatches(raw.patches)
  const slots =
    raw.slots && typeof raw.slots === 'object' && !Array.isArray(raw.slots)
      ? (Object.fromEntries(
          Object.entries(raw.slots as Record<string, unknown>).filter(
            ([, v]) => typeof v === 'string' || typeof v === 'number',
          ),
        ) as Record<string, string | number>)
      : undefined
  if (!bodyJs.trim() && patches.length === 0 && !slots) return null
  return {
    title: String(raw.title || 'Untitled').slice(0, 64),
    tip: String(raw.tip || 'Tap to play').slice(0, 120),
    accent: String(raw.accent || '#e9c46a'),
    bg: String(raw.bg || raw.accent || '#264653'),
    bodyJs,
    layoutPlan: parseLayoutPlan(raw.layoutPlan),
    mechanic: raw.mechanic,
    patches,
    slots,
  }
}

export const MAX_HISTORY_TURNS = 12
export const MAX_HISTORY_CHARS = 6_000

/**
 * Keep the opening brief plus recent turns; the stored bodyJs carries the game state,
 * so long interview transcripts only dilute the edit request.
 */
export function trimConversation(messages: ChatMessage[]): ChatMessage[] {
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

export const SYSTEM_PROMPT = `You are Gamescroll's game creator assistant. You invent tiny single-player HTML5 canvas minigames for a TikTok-style feed.

Quality bar: bodyJs must match the same structure, feel, and requirements as official catalog games authored in scripts/generate-games.mjs — plain HTML5 + JavaScript canvas bodies in the shared wrap shell (not React, not Phaser, not external engines).

Hard product limits (never violate):
- No multiplayer, no networking, no backends
- No saved game state (no localStorage/sessionStorage/indexedDB/cookies)
- Touch-first: tap, hold, drag, or swipe only
- Games MUST be fully playable: every visible control must respond to pointer input
- Portrait-first mobile: design for tall phones in a TikTok-style full-bleed frame (typically W < H). Landscape is secondary — still call layout() from onResize, but primary composition is portrait.
${OFFICIAL_STRUCTURE}
MECHANIC FAMILIES:
Set game.mechanic to one of: reaction | timing | dodge | drag | stack | merge | sort | grid | word | custom.
- Scaffold families (reaction/timing/dodge/drag/stack/merge/sort/grid/word): when a GOLDEN SCAFFOLD seed is provided, follow it.
  - merge: physics drop-merge (Suika-style jar). sort: tube-sort color pour puzzle. grid: memory pair-match cards. word: guess-the-word grid + canvas keyboard.
- custom: FREEFORM PATH — build the game the user described (novel rules, anything without a scaffold). Do NOT substitute an arcade loop unless they asked for one.

GOLDEN SCAFFOLD FIRST BUILDS (when seed says GOLDEN SCAFFOLD PATH):
- Do NOT invent coordinates or rewrite layout()/LAYOUT_PLAN.
- Return phase="generated" with title/tip/accent/bg/mechanic and game.slots (theme/labels/rates only).
- Set game.bodyJs to "" (empty). Server injects the locked playable scaffold body + layoutPlan.
- Keep layoutPlan identical to the scaffold plan when you include it.

CUSTOM FREEFORM FIRST BUILDS (when seed says FREEFORM PATH):
- Return complete game.bodyJs + layoutPlan for the requested game (any genre).
- Use the GENERIC CHROME CONTRACT from the seed: const LAYOUT_PLAN, L = GS.layoutFromPlan(...), layoutRects().
- Invent mechanics inside L.title / L.focus / L.hint / L.cta — do not invent a second chrome coordinate system.
- Do not offer a reaction substitute for Wordle/puzzle/etc.

PORTRAIT / MOBILE LAYOUT (required):
- Assume safe playfield inset: top ~8% of H (in-game score HUD), bottom ~8% of H, sides ~4% of W. The host letterboxes the iframe away from app chrome (top bar, bottom nav, swipe rail) — do not draw interactive hit targets into the extreme corners.
- Primary action buttons: lower third (about y = H*0.68 to H*0.82), centered, width ~70% of W (min 200, max 320), height >= 56px (prefer 64–72 on large phones).
- Main focal content (lights, player, targets): center band y ≈ H*0.28 to H*0.58 — not tiny at the top.
- Use relative layout from W/H via GS.layoutFromPlan(LAYOUT_PLAN, W, H) when editing scaffold bodies. Never hard-code 1920x1080 or desktop positions.
- Fonts: scale with Math.min(W,H), e.g. title ~0.07*W, body ~0.045*W. Keep text short.
- Hit targets >= 48px. Prefer full-width tap zones when the prompt is "tap anywhere".
- One-thumb play: avoid requiring simultaneous multi-touch or top-corner precision taps.
- Vertical motion/scroll should stay inside the canvas (feed swipe is separate). Don't place critical UI in the extreme corners.

LAYOUT PLAN (required on every generate/iterate with a game):
- Include game.layoutPlan: an array of rects {id, x, y, w, h, band} where x,y,w,h are fractions of W/H in 0–1.
- band is one of: hud | title | focal | hint | cta | other
- Rects must not overlap (leave ≥12px gap on a ~390×844 phone). CTA band center y ≈ 0.68–0.82. Focal center y ≈ 0.28–0.58.
- layout() must call GS.layoutFromPlan(LAYOUT_PLAN, W, H) (or keep L in sync) and expose layoutRects() returning that object. Keep plan and code in sync when iterating.
- Do not freeform-move chrome bands on iterate unless the user explicitly asks to move layout; prefer SLOTS / label / color patches.

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
    "mechanic": "reaction" | "timing" | "dodge" | "drag" | "stack" | "merge" | "sort" | "grid" | "word" | "custom",
    "layoutPlan": [{"id":"title","x":0.1,"y":0.14,"w":0.8,"h":0.06,"band":"title"}],
    "slots": {"titleText":"REACT","sky0":"#1b1f3b"},
    "bodyJs": "javascript game body",
    "patches": [{"find":"...","replace":"...","all":false}]
  }
}
On GOLDEN SCAFFOLD first builds: send slots (+ empty bodyJs). On CUSTOM FREEFORM: send complete bodyJs + layoutPlan. On iterate: send either bodyJs (rewrite) or patches (small edit), not both.

During interview, phase="interview" and game=null.
When ready to build the first version, phase="generated" and game must be set.
When CURRENT GAME CODE was provided and you applied a tweak, phase="iterated" and game must be set.

CRITICAL host runtime (bodyJs runs inside the same shell as official games — canvas, ctx, W, H, score, setScore, bump, die wrapper, GS, Juice, PF):
1. The host posts gamescroll:start after ready. Until then GS.paused === true.
2. Implement onHostStart() to reset into a playable idle state. Do NOT wait for a fake HTML Start button that never receives host start.
3. tick(dt) must early-return when GS.paused; draw() always paints the current UI (safe when called before onHostStart after layout()). CRITICAL idle-safe rule: if draw reads board/grid/cells/rows like board[r][c], initialize that structure at declaration OR call reset()/clonePuzzle() at end of body — never leave board=[] and then index it in draw before onHostStart (browse preview crashes with "Cannot read properties of undefined (reading '0')").
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
${PROGRESSION_PATTERNS}
${ANTI_PATTERNS}
`


export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'game'
  const suffix = crypto.randomUUID().slice(0, 8)
  return `${base}-${suffix}`
}

export function extractJson(text: string): LlmTurn {
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

export type ExistingDraft = {
  id: string
  slug: string
  title: string
  tip: string
  accent: string
  html_path: string
  brief: Record<string, unknown> | null
}

export function briefBodyJs(brief: Record<string, unknown> | null | undefined): string | null {
  if (!brief) return null
  const raw = brief.bodyJs
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export function briefBg(brief: Record<string, unknown> | null | undefined): string | null {
  if (!brief) return null
  const raw = brief.bg
  return typeof raw === 'string' && raw.trim() ? raw : null
}

/** Recover bodyJs from wrapped HTML when brief.bodyJs is missing (older drafts). */
export function extractBodyFromHtml(html: string): string | null {
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

export function buildIterateContext(existing: {
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

export async function callOpenAi(
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
      ...modelRequestParams(
        resolveModel(opts?.modelKind || 'generate'),
        opts?.temperature ?? 0.7,
        opts?.maxTokens ?? 12_000,
      ),
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

export async function repairBody(
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
          'If the body uses SLOTS / LAYOUT_PLAN / GS.layoutFromPlan / layoutRects(), you MUST keep `const SLOTS = {…}` and `const LAYOUT_PLAN = […]` at the top intact.',
          errors.some((e) => /idle draw|before start|letterboxed/i.test(e))
            ? [
                'IDLE DRAW FIX (required for these errors):',
                '- Host calls layout() then draw() while GS.paused, BEFORE onHostStart.',
                '- draw() must not throw when board/grid/cells are empty.',
                '- Prefer: initialize board via emptyBoard()/clonePuzzle() at load, OR end the body with reset() (not only layout()), OR guard `if (!board.length || !board[0])` before indexing.',
                '- Classic bug: `let board = []` then `board[r][c]` in draw → TypeError reading \'0\'.',
              ].join('\n')
            : '',
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
        ]
          .filter(Boolean)
          .join('\n'),
      },
    ],
    { temperature: 0.2, modelKind: 'fast', maxTokens: 10_000 },
  )
  const fixed = turn.game
  if (!fixed) throw new Error('Repair pass did not return a game')
  return fixed
}

export type CritiqueTurn = LlmTurn & { issues?: string[]; ok?: boolean }

/** Text-only layout/code QA — vision PNG was too slow and caused 504s. */
export async function critiqueAndFix(
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
      ...modelRequestParams(resolveModel('fast'), 0.15, 8_000),
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
6. draw uses PF.sky (+ PF layers / buddy/block) like official catalog games — not flat fillRect-only
7. Juice: every score event has visible feedback (floating popup, flash, particle burst, or squash) — silent bump() calls fail
8. Progression: at least one of level loop (level++ & harder rebuild), combo multiplier window, or speed/pressure ramp — a static loop fails
9. Readable fail state: the player can tell why they died (danger pulse, shake, color change) and the game recovers/resets cleanly after die()`
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

