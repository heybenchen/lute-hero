---
name: verify
description: Build, run, and drive Lute Hero end-to-end to verify changes at the UI surface.
---

# Verifying Lute Hero changes

## Build & launch

```bash
npm install            # node_modules is often missing in fresh containers
npm run build          # tsc + vite build
npm run dev            # Vite dev server on http://localhost:5173
```

## Drive with Playwright

Playwright is a devDependency; the browser lives at `/opt/pw-browsers/chromium`:

```js
import { createRequire } from 'module'
const require = createRequire('/path/to/lute-hero/package.json')
const { chromium } = require('playwright')
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

## Useful flows & gotchas

- Fresh game: `localStorage.clear()`, reload, click the start button on the Setup screen.
- Board tiles are `button[title="<space name>"]`; player 1 starts at space 0 ("The Forgotten Stage").
- To manipulate game state from the page (grant EXP, read positions), import the app's own
  store module through Vite — it's the same instance the app uses:
  ```js
  await page.evaluate(async () => {
    const mod = await import('/src/store/index.ts')
    mod.useGameStore.getState().awardPlayerExp('player-1', 100)
  })
  ```
- Open the shop via the "Studio (N EXP)" button in the right-hand player panel.
- Pixel-diff screenshots are unreliable: valid-move tiles have a pulsing glow animation.
  Assert on `getBoundingClientRect()` / computed transforms instead.
- `npm run lint` is broken repo-wide (ESLint 9 installed but no `eslint.config.js`).
