# Gamescroll

Vertical feed of tiny HTML games. The first game autoplays; Pause anytime, then swipe to the next.

```bash
npm install
npm run dev
```

Open the local URL. The first game autoplays. **Pause** (or Esc) freezes play. Switch games while playing with a big vertical fling anywhere, the right-edge rail, the ↑ / ↓ buttons in the top bar, or ↓ / J and ↑ / K.

For architecture, the host↔game bridge, Android, and deploy domains, see [docs/WEBAPP.md](docs/WEBAPP.md).

```bash
npm run quality   # typecheck + unit tests
npm test          # Vitest only
```
