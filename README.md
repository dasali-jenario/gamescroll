# Gamescroll

Vertical feed of tiny HTML games. On every launch a short jackpot-style reel shows more games, then the landing game autoplays. Pause opens an end-round-style panel (resume, like, share, play another); shuffle jumps to a random game.

```bash
npm install
npm run dev
```

Open the local URL. After the intro reel, the landing game autoplays. Use the centered **Play / Pause** control in the bottom nav (or Esc) to pause; **Resume** continues without resetting. Switch games with a big vertical fling, the right-edge swipe strip, ↓ / J and ↑ / K, or the bottom-left **shuffle** button. Like and Share live on the pause / game-over panel. A brief **Swipe** cue appears after the intro so the feed stays discoverable.

Official games are authored in `scripts/generate-games.mjs` (`title`, `tip`, `bg`, `body`). Run `npm run generate:games` to refresh HTML and `src/generated/officialCatalog.ts` — the host catalog imports that file (no hand-duplicated metadata).

For architecture, the host↔game bridge, Android, and deploy domains, see [docs/WEBAPP.md](docs/WEBAPP.md).

Create your own games at **/create** (product URL: [play.thehappylab.com/create](https://play.thehappylab.com/create)) — see [docs/CREATOR.md](docs/CREATOR.md). That route (and `/mod`) loads on demand so the main feed stays a smaller first download.

```bash
npm run quality   # typecheck + unit tests + Deno _shared sync check + catalog check
npm test          # Vitest only
npm run sync:shared  # regenerate supabase/functions/_shared from src/lib
npm run generate:games  # write public/games HTML + src/generated/officialCatalog.ts
```
