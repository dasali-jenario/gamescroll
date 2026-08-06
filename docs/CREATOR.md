# UGC Game Creator setup

Canonical creator URL: **https://play.thehappylab.com/create**

The `/create` (and `/mod`) UI is code-split from the feed: opening those paths downloads their chunk on demand.

## Happylab auto-deploy

Pushing to the `thehappylab` GitHub remote builds/deploys automatically. That build uses committed [`.env.production`](../.env.production) for `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (public anon key + RLS). Do **not** put service-role or OpenAI keys there.

## Cursor / CLI setup (preferred)

With these keys in `.env.local`:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_ACCESS_TOKEN` (from [Account → Access Tokens](https://supabase.com/dashboard/account/tokens))
- `OPENAI_API_KEY`
- optional: `SUPABASE_REGION`, `OPENAI_MODEL`, `OPENAI_MODEL_FAST`

Run:

```bash
node scripts/setup-supabase.mjs
```

That script (via Management API + CLI):

1. Applies `supabase/migrations/20260723120000_ugc_games.sql` and `20260727130000_ugc_games_source.sql` (`source`: `official` | `user`)
2. Optional: `node scripts/seed-official-games.mjs` uploads catalog HTML to Storage and ensures official rows exist
2. Writes `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` into `.env.local`
3. Sets Edge secrets (`PUBLIC_SITE_URL`, `OPENAI_API_KEY`)
4. Deploys the `creator` Edge Function
5. Configures Auth redirects for `/create`

## Moderators

After you sign in once at `/create`, get your user id from Auth → Users, then:

```sql
insert into public.moderators (user_id)
values ('YOUR_AUTH_USER_UUID');
```

Or ask Cursor to run that SQL for you.

## Hostinger SPA routes

`public/.htaccess` rewrites unknown paths to `index.html` so `/create` and `/mod` work on hard refresh. Redeploy `dist/` after build.

## Edge Function layout

`supabase/functions/creator/index.ts` is a thin HTTP entry (CORS, auth, action dispatch). Pipeline lives under `supabase/functions/_shared/`:

| Module | Role |
|--------|------|
| `creatorLlm.ts` | System prompt, OpenAI call, repair/critique helpers |
| `qualityGate.ts` | `checkGame` / `ensureGameQuality` (smoke + layout fidelity) |
| `chatTurn.ts` | `chat` action (interview → scaffold generate/iterate → draft upload) |
| `layoutFix.ts` | `layout_fix` action (deterministic plan mutations) |
| `mechanicScaffolds.ts` | Golden playable bodies + slot materialize |
| `publishDraft.ts` | `publish` + `moderate` actions |

After changing those files (or synced `src/lib` twins), redeploy:

```bash
supabase functions deploy creator --project-ref "$(grep '^SUPABASE_PROJECT_REF=' .env.local | cut -d= -f2)"
```

`node scripts/sync-shared.mjs` regenerates Deno `_shared` twins from `src/lib/*` and appends `.ts` on relative imports (required for Edge bundling).

## Moderation previews

`/mod` loads game iframes only when a card is near the viewport (or the moderator pins/loads a preview). Previews reuse `usePlayableFrameSrc` so Storage-served HTML gets the same blob wrapping as the feed.

## Flow

1. User opens `/create`, magic-link signs in.
2. Chat interviews → Edge infers a **mechanic family**:
   - **Arcade** (reaction/timing/dodge/drag/stack) → clone a **golden scaffold**; LLM returns **slots** only.
   - **Custom** (Wordle, puzzles, novel rules) → **freeform** path: LLM returns full `bodyJs` + `layoutPlan` (must use `GS.layoutFromPlan` + `layoutRects()`). Never silently remapped to reaction.
   - First-build replies + Create welcome **state the path** (arcade format vs custom layout-checked).
3. Before upload, each body is quality-gated: static checks → **layoutPlan** validation → smoke → **layout fidelity** (hard-fail) → optional LLM critique (skipped on arcade scaffold first builds / clean patches).
4. Background check: `npm run check:ugc` (smoke + fidelity; missing harvest soft WARN for legacy).
5. Iterates use `OPENAI_MODEL_FAST` when set. Layout Fix chips (`layout_fix`) mutate the plan deterministically.
6. Only recent chat turns are sent to the model; stored body carries game state.
7. **Publish** → `published` (`?g=<slug>`).
8. Moderator **Approve** → `approved` (feed mix).

Optional Edge secret: `OPENAI_MODEL_FAST`. Default falls back to `OPENAI_MODEL` / `gpt-4.1`.

## Phase 0 — measure before rebuild

Better Game Builder Phase 0 locks baselines so Phase 1 (plan-driven layout + scaffolds) is measurable.

### Success target

**≥80% of first builds publishable without a layout-fix chat turn** (`FIRST_BUILD_LAYOUT_PASS_TARGET` in [`src/lib/creatorMetrics.ts`](../src/lib/creatorMetrics.ts)).

### Failure taxonomy

Offline + gate errors map into:

| Class | Meaning |
|-------|---------|
| `overlap` | `layoutPlan` rects collide |
| `cta_off_band` | CTA outside lower-third band / undersized hit target |
| `idle_crash` | Smoke throws on idle draw before `onHostStart` |
| `unresponsive_hit` | Pointer / hit-target failures |
| `playfield_mismatch` | Harvested runtime rects drift from `layoutPlan` beyond ε |
| `no_harvest` | Body exposes no `layoutRects()` / `layoutRects` / `L` / `rects` graph |
| `other` | Unclassified gate failure |

### Layout fidelity

[`src/lib/layoutFidelity.ts`](../src/lib/layoutFidelity.ts) harvests named `{x,y,w,h}` px rects after `layout()` and compares them to `layoutPlan` fractions (default ε = `0.04` of W/H on the 390×844 reference).

- **`npm run check:ugc`** — fails on smoke errors and on fidelity **mismatch** when a harvest graph exists; missing harvest is a **soft WARN** for legacy approved UGC.
- **`npm run baseline:ugc`** — samples recent `source=user` drafts/published/approved rows, classifies failures, prints overall + **arcade vs freeform** pass rates / critique-skip / turns-to-publish / patch-vs-full.
- **Upload path (`checkGame`)** — Phase 1 hard-fails missing harvest and fidelity mismatch (scaffolds always expose `layoutRects()`).

The **≥80% first-build layout target** is judged primarily on the **arcade** cohort (`meetsArcadeTarget`). Freeform pass rate is informational — novel games may need more turns.

### Creator telemetry contract

Event names (for Edge/client instrumentation; props helpers in `creatorMetrics`):

| Event | Purpose |
|-------|---------|
| `creator_first_build_check` | `checkGame` pass/fail + failure classes + mechanic + `build_path` |
| `creator_critique` | ran vs skipped (time budget / clean patch) |
| `creator_publish` | user chat turns until publish |
| `creator_edit_mode` | `patch` vs `full` rewrite |

Stored `brief.editMode` + `brief.critiqueIssues` + `brief.buildPath` / `brief.mechanic` support offline baselines via `summarizeCreatorBaseline`.

### Creator run logs (Supabase)

Edge writes diagnostic rows to [`creator_run_logs`](../supabase/migrations/20260730140000_creator_run_logs.sql) on each chat turn (`creator_chat_start`, `creator_quality_fail`, `creator_draft_saved`, `creator_interview`, …). **Rows are retained** (no TTL) so we can improve prompts/scaffolds from production fails. Failures include truncated-but-large `body_js` (up to ~48KB), `user_prompt`, `errors` with short stacks (e.g. idle `board[r][c]` crashes), and `props.failure_classes` / `props.repair_attempted`.

Query recent fails (SQL editor / service role):

```sql
select created_at, event, mechanic, build_path, errors, props->>'failure_classes' as classes,
       left(user_prompt, 120), left(body_js, 200)
from public.creator_run_logs
where ok = false
order by created_at desc
limit 20;
```

Also emitted as `[creator_run]` JSON lines in the `creator` Edge Function logs.

## Phase 1 — layout as source of truth (shipped + Edge deployed 2026-07-29)

- **`GS.layoutFromPlan(plan, W, H)`** in the wrap shell — scaffolds/freeform read `L = GS.layoutFromPlan(LAYOUT_PLAN, W, H)` and expose `layoutRects()`.
- **Arcade golden scaffolds** ([`mechanicScaffolds.ts`](../src/lib/mechanicScaffolds.ts)): reaction / timing / dodge / drag / stack — optional fast path when that family is inferred.
- **Custom FREEFORM** (Variety Phase 0–1): novel prompts get full `bodyJs` + **generic portrait chrome** (`DEFAULT_PORTRAIT_CHROME` + `GS.layoutFromPlan` / `layoutRects`) — not remapped to reaction, not a Wordle-specific template.
- **Geometric gate** in [`qualityGate.ts`](../supabase/functions/_shared/qualityGate.ts): smoke + fidelity with `requireHarvest: true`.
- **Fix chips** on Create: `layout_fix` + plan overlay.
- Redeploy: `supabase functions deploy creator --project-ref "$(grep '^SUPABASE_PROJECT_REF=' .env.local | cut -d= -f2)"`.

## Variety Phase 2 — path honesty + split metrics

- First-build assistant replies prepend an **arcade format** vs **custom (layout-checked)** line ([`creatorPaths.ts`](../src/lib/creatorPaths.ts)); Create welcome explains both paths.
- Draft `brief.buildPath` is `arcade` | `freeform` for baselines.
- No Create “genre studio” modes — product does not steer users into a short list of named minigame types.
- Metrics: `arcadePassRate` / `freeformPassRate` in `summarizeCreatorBaseline`.

## Game body requirements (same as official catalog)

UGC `bodyJs` must match official games:

- Plain HTML5 canvas JavaScript in the shared wrap shell (`gameWrap` / Edge `wrap.ts`) — not React or game engines
- Required functions: `layout`, `onHostStart`, `onResize`, `tick`, `draw`, `die`, `scorePos`, `diePos` + pointer handlers
- Visuals: `PF.sky` plus PF helpers (`blobs` / `dots` / `buddy` / `block` / `soft` / …)
- Host contract: `GS.paused`, `bump` / `setScore`, `die()` — no networking, storage, or DOM controls
- Portrait mobile layout + `layoutPlan` overlap checks (UGC-only gate on top of the catalog contract)
- **Layout harvest (required on upload):** expose named rects via `layoutRects()` (or `layoutRects` / `L` / `rects`) keyed by `layoutPlan` ids; prefer `GS.layoutFromPlan(LAYOUT_PLAN, W, H)`
