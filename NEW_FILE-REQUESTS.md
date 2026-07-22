# New file requests

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
