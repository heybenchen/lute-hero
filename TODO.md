# Lute Hero — TODO

## High Priority

- [ ] Update all songs to only have one effect
- [ ] Make it so that all players have 4 songs by default which they can slot dice into, but with no effects or song titles. Buying the song title is what adds the effect.

## Medium Priority

- Fix `npm run lint`: ESLint 9 is installed but the repo has no `eslint.config.js` (flat config), so lint fails before checking any files

## Low Priority

(none)

## Completed

- Board is a 4x4 grid (16 spaces) with orthogonal-adjacency movement; the 4 corners are the starting spaces, maximally far apart (also satisfies the "4 starting spaces far apart" request). Grid renders as a responsive CSS grid of aspect-square tiles.
- Mobile-friendly layout: board + player panel stack vertically below `lg` and the page scrolls; board tiles, modals (Studio/Combat), and the title bar scale down responsively; board legend hidden on small screens (tile dots + hint carry the info). No horizontal overflow at 390px.
- Element store draws from a bag: 6 chips per element per player, 4 shown at a time; "Draw New" discards the shown chips and pulls fresh ones; when the bag empties the discard is reshuffled back in. d20 upgrade now costs 30 EXP.
- Board readability pass (ported from PR #16 onto the tile board): genre tags render as color-coded dot chips grouped with counts instead of emoji piles (addresses "make map colors more distinct"), board legend explains tile states and genre colors, dot-grid map texture, starting spaces get a distinct border + smaller S badge, skull monster icon, shared genre theme module (`src/data/genreTheme.ts`) keeps board and shop colors/emojis in sync

- UI polish pass: staggered tile entrance + framed map with hover-to-preview path connections and hint line, gradient buttons with hover lift/press states and focus rings, blurred modal backdrop with springy entrance, per-element themed shop cards with selection glow, pulsing fight button and danger glow on monster tiles, bobbing player token, fame bar sheen; fixed monster tooltip rendering dim/under neighboring tiles

- Board is now a static tile grid: removed all zoom/pan/wheel interactions and the SVG connection canvas; the 14 spaces render as fixed tiles in 3 rows mirroring the old map layout
- Elemental dice store: replaced the random "Find Inspiration" dice market with 4 element cards (Ballad 🔥, Folk 🌿, Hymn 💨, Shanty 🌊); picking an element lets you buy a new d4 (5 EXP) or upgrade an existing die of that element (→d6: 10 EXP, →d12: 20 EXP, →d20: 20 EXP); removed the inspiration pool, re-roll costs, and fame-gated dice tiers

- Retreat removes defeated monster genre tags: when retreating, genre tags equal to each defeated monster's level are removed from the space (e.g., defeating a level 4 wind monster removes 4 wind tags)
- Fix app crash on load: node_modules was missing; running `npm install` restores all dependencies and resolves the build/load failure
- Balance & UI polish: d12 icon changed to dodecahedron (pentagon), resistance deals 0x damage (immune), d12/d20 costs increased to 20/30 EXP, studio shows 3 song name cards in a row, retreat adds genre tags for surviving monsters, boss phase waits for equal turns
- Game balance overhaul: replaced d8 with d20 (upgrade path d4→d6→d12→d20), starter dice changed to 1 d4 + 1 d6, dice costs rebalanced (5/10/15/20 EXP), d12/d20 gated behind 25/50 fame per player, removed underground phase (main→finalBoss at 100 fame/player), buffed all song effects ~50%
- Cascading crits: rolling max value on a die now rolls an additional die of the same type (can cascade repeatedly); replaces flat +4 crit bonus; removed redundant "explosive" track effect
- Players start with 3 untitled songs (first has 2 dice, others empty); buy "names" to grant effects instead of buying songs
