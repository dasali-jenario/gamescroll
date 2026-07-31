# New file requests

## 2026-07-31 — Race Start Lights UGC fix (best time + drop F1)

### Requested files
- `scripts/fix-race-start-lights.mjs` — re-upload UGC slug `race-start-reaction-3be720bf` with personal best (lowest ms), title/tip “Race Start Lights” (no F1)
- Host tweak (existing): `src/highscores.ts` + test — add slug to `LOWER_IS_BETTER`

### Duplicate search
- Grep `race-start-reaction|Race Light|F1 start|fix-race` under `scripts/` / `src/` → prior live UGC only; `scripts/fix-wordle-mini.mjs` is the closest hot-fix pattern
- `reactflash` already has lower-is-better + in-game Best; this UGC needed the same for its slug
- Tip previously: `F1 start lights: wait for the greens, then tap fast!`

### Rationale
Rights-safe naming + show “My best” (host bar + in-game) using lowest reaction time.


## 2026-07-30 — Privacy disclosure (info button)

### Requested files
- `src/components/PrivacyDisclosure.tsx` — bottom-right (i) control + privacy panel for Gamescroll / The Happy Lab GmbH
- Styles in `src/styles/feed.css`; wired from `src/App.tsx`

### Duplicate search
- Grep `PrivacyDisclosure|privacy-disclosure|InfoButton|AboutOverlay|privacy|cookie` in `src/` → none for UI
- Closest: `GameOverOverlay` (dialog pattern), `BottomNav` (fixed chrome), no privacy/about surface

### Rationale
EU/UK-facing disclosure without a cookie consent banner; provider + data practices reachable from the play feed.

## 2026-07-30 — Creator run logs (Supabase)

### Requested files
- `supabase/migrations/20260730140000_creator_run_logs.sql` — `creator_run_logs` table + RLS
- `supabase/functions/_shared/creatorLog.ts` — Edge `logCreatorRun` (DB insert + console)
- Updates: `chatTurn.ts` (log start / quality fail / draft save / interview), smoke stack snippet, `setup-supabase.mjs`, `docs/CREATOR.md`

### Duplicate search
- Grep `creator_run_logs|logCreatorRun|creatorLog` → none
- Closest: `feed_telemetry_events` (client feed only), `creatorMetrics` event *names* (no Edge emit), Supabase Function console (ephemeral)

### Rationale
Diagnose creator smoke/quality failures (e.g. `c is not defined`) with prompt + bodyJs + errors persisted in Supabase.

## 2026-07-29 — Creator Variety Phase 2 (path honesty + split metrics)

### Requested files
- `src/lib/creatorPaths.ts` — arcade vs freeform honesty prefixes (`withPathHonesty`)
- `src/creatorPaths.test.ts` — path labels + no-duplicate prepend
- Updates: `creatorMetrics` (split arcade/freeform rates), `chatTurn` (brief.buildPath + honest reply), Create welcome, `baseline-ugc-layout.mjs`, `sync-shared.mjs`, `docs/CREATOR.md`, Variety + Better Game Builder plans

### Duplicate search
- Grep `creatorPaths|withPathHonesty|pathHonesty|buildPath|arcadePassRate|meetsArcadeTarget` → none prior
- Closest: `creatorMetrics` (overall firstBuildPassRate only); Create `WELCOME` (no path explanation); chatTurn replies without path label

### Rationale
Variety Phase 2: honest UX + metrics that do not dilute the arcade layout target with freeform variety.

## 2026-07-29 — Creator Variety Phase 1 (generic chrome)

### Requested files
- `src/lib/genericChrome.ts` — default portrait bands, `ensureFreeformChrome`, freeform seed section
- `src/genericChrome.test.ts` — chrome contract + fidelity after ensure
- Updates: `mechanicScaffolds` seed, `chatTurn` (ensure chrome on custom first build), `creatorLlm`, `sync-shared.mjs`, `docs/CREATOR.md`

### Duplicate search
- Grep `genericChrome|DEFAULT_PORTRAIT_CHROME|ensureFreeformChrome|freeformChromeSeed` → none
- Closest: arcade `layoutPlan`s inside mechanicScaffolds (genre-specific full games); layoutPlan.ts (validation only)

### Rationale
Variety Phase 1: genre-agnostic chrome so freeform stays layout-reliable without Wordle/quiz scaffolds.

## 2026-07-29 — Creator Variety Phase 0 (unblock custom freeform)

### Requested files
- Updates: `src/lib/mechanicScaffolds.ts` (`hasArcadeScaffold`, `customFreeformSeedMessage`, no custom→reaction), `chatTurn.ts` (arcade-only materialize), `creatorLlm.ts` (FREEFORM prompt), tests, `docs/CREATOR.md`

### Duplicate search
- Grep `hasArcadeScaffold|customFreeformSeedMessage|FREEFORM PATH|custom → reaction` → prior code forced custom→reaction via `resolveScaffoldFamily`
- Closest: arcade scaffolds (keep as optional fast path)

### Rationale
Variety Phase 0: restore freeform codegen for novel games while keeping layout geom gate; arcade scaffolds only when family matches.

## 2026-07-29 — Better Game Builder Phase 1 docs/tests lock-in

### Requested files
- `src/builderPhase1.test.ts` — Create UI / chatTurn scaffold / qualityGate / sync-shared / CREATOR.md contracts
- Updates: plan (`better_game_builder_adbe1a51.plan.md`), `docs/CREATOR.md`, `docs/WEBAPP.md`, `creatorMod.test.ts`, `creatorMetrics` classifier (drop spurious `other` with `no_harvest`)

### Duplicate search
- Grep `builderPhase1|GOLDEN SCAFFOLD|layout_fix` under `src/*.test.ts` → Phase 1 behavior covered piecemeal in `mechanicScaffolds.test.ts` / `creatorMod.test.ts`, no single Phase 1 contract file
- Closest: `creatorMod.test.ts` (Edge carve), `mechanicScaffolds.test.ts` (runtime scaffolds)

### Rationale
Lock deployed Phase 1 behavior in docs + regression tests after Edge deploy; keep plan sequencing on Phase 2.

## 2026-07-29 — Better Game Builder Phase 1 (scaffolds + plan-driven layout)

### Requested files
- `src/lib/mechanicScaffolds.ts` — 5 golden playable scaffolds + slot materialize helpers
- `src/lib/layoutMutations.ts` — deterministic Fix-overlap / enlarge-CTA / move-CTA-down
- `src/mechanicScaffolds.test.ts` — scaffold smoke + fidelity + mutation coverage
- `src/components/LayoutPlanOverlay.tsx` — creator preview plan debug overlay
- `supabase/functions/_shared/layoutFix.ts` — `layout_fix` Edge action
- Updates: `layoutPlan.ts` (`layoutFromPlan`), `gameWrap` / `gameSmoke` / `layoutFidelity` (inject helper), `qualityGate` (hard harvest), `chatTurn` (scaffold first-build), `creator/index.ts`, `CreatePage` + `create.css`, `sync-shared.mjs`, `docs/CREATOR.md`

### Duplicate search
- Grep `layoutFromPlan|mechanicScaffolds|materializeScaffold|applyLayoutFix|layout_fix|LayoutPlanOverlay` under `src/` / `supabase/` → none before this
- Glob `**/*scaffold*` / `**/layoutMutation*` / `**/LayoutPlan*` → only `layoutPlan.ts` (validation) and Phase 0 `layoutFidelity.ts`
- Closest: thin `MECHANIC_TEMPLATES` + `canonExamples.ts` (prompt seeds, not shippable locked bodies); LLM critique for layout (soft, often skipped)

### Rationale
Phase 1: make `layoutPlan` authoritative via `GS.layoutFromPlan`, clone golden scaffolds on first build (LLM fills slots), hard geometric gate on upload, and deterministic Fix chips instead of full rewrites.

## 2026-07-29 — Better Game Builder Phase 0 (metrics + layout fidelity)

### Requested files
- `src/lib/layoutFidelity.ts` — harvest runtime rects + compare to `layoutPlan` (ε gate)
- `src/layoutFidelity.test.ts` — unit coverage for harvest / drift / soft missing-harvest
- `src/lib/creatorMetrics.ts` — failure taxonomy, baseline aggregation, telemetry event names
- `src/creatorMetrics.test.ts` — classify + summarize + props helpers
- `scripts/baseline-ugc-layout.mjs` — sample recent user UGC, classify, print Phase 0 report
- Updates: `scripts/check-ugc-games.mjs` (fidelity after smoke), `package.json` (`baseline:ugc`), `docs/CREATOR.md` (Phase 0 section)

### Duplicate search
- Grep `layoutFidelity|checkBodyLayoutFidelity|harvestLayoutRects|LAYOUT_FIDELITY` under `src/` / `scripts/` → none
- Grep `creatorMetrics|FIRST_BUILD_LAYOUT_PASS|creator_first_build_check|summarizeCreatorBaseline` → none
- Grep `baseline-ugc|baseline:ugc` → none
- Closest: `layoutPlan.ts` (plan validation only), `gameSmoke.ts` (runtime smoke, no plan↔rect compare), `metrics.ts` / `feed_telemetry_events` (feed visits, not creator gate), `check-ugc-games.mjs` (smoke-only before this)

### Rationale
Phase 0 of Better Game Builder: measure first-build / critique-skip / turns-to-publish and add a geometric layout-fidelity check before Phase 1 makes `layoutPlan` authoritative.

## 2026-07-28 — ugc_games plays / players counters

### Requested files
- `supabase/migrations/20260728213000_ugc_games_play_counts.sql` — `plays` + `players` columns, `ugc_game_players` uniqueness table, `record_ugc_play` RPC
- `src/lib/playCounts.ts` — client fire-and-forget after ≥10s play
- `src/playCounts.test.ts` — unit coverage for RPC wiring
- Updates: `usePlaySession` (10s timer), `GameCard` / `useFeedSession` / `App` (pass game id), `UgcGameRow`, `setup-supabase.mjs`

### Duplicate search
- Grep `plays|players|play_count|record_ugc_play|ugc_game_players|QUALIFIED_PLAY` under `supabase/` / `src/` → none (telemetry is `feed_telemetry_events` only; highscores are local)
- Glob `**/playCounts*` → none
- Closest: `src/metrics.ts` (`gs_uid` + anon inserts); RLS blocks client UPDATE on `ugc_games`

### Rationale
Denormalized play/unique-player counters on the game registry; anon clients need a SECURITY DEFINER RPC after 10s continuous engagement.

## 2026-07-28 — Wave 3 GameBox + jam micro-games

### Requested files
- `scripts/wave3-games.mjs` — Simon + Whack-a-Mole (GameBox MIT) plus five jam-style micro-games
- `supabase/migrations/20260728180000_official_wave3_seed.sql` — upsert Wave 3 official rows
- Updates: `generate-games.mjs`, `THIRD_PARTY_NOTICES`, `FEED_WINDOW_MAX` (51×3), seed script, catalogIntegrity, feedWindow test

### Duplicate search
- Grep `simonseq|molewhack|reactflash|mashmeter|targetdrop|orbchain|skewkeep|wave3` under `scripts/` / `public/games/` → none
- Glob `scripts/wave*` → wave1 + wave2 only
- Closest: Wave 1/2 modules; GameBox `simon-game` / `whack-a-mole`; skipped GPL OS13k and 2P insertcoin tap-race

### Rationale
Plan Wave 3: GameBox classics + license-safe micro mechanics (original jam-style bodies; no unclear js13k archive grabs).

## 2026-07-28 — Wave 2 insertcoin puzzle ports

### Requested files
- `scripts/wave2-games.mjs` — seven MIT insertcoin puzzle rewrites as GameScroll `body` entries
- `supabase/migrations/20260728173000_official_wave2_seed.sql` — upsert Wave 2 official `ugc_games` rows
- Updates: `scripts/generate-games.mjs` (import + Object.assign), `THIRD_PARTY_NOTICES`, `FEED_WINDOW_MAX` (44×3), `seed-official-games.mjs`, feedWindow test, generated `public/games/*.html` + catalog

### Duplicate search
- Grep `tilemerge|minesweep|memmatch|slide15|gemcascade|colorflow|blockfit|wave2` under `scripts/` / `public/games/` → none
- Glob `scripts/wave*` → only `wave1-games.mjs`
- Closest: Wave 1 module pattern; insertcoin sources under `src/games/{2048,minesweeper,memory,15puzzle,gem-cascade,color-flow,block-fit}/`

### Rationale
Plan Wave 2 puzzle expansion; same packaging as Wave 1 (compact canvas rewrites, not TypeScript ports).

## 2026-07-28 — Measured chrome insets for playfield

### Requested files
- `src/hooks/useChromeInsets.ts` — ResizeObserver sets `--chrome-top` / `--bottom-nav` from real top-bar + bottom-nav boxes
- Updates: `src/App.tsx`, `src/components/BottomNav.tsx` (navRef), `src/styles/base.css` / `feed.css`, playPresentation test, pegdrop + doodle game bodies

### Duplicate search
- Grep `useChromeInsets|ResizeObserver|--chrome-top` under `src/hooks` → none measuring chrome; CSS only uses static `calc(5.35rem + env(safe-area-inset-top))`
- Glob `src/hooks/*Chrome*` / `*Inset*` → none
- Closest: `playPresentation.ts` documents inset contract; letterbox CSS on `.stage`

### Rationale
Screenshot showed host title/score clipped under the status bar; fixed rem chrome underestimates tip wrap + device safe-area. Measuring real chrome keeps the playfield robust.

## 2026-07-28 — Official Wave 1 / Orb Merge DB seed

### Requested files
- `supabase/migrations/20260728160000_official_wave1_seed.sql` — upsert orbmerge + 10 Wave 1 official `ugc_games` rows
- Updates: `scripts/seed-official-games.mjs` (apply both official seed migrations)

### Duplicate search
- Grep `orbmerge|taprotate|wave1` under `supabase/migrations` → none (only base 26 in `20260727130000_ugc_games_source.sql`)
- Glob `supabase/migrations/*wave*` / `*official*` → only the 20260727 source seed
- Seed script previously applied only that one migration, so Storage had 37 HTML files but DB stayed at 26 official rows

### Rationale
Keep Supabase official rows aligned with the static catalog after Orb Merge + Wave 1.

## 2026-07-28 — Wave 1 insertcoin ports module

### Requested files
- `scripts/wave1-games.mjs` — ten MIT insertcoin portrait-arcade rewrites as GameScroll `body` entries (assigned into `generate-games.mjs`)
- Updates: `scripts/generate-games.mjs` (import + Object.assign), `THIRD_PARTY_NOTICES`, feed window (37×3), generated `public/games/*.html` + catalog

### Duplicate search
- Grep `taprotate|hueblaster|oneshot|chainblast|popshot|cryptrun|starvoid|pegdrop|neondash|nighttreads|wave1` under `scripts/` / `public/games/` → none
- Glob `scripts/wave*` → none; existing pattern is inline `Object.assign(games, …)` blocks inside `generate-games.mjs`
- Closest: `orbmerge` block in `generate-games.mjs` (same rewrite style); insertcoin sources are external

### Rationale
Wave 1 is ~10 substantial bodies; a dedicated module keeps `generate-games.mjs` maintainable while matching the Orb Merge port approach.

## 2026-07-28 — Push-to-production Cursor rule

### Requested files
- `.cursor/rules/push-both-repos.mdc` — when user asks to push to both repos, also Hostinger FTP + official seed when catalog/games change

### Duplicate search
- Glob `.cursor/rules/**` → none (no project rules yet)
- Grep `Hostinger|lftp|push to both|thehappylab` under `.cursor/` → none
- Closest docs: `docs/WEBAPP.md` deploy section (manual Hostinger FTP + remotes); no agent rule encoding the full ship checklist

### Rationale
User asked that “push to both repos” always include Hostinger FTP and official seed steps, not git-only.

## 2026-07-28 — Orb Merge (Drop Stack rewrite) notices

### Requested files
- `THIRD_PARTY_NOTICES` — MIT attribution for insertcoin Drop Stack (Orb Merge port)
- Updates: `scripts/generate-games.mjs` (`orbmerge` body), generated `public/games/orbmerge.html` + `src/generated/officialCatalog.ts`

### Duplicate search
- Grep `THIRD_PARTY|third.party.notices|NOTICES` under repo → none
- Glob `**/THIRD_PARTY*` / `**/LICENSE*` at root → no project-level third-party notices file (only dependency licenses elsewhere)
- Grep `orbmerge|drop-stack|Drop Stack` under `scripts/` / `public/games/` → none; existing `stack` is “Falling Stack” (different mechanic)

### Rationale
MIT requires retaining copyright/permission notice with substantial reused software; Orb Merge rewrites insertcoin Drop Stack mechanics into a GameScroll official body.

## 2026-07-28 — CSS by surface

### Requested files
- `src/styles/base.css` — tokens, document shell, route/share loading, reduced-motion
- `src/styles/feed.css` — feed chrome, cards, play overlays, swipe cues
- `src/styles/create.css` — `/create` (shared chrome also used by `/mod`)
- `src/styles/mod.css` — `/mod` list/preview
- `src/stylesBySurface.test.ts` — barrel + surface file contracts
- Updates: `src/index.css` (import barrel only), presentation/coldPath/creatorMod tests, plan

### Duplicate search
- Grep `styles/feed|styles/create|styles/mod|styles/base` under `src/` → none
- Glob `src/**/*.css` → only `src/index.css` (~1024 lines, all surfaces)
- Existing related: single host entry `import './index.css'` in `main.tsx`

### Rationale
Roadmap optional item: split host CSS by UI surface so editing cost stays low; not a runtime change (`index.css` still the Vite entry).

## 2026-07-28 — P2 creator carve + lazy mod iframes

### Requested files
- `supabase/functions/_shared/creatorLlm.ts` — system prompt, OpenAI helpers, repair/critique
- `supabase/functions/_shared/qualityGate.ts` — `checkGame` / `ensureGameQuality`
- `supabase/functions/_shared/chatTurn.ts` — `handleChatTurn` (`chat` action)
- `supabase/functions/_shared/publishDraft.ts` — `handlePublish` / `handleModerate`
- `src/creatorMod.test.ts` — source contracts for thin creator entry + lazy ModPage iframes
- Updates: `supabase/functions/creator/index.ts` (thin dispatch), `src/pages/ModPage.tsx` (IntersectionObserver + `usePlayableFrameSrc`), `src/index.css` (`.mod-frame-placeholder`), docs/plan

### Duplicate search
- Grep `handleChatTurn|ensureGameQuality|creatorLlm|qualityGate|publishDraft` under `supabase/functions` → lived only inside monolithic `creator/index.ts` (~900+ lines)
- Glob `supabase/functions/_shared/creator*` / `*quality*` / `*chatTurn*` / `*publish*` → none matching this carve (existing `_shared`: wrap, validate, smoke, layoutPlan, mechanics, patchBody, canonExamples)
- Grep `IntersectionObserver|usePlayableFrameSrc` under `src/pages/ModPage.tsx` → ModPage always mounted `<iframe src={game.src}>` per row; `usePlayableFrameSrc` already used by GameCard + CreatorPreview
- Glob `src/**/*Mod*` → only `ModPage.tsx`

### Rationale
P2 roadmap: maintainable creator Edge modules; avoid mounting every pending mod preview iframe eagerly.

## 2026-07-28 — P2 cold path: lazy routes, slim UGC selects, parallel boot

### Requested files
- `src/lib/feedBoot.ts` — parallel community + shared-slug resolution for feed boot
- `src/feedBoot.test.ts` — parallel vs skip-share cases + UGC column contracts
- `src/coldPath.test.ts` — AppRouter lazy + feedBoot wiring + no `select('*')`
- Updates: `src/AppRouter.tsx` (`React.lazy` Create/Mod), `src/lib/ugc.ts` (column lists), `src/hooks/useFeedSession.ts`, `src/index.css` (`.route-loading`), docs/plan

### Duplicate search
- Grep `React.lazy|lazy\(|Suspense` under `src/` → none
- Grep `resolveFeedBoot|UGC_FEED_COLUMNS|select\('\*'\)` under `src/lib` → only `select('*')` on ugc_games fetches; no boot helper
- Glob `src/**/*Boot*` / `src/**/*cold*` → none
- Existing: `useFeedSession` sequential community-then-slug; eager Create/Mod imports in `AppRouter.tsx`

### Rationale
P2 roadmap: smaller feed cold chunk, lighter UGC payloads, faster `?g=` deep-link boot.

## 2026-07-28 — Official catalog metadata from generator

### Requested files
- `src/generated/officialCatalog.ts` — emitted `{ id, title, tip, accent }` list (do not edit by hand)
- Updates: `scripts/generate-games.mjs` (per-game `tip`, write + `--check`), `src/games.ts` (imports generated catalog + adds `src`), `package.json` (`generate:games`, quality runs catalog `--check`), docs

### Duplicate search
- Grep `officialCatalog|generated/catalog|catalog\.generated` under `/Users/dasali/gamescroll` → none
- Glob `src/generated/**` → none
- Existing dual-touch: `src/games.ts` hand list + `scripts/generate-games.mjs` bodies/titles/bg — tips only lived in `games.ts`

### Rationale
P1 roadmap: one place to add title/tip/accent when authoring a game (the generator); host imports emitted metadata.

## 2026-07-28 — Split App.tsx into feed / play / gesture hooks

### Requested files
- `src/hooks/useFeedSession.ts` — boot, UGC community, intro reel, append/prune, activeIndex, scroll
- `src/hooks/usePlaySession.ts` — playingKey, scores, game-over, auto-restart, rail hint, cue/nudge, deploy reload
- `src/hooks/useFeedGestures.ts` — keyboard, intro cancel, nudge swipe, silent-rail swipe helpers
- `src/appShell.test.ts` — source contract that App stays a thin shell wired to the three hooks
- Updates: `src/App.tsx` thinned to composition shell; `docs/WEBAPP.md`, `README.md`, `playPresentation.test.ts`

### Duplicate search
- Grep `useFeedSession|usePlaySession|useFeedGestures` under `/Users/dasali/gamescroll` → none
- Glob `src/hooks/**` → none
- Existing related: `lib/feedWindow`, `lib/feedIntro`, `lib/playPresentation` (pure helpers); all session orchestration still lived in `App.tsx` (~704 lines)

### Rationale
P1 roadmap: split App concerns without a global store so later catalog/route work is safer.

## 2026-07-28 — Sync Deno `_shared` from `src/lib`

### Requested files
- `scripts/sync-shared.mjs` — write/check Deno twins (`wrap`, `validate`, `smoke`, `layoutPlan`, `mechanics`, `patchBody`)
- Updates: `package.json` (`sync:shared`, `quality` runs `--check`), `scripts/setup-supabase.mjs` (include telemetry migration), Deno `_shared/*` regenerated from client sources

### Duplicate search
- Grep `sync-shared|sync:shared|_shared.*keep in sync` under `/Users/dasali/gamescroll` → comments only; no sync script
- Glob `scripts/*sync*` → only Capacitor `cap:sync` in package.json; no Deno twin sync
- Existing twins: `gameWrap`↔`wrap`, `gameValidator`↔`validate`, `gameSmoke`↔`smoke`, plus identical-named layoutPlan/mechanics/patchBody — were drifting (wrap missing `.float-score`)

### Rationale
P1 roadmap: one source of truth for client ↔ Deno validation/wrap so UGC shell changes stay in parity.

## 2026-07-27 — Play presentation contract + tests

### Requested files
- `src/lib/playPresentation.ts` — symmetric play insets, rail-hint lifecycle, portrait playfield geometry
- `src/playPresentation.test.ts` — unit + CSS/App source contract for game presentation
- Updates: `src/App.tsx` (uses `shouldShowRailHint` / `shouldShowSilentSwipeRail` / `RAIL_HINT_CLASS`)

### Duplicate search
- Grep `playPresentation|playInsets|shouldShowRailHint|PLAY_INSET_SIDE|railHintVisible` under `/Users/dasali/gamescroll` → only App/CSS swipe-rail wiring; no presentation helper
- Glob `src/**/*present*|src/**/*letterbox*|src/**/*inset*` → none
- Existing related: `layoutPlan` (UGC in-game layout), `gameSmoke` letterbox smoke (canvas paint), catalogIntegrity (HTML files) — none cover host feed letterbox / dark rail lifecycle

### Rationale
Lock equal side gutters and “dark rail disappears after first game starts” so presentation regressions fail in CI.

## 2026-07-27 — Phase 1 feed telemetry batcher

### Requested files
- `supabase/migrations/20260727210000_feed_telemetry_events.sql` — anon-insert / moderator-select event table
- `src/metrics.test.ts` — batch flush, swipe heartbeat, prune gauges
- Updates: `src/metrics.ts` (`track` + batcher), `src/App.tsx`, `src/lib/usePlayableFrameSrc.ts`, `src/lib/htmlBlobCache.ts`, `.env.example`, `src/vite-env.d.ts`

### Duplicate search
- Grep `track\(|flushTelemetry|TELEMETRY|feed_telemetry|VITE_TELEMETRY` under repo → only local `trackVisit` in `src/metrics.ts`; no remote event pipeline
- Glob `supabase/migrations/*telemetry*` / `src/**/*metric*` → only `metrics.ts` (visits)
- Plan P0.5: sparse dashboard signals, not per-scroll logs

### Rationale
Phase 1 exit criteria need remote visibility; localStorage visits cannot power a dashboard.

## 2026-07-27 — Phase 1 remaining P0 helpers

### Requested files
- `src/lib/feedMessageHub.ts` — single `window` `message` listener; cards register by `event.source`
- `src/feedMessageHub.test.ts` — register / dispatch / unregister coverage
- `src/lib/htmlBlobCache.ts` — LRU (max 10) blob URL cache with revoke on eviction
- `src/htmlBlobCache.test.ts` — LRU order + revoke behavior
- `src/usePlayableFrameSrc.test.ts` — `needsHtmlBlob` routing for local vs Supabase/UGC URLs

### Duplicate search
- Grep `addEventListener('message'|registerFeedBridge|feedMessageHub` under `src/` → per-card listeners in `GameCard.tsx` (+ `CreatorPreview` for create route only); no host hub
- Grep `blobCache|revokeObjectURL|LRU` under `src/lib/` → unbounded `Map` in `usePlayableFrameSrc.ts`; revoke only in `CreatePage` for preview
- Glob `src/lib/*message*|src/lib/*blob*|src/lib/*cache*` → none

### Rationale
Phase 1 roadmap: one postMessage dispatcher, bound UGC blob cache. Pure modules keep dispatch/LRU testable without mounting the feed.

## 2026-07-27 — Feed sliding-window prune

### Requested files
- `src/lib/feedWindow.ts` — pure `appendFeedWindow` (cap ~78 items, keep-behind, scroll-index remap)
- `src/feedWindow.test.ts` — unit coverage for prune / no-prune / intro skip

### Duplicate search
- Grep `appendBatch|FEED_WINDOW|prune|sliding|feedWindow` under `/Users/dasali/gamescroll` → only unbounded `[...prev, ...next]` in `src/App.tsx`
- Glob `src/lib/*feed*` → `feedIntro.ts` only (jackpot reel), no windowing helper
- Plan Phase 1 locks custom prune (no `@tanstack/react-virtual` yet)

### Rationale
Infinite feed only appended; long sessions mount unbounded cards. Pure helper keeps prune math testable and lets App compensate `scrollTop` after DOM slice.

## 2026-07-27 — Fixed bottom like/share nav

### Requested files
- `src/components/BottomNav.tsx` — viewport-fixed Like / Share bar for the active feed game

### Duplicate search
- Grep `bottom-nav|BottomNav|like-btn|share-btn` under `/Users/dasali/gamescroll/src` → nav markup lived inside `GameCard.tsx` (`position: absolute` on each card)
- Glob `src/components/*` → GameCard, GameOverOverlay, SwipeCue, CreatorPreview; no bottom-nav / action-bar component
- Pitch mock has `.rail` like/share on cards only — not a fixed host chrome bar

### Rationale
A per-card absolute nav scrolls away and can stack if made `fixed` inside each card; one host-level fixed bar keeps like/share pinned to the screen bottom.

## 2026-07-27 — UGC idle-draw regression tests + live check

### Requested files
- `src/ugcIdleSmoke.test.ts` — catches Wordle-class blank-screen (draw before onHostStart / empty grid)
- `scripts/check-ugc-games.mjs` — smokes all approved `source=user` UGC bodies from Supabase (`npm run check:ugc`)
- Updates: `src/lib/gameSmoke.ts` + Deno `_shared/smoke.ts` (idle draw + letterboxed playfield), `scripts/fix-wordle-mini.mjs`, `package.json`

### Duplicate search
- Grep `smokeGameBody|idle draw|check-ugc|ugcIdle` → existing `gameSmoke.ts` only ran draw *after* onHostStart (missed browse-mode crash)
- Glob `src/**/*smoke*` / `scripts/check*` → no live UGC checker; closest `gameValidator.test.ts` smoke section
- Wordle lives only in Supabase `ugc_games` (no repo fixture before)

### Rationale
Blank teal Wordle was an idle-draw throw that killed rAF; smoke must mirror host boot order and CI should re-check live approved UGC.

## 2026-07-27 — Fix Wordle Mini blank screen

### Requested files
- `scripts/fix-wordle-mini.mjs` — hotfixes approved UGC Wordle Mini (boot layout + empty grid so draw does not crash)

### Duplicate search
- Grep `wordle|Wordle` under repo → none (UGC-only in Supabase `ugc_games`)
- Existing wrap/validator: `src/lib/gameWrap.ts`, `src/lib/gameValidator.ts`, `supabase/functions/_shared/wrap.ts` — no auto `layout()` after body; draw errors killed rAF
- Closest tooling: `scripts/seed-official-games.mjs`, creator Edge Function republish path

### Rationale
Wordle Mini painted a blank teal shell because `draw()` read `layoutRects` / empty `grid` before `onHostStart`, threw, and stopped the frame loop.

## 2026-07-27 — Official games in ugc_games + source column

### Requested files
- `supabase/migrations/20260727130000_ugc_games_source.sql` — `ugc_source` enum (`official` | `user`), nullable `creator_id` for official rows, seed all catalog games
- `scripts/seed-official-games.mjs` — apply migration + upload `public/games/*.html` to Storage as `official/<id>.html`

### Duplicate search
- Grep `ugc_games|ugc_source|is_official|source.*official` under `/Users/dasali/gamescroll` → table exists in `20260723120000_ugc_games.sql` with no official/user distinction; catalog lives only in `src/games.ts` + `public/games/*.html`
- Glob `supabase/migrations/*` → only the original UGC migration
- Glob `scripts/*seed*` / `scripts/*official*` → none; closest is `scripts/setup-supabase.mjs` (schema + Edge deploy) and `scripts/generate-games.mjs` (HTML generation)
- `src/lib/ugc.ts` fetches approved UGC only — no official seed path

### Rationale
Put the full official catalog in `ugc_games` alongside community games, tagged by `source`, so the table is a complete game registry.

## 2026-07-27 — Shape Slicer catalog game

### Requested files
- `public/games/slicer.html` — generated Shape Slicer minigame (draw a cut, show slice %, score closeness to 50/50, New shape)
- Updates: `scripts/generate-games.mjs` (slicer body), `src/games.ts` (catalog entry)

### Duplicate search
- Grep `slicer|Shape Slicer|split.?poly|50.?50` under `/Users/dasali/gamescroll` → none
- Glob `public/games/*` → no slicer; closest `shapes.html` is hole-matching, not area-split
- Pitch mock has no slice/cut mechanic

### Rationale
New endless catalog game: colorful polygon split by a player-drawn line, points from how close the areas are to 50/50, with on-canvas percentages and a New shape control.

## 2026-07-27 — Automatic deploy reload without hard refresh

### Requested files
- `src/updateCheck.test.ts` — URL helper coverage for cache-bust reload links
- Updates: `src/updateCheck.ts` (12s poll, `?_gsb=` replace reload, strip param on boot), `src/App.tsx` (reload on pause / next-swipe seam), `public/.htaccess` (no-cache HTML/version), `index.html` (Cache-Control meta), `docs/WEBAPP.md`

### Duplicate search
- Grep `updateCheck|version.json|_gsb|Cache-Control|reloadApp` under `/Users/dasali/gamescroll` → existing `src/updateCheck.ts` + App wiring only; no cache-bust navigation or HTML cache headers
- Glob `**/{_headers,.htaccess,vercel.json}` → only `public/.htaccess` (SPA rewrite, no cache rules)
- No service worker / workbox in repo

### Rationale
Players shouldn’t hard-refresh after deploys; faster polling plus a cache-busting navigation (and Hostinger no-cache for the shell) picks up new builds automatically, deferring only while a game is actively playing.

## 2026-07-27 — Persistent swipe cue + jackpot feed intro

### Requested files
- `src/lib/feedIntro.ts` — jackpot reel sequence, `gs_feed_intro_seen` (+ migrate `gs_swipe_coach_seen`), reduced-motion skip
- `src/components/SwipeCue.tsx` — persistent “Swipe / Next game” chrome (dims after first swipe)
- `src/feedIntro.test.ts` — unit tests for reel sequence / delays
- Updates: `src/App.tsx` (delay autoplay, reel for cold start + `?g=` shares, cue wiring), `src/index.css`, `docs/WEBAPP.md`, `README.md`
- Removed: `src/components/SwipeCoach.tsx` (blocking one-shot overlay replaced by reel + cue)

### Duplicate search
- Grep `SwipeCoach|swipe.?coach|SwipeCue|feedIntro|gs_feed_intro|gs_swipe_coach` under `/Users/dasali/gamescroll` → coach overlay + `gs_swipe_coach_seen` only; no reel helper or persistent cue component
- Pitch mock `pitch/gamescroll-ux-mock.html` has `.swipe-cue` (marketing only, not wired into React)
- Existing related UX kept: `.nudge` (post-pause), `.swipe-rail` (play-mode edge capture) — not duplicated
- Glob `src/components/*` → GameCard, GameOverOverlay, SwipeCoach, CreatorPreview; no SwipeCue
- Glob `src/lib/*` → no feedIntro / onboarding module

### Rationale
Blocking coach was easy to miss after dismiss and skipped on shares; a real-feed jackpot reel teaches “more games” visually (including `?g=`), and a persistent labeled cue keeps discoverability in browse and play.

## 2026-07-24 — Creator polish (patch edits + juice rules + anti-patterns)

### Requested files
- `src/lib/patchBody.ts` — search/replace patch application for stored game bodies (unique-match enforcement, `all` flag)
- `supabase/functions/_shared/patchBody.ts` — Deno copy (keep in sync)
- `src/patchBody.test.ts` — unit tests
- Updates: `_shared/canonExamples.ts` (`JUICE_RULES`, `ANTI_PATTERNS`), `creator/index.ts` (patch flow, chat trimming, prompt sections), `gameValidator.ts` + Deno `validate.ts` (host-owned effect checks), `gameSmoke.ts` + Deno `smoke.ts` (Proxy stubs), `docs/CREATOR.md`, `gameValidator.test.ts`

### Duplicate search
- Grep `patchBody|applyPatches|ANTI_PATTERNS|trimConversation` → nothing existing
- Grep `bodyJs|brief` → only creator/index.ts + validator/smoke helpers; no existing diff/patch mechanism (iterate always sent a full body)
- Juice/PF rules folded into existing `canonExamples.ts` rather than a new prompt file; `trimConversation` kept inline in `creator/index.ts` (single caller)

### Rationale
Polish pass: cheaper/safer small tweaks via patches, explicit effects-library contract, hard negatives for known failure modes, and shorter prompts that rely on stored code instead of long transcripts.

## 2026-07-24 — Creator medium quality (mechanics + layoutPlan + wireframe QA)

### Requested files
- `src/lib/layoutPlan.ts` — layoutPlan parse/validate, ASCII wireframe, Edge-friendly PNG preview for vision QA
- `src/lib/mechanics.ts` — mechanic family inference + template seeds
- `supabase/functions/_shared/layoutPlan.ts` / `mechanics.ts` — Deno copies (keep in sync)
- `src/layoutPlan.test.ts` — unit tests
- Updates: `creator/index.ts` (templates, layoutPlan gate, vision critique, `OPENAI_MODEL_FAST` routing), `docs/CREATOR.md`

### Duplicate search
- Grep `layoutPlan|inferMechanic|OPENAI_MODEL_FAST|mechanicTemplate|wireframe` → none existing
- Grep `smokeGame|canonExample|critiqueAndFix` → prior high-impact helpers only; extended in place rather than duplicating validators
- No Playwright/browser screenshot pipeline in repo — PNG wireframe from layoutPlan is the Edge-viable visual QA stand-in

### Rationale
Medium-impact creator upgrades: coherent mechanic skeletons, machine-checkable layout contracts, visual layout QA without a headless browser, and cheaper models for iterate/repair.

## 2026-07-24 — Creator quality gate (smoke + canon + critique)

### Requested files
- `src/lib/gameSmoke.ts` — fake-host smoke-run for UGC `bodyJs` (load → onHostStart/layout/tick/draw/pointer)
- `supabase/functions/_shared/smoke.ts` — Deno copy of gameSmoke (keep in sync)
- `supabase/functions/_shared/canonExamples.ts` — few-shot complete bodyJs examples for creator system prompt
- Updates: `gameValidator.ts` (+ Deno `validate.ts`), `creator/index.ts` quality pipeline, `gameValidator.test.ts`, `docs/CREATOR.md`

### Duplicate search
- Grep `smokeGame|canonExample|critiqueAndFix|quality critique` → no existing smoke/canon/critique helpers
- Grep `validateGameBody` → only `gameValidator.ts` / `_shared/validate.ts` / creator / tests (extended in place, no second validator)
- Catalog games under `public/games/*` are full HTML shells, not injectable bodyJs examples — new canon file is the right shape for the Edge Function prompt

### Rationale
Creator quality was prompt-only; static checks missed layout/input bugs, and there was no runtime or second-pass review before upload.

## 2026-07-24 — UGC playable HTML blob + ugc-play function

### Requested files
- `src/lib/usePlayableFrameSrc.ts` — fetch remote UGC HTML and serve via text/html blob in iframes
- `supabase/functions/ugc-play/index.ts` — public HTML play endpoint by slug
- Updates: `GameCard.tsx`, `CreatorPreview.tsx`, `ugc.ts`, `creator` upload `html_url`, `config.toml`

### Duplicate search
- Grep `text/plain|createObjectURL|ugc-play` → only CreatorPreview blob for generated previewHtml; GameCard used raw storage URLs
- Storage public objects were confirmed Content-Type `text/plain`, which renders as source

### Rationale
UGC iframes showed HTML source on dasali; Happylab lacked baked Supabase keys so deep links fell back to catalog games.

## 2026-07-24 — Creator preview host bridge

### Requested files
- `src/components/CreatorPreview.tsx` — iframe preview that posts `gamescroll:start` on `ready`
- Updates: `src/pages/CreatePage.tsx`, creator SYSTEM_PROMPT, `gameValidator` (+ Deno copy), redeployed `creator` function

### Duplicate search
- Grep `CreatorPreview|gamescroll:start` under `src/pages` / `src/components` → only `GameCard.tsx` had host start (feed), create preview was a raw iframe
- No existing create-preview bridge component

### Rationale
UGC preview never unlocked `GS.paused`, so generated “Start” UIs looked fine but did nothing; host bridge + stricter canvas-input generation rules fix playability.

## 2026-07-23 — UGC game creator (Supabase + /create)

### Requested files
- `src/lib/gameWrap.ts` — shared HTML shell + host bridge for UGC
- `src/lib/gameValidator.ts` — forbidden-API + bridge-contract checks
- `src/lib/supabase.ts` — Supabase client + UGC row types
- `src/lib/ugc.ts` — fetch/publish helpers for community games
- `src/AppRouter.tsx` — React Router (`/`, `/create`, `/mod`)
- `src/pages/CreatePage.tsx` — chatbot creator UI
- `src/pages/ModPage.tsx` — moderator approve/reject
- `src/gameValidator.test.ts` — wrap/validator unit tests
- `supabase/migrations/20260723120000_ugc_games.sql` — schema, RLS, storage
- `supabase/functions/creator/index.ts` — chat/generate/publish/moderate Edge Function
- `supabase/functions/_shared/wrap.ts` / `validate.ts` — Deno copies of wrap/validator
- `supabase/config.toml` — function JWT settings
- `public/.htaccess` — Hostinger SPA fallback for `/create`
- `docs/CREATOR.md` — setup runbook
- `.env.example` — Vite + Edge Function env names
- Updates: `src/main.tsx`, `src/App.tsx`, `src/games.ts`, `src/share.ts`, `src/index.css`, tests, `docs/WEBAPP.md`, `README.md`, `package.json`

### Duplicate search
- Glob `**/create*` / `**/creator*` / `**/ugc*` → **none** (no prior creator surface)
- Grep `supabase|openai|chatbot|react-router` in `package.json` / `src` → **none** before this change
- Glob `supabase/**` → **none**
- Existing game authoring is only `scripts/generate-games.mjs` + static `src/games.ts` (dev-only, not UGC)
- `NEW_FILE-REQUESTS.md` has no prior UGC/creator entry

### Rationale
User-published HTML5 games need Auth, Storage, an LLM Edge Function, and a `/create` route on play.thehappylab.com; none of that existed in the static SPA.

## 2026-07-23 — Regression tests and CI quality gate

### Requested files
- `vitest.config.ts` — Vitest config (happy-dom + node pool for catalog/fs checks)
- `src/games.test.ts` — catalog shape, feed keys, preferId pinning
- `src/share.test.ts` — `?g=` deep-link read/write
- `src/highscores.test.ts` — localStorage best-score persistence
- `src/experiments.test.ts` — auto-restart URL/storage/bridge mapping
- `src/catalogIntegrity.test.ts` — catalog ids ↔ `public/games/*.html` + bridge contract strings
- `.github/workflows/quality.yml` — typecheck + tests on push/PR to `main`
- Updates: `package.json` (`test`, `typecheck`, `quality`), `README.md`, `docs/WEBAPP.md`

### Duplicate search
- Glob `**/*.{test,spec}.{ts,tsx,js,mjs}` → **none**
- Glob `**/{eslint*,vitest*,jest*,playwright*,.github/**}` → **none** (no test runner, no CI)
- Grep `vitest|jest|playwright|mocha|cypress` in `package.json` → **none**
- `NEW_FILE-REQUESTS.md` has no prior test-harness entry
- Existing quality signal is only `tsc -b` inside `npm run build`

### Rationale
Pure host modules and catalog↔HTML drift are the highest-regression risks without a backend; Vitest unit tests plus a GitHub Action catch type and logic breaks before they ship to both remotes.

## 2026-07-23 — Webapp and integration documentation

### Requested files
- `docs/WEBAPP.md` — product overview, host architecture, game authoring, host↔iframe bridge, feed/share UX, Capacitor/Android, deploy domains, localStorage, fail modes
- Updates: `README.md` — link to the new doc

### Duplicate search
- Glob `**/{README,ARCHITECTURE,INTEGRATION,DOCS,docs}*.{md,mdx,txt}` under `/Users/dasali/gamescroll` → only root `README.md` (minimal install/controls) and `NEW_FILE-REQUESTS.md` (changelog of file requests, not product docs)
- No `docs/` directory
- Grep `postMessage|iframe bridge|architecture` in `*.md` → no architecture/integration guide
- Pitch mock `pitch/gamescroll-ux-mock.html` is marketing UX only, not wired documentation

### Rationale
Operators and contributors need a single reference for how the React host, sandboxed games, postMessage bridge, Android shell, and Hostinger deploy fit together; README stays a short get-started entry point.

## 2026-07-23 — Fail-mode experiment (instant replay vs game over)

### Requested files
- `src/experiments.ts` — auto-restart on/off (`gs_auto_restart`, `?autorestart=`); legacy `gs_fail_mode` / `?fail=` still read
- `src/components/GameOverOverlay.tsx` — host overlay: score, Play again, Play another (next feed game)
- Updates: `scripts/generate-games.mjs` (bridge `onFail` + `gamescroll:died`), regenerated `public/games/*.html`, `src/App.tsx`, `src/components/GameCard.tsx`, `src/index.css`

### Duplicate search
- Grep `experiment|failMode|game-over|gameover|onDied|gamescroll:died|instant.?replay|auto.?restart` under `/Users/dasali/gamescroll/src` → **none** before this change
- Grep `featureFlag|FEATURE_|A/B|cohort` → none; only `localStorage` prefs (`gs_swipe_coach_seen`, highscores, metrics)
- Death today: iframe `die()` → `reset()` inside generator wrap — **instant replay already exists in-game**; no host death event or overlay
- Pitch mock `pitch/gamescroll-ux-mock.html` has Again/Done `.done-bar` only — not wired into React product
- Glob `src/**/*experiment*` / `src/components/*Over*` → **none**
- Next/random already via `goToNextGame` + shuffled `buildFeedBatch`

### Rationale
Host-owned toggle enables/disables auto-restart on fail; games learn mode from `gamescroll:start` so on stays zero-latency in-iframe reset and off surfaces a shared game-over overlay without per-game UI.

## 2026-07-23 — Client deploy update detection + reload

### Requested files
- `src/updateCheck.ts` — poll `/version.json`, compare to injected `__BUILD_ID__`, reload when a new deploy is live
- Updates: `vite.config.ts` (emit `version.json` + define `__BUILD_ID__` at build), `src/vite-env.d.ts`, `src/App.tsx` (watch updates; defer reload while a game is playing)

### Duplicate search
- Grep `version.json|__BUILD_ID__|updateCheck|location\.reload|serviceWorker|workbox|vite-plugin-pwa` under `/Users/dasali/gamescroll` → **none** (no update channel)
- Glob `src/**/*update*` / `**/version*` → **none**
- `src/metrics.ts` tracks visits only; Capacitor embeds static `dist` (no OTA); no PWA service worker
- NEW_FILE-REQUESTS earlier note: no manifest/service-worker setup

### Rationale
Homescreen / standalone WebKit can keep a stale shell; a tiny uncached build-id file lets the client notice deploys and hard-reload once the user is not mid-game.

## 2026-07-23 — Share favorite game with deep link

### Requested files
- `src/share.ts` — build `?g=<id>` share URLs; Web Share API + clipboard fallback
- Updates: `src/games.ts` (`buildFeedBatch` can pin a game first; `getGameById`), `src/App.tsx` (consume deep link once for initial feed), `src/components/GameCard.tsx` (share control), `src/index.css`

### Duplicate search
- Grep `share|navigator\.share|URLSearchParams|searchParams|\?g=` under `/Users/dasali/gamescroll/src` → **none**
- No router / deep-link handling in `App.tsx`; feed always starts from shuffled `buildFeedBatch(0)`
- Glob `src/**/*share*` → **none**
- Pitch mock has no share affordance; Capacitor deps have no Share plugin installed
- Existing rail only has like — no outbound link/share control

### Rationale
Share needs a stable absolute URL keyed by catalog `game.id` so recipients land on that game first; host-owned helper keeps Web Share / clipboard out of iframe games and out of `GameCard` markup.

## 2026-07-22 — First-visit swipe coach overlay

### Requested files
- `src/components/SwipeCoach.tsx` — TikTok-style full-screen overlay teaching vertical swipe; persists dismiss via `localStorage`
- Updates: `src/App.tsx`, `src/index.css`

### Duplicate search
- Grep `SwipeCoach|swipe.?coach|onboard|tutorial|gs_swipe` under `/Users/dasali/gamescroll` → **none**
- Existing related UX: `.nudge` / pause “Swipe up for the next game” tip in `App.tsx` (post-pause only, not first-launch coach); `.swipe-rail` chevrons (play-mode edge affordance only); pitch mock `.swipe-cue` in `pitch/gamescroll-ux-mock.html` (marketing mock, not product)
- Glob `src/components/*` → only `GameCard.tsx`; no coach/onboarding component
- `src/metrics.ts` tracks visits/`isReturning` but does not gate UI tutorials

### Rationale
First-session overlay needs its own component + `gs_swipe_coach_seen` flag so return visits stay clean; nudge/rail remain for in-session play, not cold-start education.

## 2026-07-22 — Per-game highscores

### Requested files
- `src/highscores.ts` — localStorage get/set for best score per game id
- Updates: `scripts/generate-games.mjs` (post `gamescroll:score` on die/pause), regenerated `public/games/*.html`, `src/App.tsx`, `src/components/GameCard.tsx`, `src/index.css`

### Duplicate search
- Grep `highscore|high.?score|gs_highscores|gamescroll:score` under `/Users/dasali/gamescroll` → **none** before this change
- `src/metrics.ts` only tracks visits / games-played counts — no score persistence
- Glob `src/**/*score*` → **none**
- Iframe `sandbox="allow-scripts"` (no same-origin) cannot use localStorage inside games; host must own persistence

### Rationale
Parent-owned highscore map keyed by catalog game id; games report final/run score via postMessage so Best shows in the top bar when a score exists.

## 2026-07-22 — Playful shared canvas kit

### Requested files
- `public/lib/playful.js` — shared Canvas helpers (`PF.sky`, `PF.buddy`, `PF.block`, dots/blobs) used by all iframe games
- Updates: `scripts/generate-games.mjs` loads the kit in `wrap()` and upgrades every game’s draw style

### Duplicate search
- Grep `playful|PF\.buddy|PF\.sky` under `/Users/dasali/gamescroll` → **none** before this change
- Existing shared game libs: only `public/lib/juice.js`, `gsap.min.js`, `proton.min.js` (particles/FX, not character/world drawing)
- Glob `public/lib/*` → no playful/draw helper module
- Flappy/Tiny Fish already had inline polish; other games used flat fills — no shared draw toolkit to extend

### Rationale
One vendored helper avoids duplicating cute character/gradient drawing across 30 generated HTML games.

## 2026-07-22 — Capacitor Android sideload APK

### Requested files
- `capacitor.config.ts` — Capacitor app id/name/`webDir` for Android wrapper
- `android/` — Capacitor-generated native Android project (portrait lock in `AndroidManifest.xml`)
- `scripts/build-apk.mjs` — Gradle assembleDebug + copy to `dist-apk/gamescroll-debug.apk`
- `dist-apk/gamescroll-debug.apk` — sideloadable debug APK (gitignored build output)
- Updates: `package.json` scripts (`cap:sync`, `build:apk`), `.gitignore` (`dist-apk`)

### Duplicate search
- Glob `**/capacitor*` → **none** before this change
- Grep `manifest.json|service.?worker|@capacitor` under `/Users/dasali/gamescroll` → **no** PWA/Capacitor/Cordova/Expo setup
- Glob `android/`, `**/AndroidManifest.xml` → **none**
- No existing APK build scripts under `scripts/` (only `generate-games.mjs`)

### Rationale
Sideloadable Android APK via Capacitor WebView shell around the existing Vite `dist/`; no native rewrite of the iframe games.

## 2026-07-22 — GSAP + Proton game juice

### Requested files
- `public/lib/gsap.min.js` — vendored GSAP core (tweens / shake / score pop)
- `public/lib/proton.min.js` — vendored Proton particle engine
- `public/lib/juice.js` — shared Gamescroll juice API used by all iframe games
- Regenerated `public/games/*.html` via `scripts/generate-games.mjs` (template loads lib scripts + hooks bump/die)

### Duplicate search
- Grep `juice|proton|gsap|particle|tween|shake|burst` under `/Users/dasali/gamescroll` → only incidental swipe comments / catalog tips; **no** existing juice, particle, or tween module
- Glob `public/lib/**`, `**/juice.js`, `**/proton*`, `**/gsap*` → **none**
- `package.json` → React/Vite only; no graphics libs
- Game visuals live inline in `scripts/generate-games.mjs` + generated `public/games/*.html` (Canvas 2D primitives only)

### Rationale
Shared iframe-safe juice layer (CDN avoided: sandboxed iframes + offline); generator injects once so all 30 games get score bursts, shake, and HUD pops without per-game rewrites.

## 2026-07-22 — Animated UX pitch mock

### Requested files
- `pitch/gamescroll-ux-mock.html` — self-contained interactive pitch prototype (TikTok-style game feed mock)

### Duplicate search
Searched the workspace for existing pitch mocks, feed UI, or HTML prototypes:

- Glob `**/*.{html,tsx,jsx,css}` under `/Users/dasali/gamescroll` → **0 files**
- Glob `**/NEW_FILE-REQUESTS.md` → **none** (this file is new)
- Workspace was empty (greenfield); no duplicate feed, swipe, or mock functionality found

### Rationale
Single HTML file with inline CSS/JS is the pitch deliverable; no existing module to extend.

## 2026-07-22 — Swipeable 3-game webapp

### Requested files
- Vite + React + TS app root (`package.json`, `index.html`, `vite.config.ts`, `tsconfig*`, `src/*`)
- `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/games.ts`
- `src/components/Feed.tsx`, `src/components/GameCard.tsx`
- `public/games/flap.html`, `public/games/dodge.html`, `public/games/react.html`

### Duplicate search
- Glob `**/*` under `/Users/dasali/gamescroll` → only `pitch/gamescroll-ux-mock.html` and `NEW_FILE-REQUESTS.md`
- Pitch mock has fake canvas demos only — not a product app, feed components, or reusable game iframes
- No existing `src/`, `package.json`, or `public/games/` to extend

### Rationale
Greenfield product app per 3-hour plan; pitch mock stays separate under `pitch/`.

## 2026-07-22 — More games + infinite feed

### Requested files
- `public/games/stack.html` — timing stack game
- `public/games/aim.html` — tap moving target
- `public/games/catch.html` — catch falling orbs
- Updates to `src/games.ts`, `src/App.tsx`, `src/components/GameCard.tsx` for infinite feed items

### Duplicate search
- Glob / listed `public/games/*` → existing `flap.html`, `dodge.html`, `react.html` only
- Grep / read `src/games.ts` catalog → 3 entries; no stack/aim/catch
- Pitch mock has canvas demos but not reusable iframe games; no infinite-feed logic in `src/App.tsx`

### Rationale
New game files needed; feed will cycle catalog with unique instance keys rather than a hard end.

## 2026-07-22 — Autoplay, pause, nudge, 30-game catalog

### Requested files
- `src/metrics.ts` — session games-played + recurring visit tracking (`localStorage`)
- `scripts/generate-games.mjs` — generator for the 30 canvas iframe games + shared postMessage bridge
- `public/games/{pong,flappy,lanes,stack,orbit,ski,gravity,bubbles,helix,road,balloon,colour,doodle,tunnel,shield,pulse,snake,cross,catch,ridge,wall,fish,dance,balance,shapes,rain,magnet,comet,light,breakout}.html`
- Updates to `src/games.ts`, `src/App.tsx`, `src/components/GameCard.tsx`, `src/index.css`, `README.md`
- Removed obsolete: `public/games/{flap,dodge,react,aim}.html` (replaced by new catalog ids)

### Duplicate search
- Glob `public/games/*` → prior 6 games (`flap`, `dodge`, `react`, `stack`, `aim`, `catch`); remapped/replaced rather than duplicated
- Grep `gamescroll:start|metrics|nudge` under `src/` → none before this change
- Pitch mock (`pitch/gamescroll-ux-mock.html`) has inline demos only — not reusable product iframes or metrics
- No existing `src/metrics.ts` or `scripts/generate-games.mjs`

### Rationale
Host UX (autoplay / Pause / next nudge) needs a postMessage bridge and metrics module; 30 distinct endless games require new HTML files (generator keeps bridge + restart rules consistent).
