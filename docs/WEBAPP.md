# Gamescroll — webapp and integration

Gamescroll is a TikTok-style vertical feed of tiny HTML/canvas minigames. The React host owns browsing, play/pause, scores, and share; each game runs in a sandboxed iframe and talks to the host over `postMessage`.

**Live domains**

| Domain | Role |
|--------|------|
| [gamescroll.dasali.me](https://gamescroll.dasali.me) | Primary web deploy (Hostinger) |
| [play.thehappylab.com](https://play.thehappylab.com) | Product / Happylab surface |

Share links use the current origin (`window.location`), so both domains deep-link the same way (`?g=<gameId>`).

---

## Stack

| Layer | Choice |
|-------|--------|
| UI | React 19 + TypeScript |
| Bundler | Vite 7 |
| Native | Capacitor 8 (Android only) |
| Games | Static HTML + canvas in `public/games/` + approved UGC from Supabase Storage |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) for the game creator |
| Creator | [play.thehappylab.com/create](https://play.thehappylab.com/create) — see [CREATOR.md](CREATOR.md) |

```bash
npm install
npm run dev          # Vite local
npm run build        # tsc + vite → dist/
npm run cap:sync     # build + sync Android
npm run build:apk    # debug APK → dist-apk/
```

Regenerate game HTML after editing the generator:

```bash
node scripts/generate-games.mjs
```

---

## Architecture

```mermaid
flowchart TB
  subgraph host [React host]
    App[App.tsx feed and play state]
    Card[GameCard.tsx]
    Catalog[games.ts catalog]
    Store[localStorage highscores metrics prefs]
    App --> Card
    App --> Catalog
    Card --> Store
  end

  subgraph iframe [Sandboxed game iframe]
    Bridge[GS bridge]
    Body[Game body tick draw]
    Juice[juice.js playful.js]
    Bridge --> Body
    Body --> Juice
  end

  Card -->|"gamescroll:start / pause"| Bridge
  Bridge -->|"ready playing score died swipe-*"| Card
```

### Host (`src/`)

| File | Role |
|------|------|
| `App.tsx` | Infinite feed, play/pause, swipe, game-over, coach, deploy reload |
| `games.ts` | Catalog of games (`id`, `title`, `tip`, `src`, `accent`) |
| `components/GameCard.tsx` | iframe load + bridge + like/share rail |
| `components/GameOverOverlay.tsx` | Fail UI when auto-restart is off |
| `components/SwipeCoach.tsx` | First-visit swipe tutorial |
| `share.ts` | `?g=` deep links + Web Share / clipboard |
| `highscores.ts` | Per-game best scores |
| `metrics.ts` | Anonymous visit counters |
| `experiments.ts` | Auto-restart preference ↔ iframe `onFail` |
| `updateCheck.ts` | Poll `/version.json` and reload when idle |

### Games (`public/games/` + generator)

| Path | Role |
|------|------|
| `scripts/generate-games.mjs` | Source of truth for game logic + shared bridge |
| `public/games/<id>.html` | Generated pages loaded by iframes |
| `public/lib/{gsap,proton,juice,playful}.js` | Shared FX / drawing helpers inside iframes |

---

## Game catalog and authoring

1. Implement a game body in the `games` object in `scripts/generate-games.mjs`.
2. Register the same `id` in `src/games.ts` with `src: '/games/<id>.html'`.
3. Run `node scripts/generate-games.mjs` to write/update HTML (and remove obsolete files listed in the generator).

The host feed is a shuffled batch of the full catalog (`buildFeedBatch`). Near the end of the list, another batch is appended so the scroll feels endless.

Iframes load only for the active card and its immediate neighbors (`isActive || isPlaying`), with `sandbox="allow-scripts"` (no same-origin storage inside games).

---

## Host ↔ game bridge

Messages use the `gamescroll:` prefix. Origin is `'*'` (static same-site iframes).

### Game → host

| Type | Payload | When |
|------|---------|------|
| `gamescroll:ready` | — | Bridge finished init |
| `gamescroll:playing` | — | First successful start (emitted; host does not require it) |
| `gamescroll:score` | `{ score }` | Score updates / pause halt |
| `gamescroll:died` | `{ score }` | Fail when `onFail === 'gameover'` |
| `gamescroll:swipe-next` | — | Strong vertical fling up |
| `gamescroll:swipe-prev` | — | Strong vertical fling down |

### Host → game

| Type | Payload | When |
|------|---------|------|
| `gamescroll:start` | `{ onFail?: 'replay' \| 'gameover' }` | Enter play / play again |
| `gamescroll:pause` | — | Leave play / pause |

**Typical play session**

1. Card becomes playing → iframe loads → game posts `ready`.
2. Host posts `start` with `onFail` from the auto-restart preference.
3. Game unpauses, posts `playing`, reports `score` while running.
4. On fail: either in-iframe reset (`replay`) or `died` + host overlay (`gameover`).
5. Strong vertical flings inside the iframe forward `swipe-next` / `swipe-prev` so the feed can move even while the iframe captures pointers.

In-iframe swipe thresholds: distance ≥ `max(140, 0.22 × height)`, duration ≤ 350ms, and vertical dominance `|dy| ≥ dx × 2.2`.

---

## Feed, controls, and share

- CSS snap feed (`.feed`); while playing, scroll is locked.
- Switch games: iframe fling, right-edge swipe rail, top-bar ↑/↓, keys `↓`/`j` and `↑`/`k`.
- **Pause** / Esc freezes the current game; after pause, a nudge encourages swiping to the next card.
- First visit (no share link): `SwipeCoach` until dismissed (`gs_swipe_coach_seen`).

### Deep links

```
https://gamescroll.dasali.me/?g=flappy
https://play.thehappylab.com/?g=pong
```

`readSharedGameId()` pins that catalog id first in the feed and autoplays it. Share uses `navigator.share` or clipboard copy of the absolute `?g=` URL.

### Query prefs

| Param | Effect |
|-------|--------|
| `?autorestart=1\|0` | Force auto-restart on/off (persisted) |
| `?fail=replay\|gameover` | Legacy alias for the same |

---

## Fail modes (auto-restart)

| Auto-restart | `onFail` | On die |
|--------------|----------|--------|
| On (default) | `replay` | Game resets inside the iframe; no host overlay |
| Off | `gameover` | Game posts `died`, host shows `GameOverOverlay` (Play again / Play another) |

Preference resolution: URL → `localStorage` (`gs_auto_restart`, legacy `gs_fail_mode`) → default `true`.

---

## Persistence (`localStorage`)

Owned by the host (sandboxed games cannot use storage).

| Key | Purpose |
|-----|---------|
| `gs_highscores` | Best score per game id |
| `gs_uid` | Anonymous visitor id |
| `gs_visits` / `gs_last_seen` | Daily visit counting |
| `gs_auto_restart` | Auto-restart preference |
| `gs_fail_mode` | Legacy fail-mode preference |
| `gs_swipe_coach_seen` | Coach dismissed |

Likes in the rail are in-memory only for the session.

---

## Android (Capacitor)

| Item | Value |
|------|--------|
| Config | `capacitor.config.ts` |
| App id | `com.gamescroll.app` |
| Web assets | `webDir: dist` |
| Orientation | Portrait (`AndroidManifest.xml`) |

```bash
npm run build:apk
```

Produces a debug APK under `dist-apk/`. The native shell embeds the built static site (no OTA). APK build expects a local Android SDK / JDK (`ANDROID_HOME` / `JAVA_HOME`).

---

## Deploy and update channel

There is no in-repo CI. Typical web deploy:

1. `npm run build`
2. Upload `dist/` to Hostinger FTP (`gamescroll.dasali.me`)

Credentials live in gitignored `.env.local` (`HOSTINGER_FTP_*`, Supabase admin tokens).

Production Vite builds also read committed `.env.production` for the **public** Supabase URL + anon key (safe with RLS). Happylab’s auto-deploy needs that so `/create` and UGC deep links work without copying `.env.local` onto the build server.

Each Vite build emits `/version.json` and injects `__BUILD_ID__`. The client polls every 60s (`updateCheck.ts`) and hard-reloads when a new build is live **and** the user is not mid-game.

Git remotes in use:

- `origin` → `dasali-jenario/gamescroll`
- `thehappylab` → `thehappylab/gamescroll`

---

## Adding or changing a game

1. Edit or add the game body in `scripts/generate-games.mjs`.
2. Keep `src/games.ts` in sync (add/remove catalog entry, tip, accent).
3. Run `node scripts/generate-games.mjs`.
4. Smoke-test in the feed (`npm run dev`), including pause, score, fail, and swipe.
5. Run `npm run quality` so catalog↔HTML integrity and host unit tests still pass.

To remove a game, delete the catalog entry, remove the generator block, and add the HTML filename to the generator’s `obsolete` list so regenerating cleans `public/games/`.

---

## User-generated games

Players can build single-player HTML5 games via the chatbot at `/create` ([setup](CREATOR.md)).

| Status | Visibility |
|--------|------------|
| `draft` | Creator only |
| `published` | Creator + anyone with `?g=<slug>` (not in main feed) |
| `approved` | Interleaved into the swipe feed |
| `rejected` | Creator can iterate and republish |

UGC HTML must pass the same host bridge contract and forbid multiplayer / network / saved-state APIs (`src/lib/gameValidator.ts`).

---

## Quality checks

| Command | What it runs |
|---------|----------------|
| `npm run typecheck` | `tsc -b` (app sources; `*.test.ts` excluded) |
| `npm test` | Vitest unit tests under `src/**/*.test.ts` |
| `npm run quality` | typecheck then tests (also the CI job) |

Coverage today:

- Catalog shape, feed keys, share deep links, highscores, auto-restart prefs
- Catalog ids ↔ `public/games/*.html`, bridge message contract, culled games stay gone
- UGC wrap/validator (forbidden APIs + bridge snippets)

CI: [`.github/workflows/quality.yml`](../.github/workflows/quality.yml) runs `npm run quality` on push/PR to `main`.
