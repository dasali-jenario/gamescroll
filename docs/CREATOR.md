# UGC Game Creator setup

Canonical creator URL: **https://play.thehappylab.com/create**

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

## Flow

1. User opens `/create`, magic-link signs in.
2. Chat interviews → Edge Function generates **official-style** bridge-compatible HTML5/JS canvas bodies (same contract as `scripts/generate-games.mjs`: `layout` / `tick` / `draw` / `die` / `onHostStart` / `scorePos` / `diePos` + PF drawing) → Storage + `ugc_games` draft (`brief.bodyJs` stores the editable game body).
3. Before upload, each body is quality-gated: static layout/input/PF checks → **layoutPlan** overlap/safe-area validation → smoke-run (incl. **idle draw before start** + letterboxed playfield) → (optional) LLM text critique → repair if needed. Critique is skipped on clean patch iterates and when a ~95s time budget is low, to stay under Supabase’s ~150s idle timeout.
4. Background check for live approved UGC: `npm run check:ugc` (smokes every `source=user` approved body in Supabase).
5. First builds infer a **mechanic family** (reaction/timing/dodge/drag/stack) and seed an official-quality PF template; iterates use `OPENAI_MODEL_FAST` when set (else `OPENAI_MODEL`).
6. Follow-up prompts load that `bodyJs` + `layoutPlan` (or recover body from stored HTML for older drafts) and ask the model to **edit in place**. Small tweaks come back as `patches` (search/replace) applied server-side; `brief.editMode` records `patch` or `full`, and unappliable patches fall back to one full-body retry.
7. Only recent chat turns are sent to the model (first brief + last ~12 turns); the stored body carries the game state.
8. **Publish** → `published` (shareable via `?g=<slug>` immediately).
9. Moderator **Approve** → `approved` (enters main feed mix).

Optional Edge secret: `OPENAI_MODEL_FAST` (cheaper/faster model for iterate, repair, critique). Default falls back to `OPENAI_MODEL` / `gpt-4.1`.

## Game body requirements (same as official catalog)

UGC `bodyJs` must match official games:

- Plain HTML5 canvas JavaScript in the shared wrap shell (`gameWrap` / Edge `wrap.ts`) — not React or game engines
- Required functions: `layout`, `onHostStart`, `onResize`, `tick`, `draw`, `die`, `scorePos`, `diePos` + pointer handlers
- Visuals: `PF.sky` plus PF helpers (`blobs` / `dots` / `buddy` / `block` / `soft` / …)
- Host contract: `GS.paused`, `bump` / `setScore`, `die()` — no networking, storage, or DOM controls
- Portrait mobile layout + `layoutPlan` overlap checks (UGC-only gate on top of the catalog contract)
