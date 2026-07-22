# New file requests

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
