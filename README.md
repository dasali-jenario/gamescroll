# Gamescroll

Vertical feed of tiny HTML games. A short jackpot-style reel shows more games on first visit, then the landing game autoplays. Pause anytime, then swipe to the next.

```bash
npm install
npm run dev
```

Open the local URL. After the intro (skipped on return visits), the landing game autoplays. **Pause** (or Esc) freezes play. Switch games while playing with a big vertical fling anywhere, the right-edge rail, or ↓ / J and ↑ / K. A persistent **Swipe** cue stays on screen so the feed stays discoverable.

For architecture, the host↔game bridge, Android, and deploy domains, see [docs/WEBAPP.md](docs/WEBAPP.md).

Create your own games at **/create** (product URL: [play.thehappylab.com/create](https://play.thehappylab.com/create)) — see [docs/CREATOR.md](docs/CREATOR.md).

```bash
npm run quality   # typecheck + unit tests
npm test          # Vitest only
```
