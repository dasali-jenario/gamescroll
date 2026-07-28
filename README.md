# Gamescroll

Vertical feed of tiny HTML games. On every launch a short jackpot-style reel shows more games, then the landing game autoplays. Pause anytime, then swipe to the next.

```bash
npm install
npm run dev
```

Open the local URL. After the intro reel, the landing game autoplays. **Pause** (or Esc) freezes play. Switch games while playing with a big vertical fling anywhere, the right-edge swipe strip, or ↓ / J and ↑ / K. A brief **Swipe** cue appears after the intro so the feed stays discoverable.

For architecture, the host↔game bridge, Android, and deploy domains, see [docs/WEBAPP.md](docs/WEBAPP.md).

Create your own games at **/create** (product URL: [play.thehappylab.com/create](https://play.thehappylab.com/create)) — see [docs/CREATOR.md](docs/CREATOR.md).

```bash
npm run quality   # typecheck + unit tests + Deno _shared sync check
npm test          # Vitest only
npm run sync:shared  # regenerate supabase/functions/_shared from src/lib
```
