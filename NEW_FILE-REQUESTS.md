# New file requests

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
