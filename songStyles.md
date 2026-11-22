# Song Styles

A reference for every style in the Studio: what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> **Keep this file in sync.** If you change a style's logic, rule text, price or a style tunable's default, or add or remove a style, update this file in the same change. The code carries notes pointing here; see [Where the logic lives](#where-the-logic-lives).

## How styles work

- A style changes how **all** of a bard's songs play. A bard holds at most **2** (`maxStyles`).
- The Studio shelf shows **2** offers (`styleOfferCount`). Empty slots refill at the start of every turn, and Inspiration redraws the shelf (`REFRESH_STYLE_OFFERS`). Buying at the cap replaces a style the bard names.
- Prices are in EXP and every price is a tunable (`styleCostKey(id)` gives its key, e.g. `styleCostHometownHero`).
- "Once per turn" styles fire automatically the first time they apply. The two exceptions are buttons: Nimble Fingers (a free reroll) and Rallying Cry (choose a spent song to refresh after a tame).
- "Can't crit": the bonus is added on top of the die after it is rolled. It never changes the face, so it can't make a die crit. "Can crit": the bonus counts toward the face, so it can reach the crit face.
- Featured songs (borrowed from another bard) roll without styles.

## How strength is measured

Run `OPP=1 ROUND=5 STYLES=<id> npx tsx scripts/style-audit.ts 600`. It plays 3-bard games with smart bots in every seat, through the real engine and the Final Showdown:

- **Real timing.** Bots buy their first style in **round 5** (middle half rounds 4–6) and a second in round 7. Nobody has spare EXP earlier, because everything goes into dice upgrades (`npx tsx scripts/style-timing.ts` measures this). The tested bard gets the style on their shelf from round 5 and buys it at its **real price** the first turn they can afford it, ahead of dice upgrades, so the EXP cost is really paid.
- **Shopping rivals.** The other two bards shop for styles like anyone (real prices, whatever the smart bot values). So a style is judged against what bots naturally buy.
- **What "balanced" means.** Three seats means a third of games (**33.3%**). A balanced style is as good as the typical choice, so it wins about a third. The no-style row (everyone shopping naturally) wins 35.2% in the final run, because the tested seat is a random one. At 600 games one result carries about ±2 points of noise, so only differences over about 4 points mean anything. The goal is every style within 4 points of the middle (roughly 29–38%).

Earlier rounds of this work judged styles with rivals who had no styles, or with the style owned from round 1. Both flatter every style and rank them differently. Those numbers are history, not guidance.

## All styles (current values)

**Price** is the default in EXP; **was** is the price before the latest rebalance. **Win %** is the tested bard's win rate against two shopping rivals (parity is 33.3%), 600 games, from round 5.

### Original styles

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Rallying Cry** | `staccato` | 2 (2) | Once per turn, after one of your songs tames a monster, refresh a spent d4 or d8 song of your choice. | `staccatoMaxFaces` (8) | 32.4 |
| **Extra Verse** | `coda` | 1 (1) | Gain a 7th song slot. Losing the style returns that song's die as an unclaimed reward. | — | 30.1 |
| **War Drums** | `ostinato` | 2 (2) | All your dice crit one number lower (a d4 on a 3, a d20 on a 19). Bonus dice from a crit still need the top face to keep chaining. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4 = top face only) | 34.3 |
| **Nimble Fingers** | `rubato` | 1 (2) | Twice per turn, reroll any song for free. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (2) | 28.8 |
| **Master's Touch** | `virtuoso` | 2 (4) | Once per turn, your first d8, d12 or d20 roll is rolled twice; keep the higher. | `virtuosoMinFaces` (8, was 12) | 31.6 |
| **Dragon's Roar** | `fortissimo` | 2 (4) | +2 to every d20 roll. A d20 that reaches 20 this way crits. | `fortissimoBonus` (2) | 33.6 |
| **Lingering Note** | `fermata` | 3 (4) | Once per turn, a d20 song that doesn't tame its target isn't spent, for 1 Inspiration. Without the Inspiration, the song is spent as usual. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 34.5 |
| **Dissonance** | `counterpoint` | 1 (2) | Once per turn, a roll against an immune target deals full damage. | `counterpointMultiplier` (1) | 31.9 |
| **Harmony** | `tutti` | 2 (4) | If your setlist holds all four elements, +3 to your first roll each turn (can't crit). | `tuttiBonus` (3), `tuttiElements` (4) | 30.3 |
| **Fanfare** | `overture` | 2 (3) | +2 to your first roll each turn (can't crit). | `overtureBonus` (2) | 32.8 |
| **Crowd Favorite** | `bravo` | 4 (3) | +10 Fame for every Lv3+ monster you tame. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 32.9 |
| **Muse's Favor** | `ispirato` | 1 (3) | Gain 3 Inspiration at the start of each turn. | `ispiratoPerTurn` (3, was 1), `ispiratoMin` (1, the floor it tops up to) | 36.8 |

### Promoted from the style lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables.

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Hometown Hero** | `hometown-hero` | 1 (2) | Dice of your starting element get +1 (can crit). | `hometownHeroBonus` (1) | 34.3 |
| **Small Ensemble** | `small-ensemble` | 4 (3) | Your d4s and d8s roll twice; keep the higher. | `smallEnsembleMaxFaces` (8) | 37.7 |
| **Studio Regular** | `studio-regular` | 2 (2) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 36.8 |
| **Inspired Play** | `inspired-play` | 3 (3) | +2 to every die while you hold 3+ Inspiration (can't crit). | `inspiredPlayBonus` (2), `inspiredPlayMin` (3) | 37.6 |
| **Double Time** | `double-time` | 2 (3) | Once per turn, a die rolls twice; keep the higher. It always applies to the first die you roll that turn. | — | 31.7 |
| **Chain Reaction** | `chain-reaction` | 2 (3) | +2 per same-element song played in a row before this one (max +6, can't crit). | `chainReactionBonus` (2), `chainReactionCap` (6) | 31.5 |
| **Swarm Singer** | `swarm-singer` | 2 (2) | +2 to every die in fights with 3+ monsters (can't crit). | `swarmSingerBonus` (2), `swarmSingerMin` (3) | 33.9 |
| **Jam Session** | `jam-session` | 2 (3) | +2 to every die while you share a space with another bard (can't crit). | `jamSessionBonus` (2) | 31.0 |

All 20 land between **28.8% and 37.7%**; the middle of the pack is about 33%.

## What the latest rebalance changed

Applied together after the realistic-timing re-test, then tuned against shopping rivals:

| Style | Change | Why |
|---|---|---|
| Fanfare | 3 → 2 EXP | Unaffordable for what it did |
| Harmony | 4 → 2 EXP | Same |
| Hometown Hero | 2 → 1 EXP | Same |
| Dissonance | 2 → 1 EXP | Same |
| Nimble Fingers | 2 → 1 EXP | Same |
| Chain Reaction | 3 → 2 EXP | Same |
| Master's Touch | 4 → 2 EXP, and d8s too (`virtuosoMinFaces` 12 → 8) | A price cut alone left it at 35% unopposed; covering d8s fixed it |
| Muse's Favor | 3 → 1 EXP, and +3 Inspiration a turn (was +1) | +1 a turn was the weakest style at any price |
| Dragon's Roar | 4 → 2 EXP | Weak against shopping rivals |
| Lingering Note | 4 → 3 EXP | Slightly weak once rivals have styles |
| Double Time | 3 → 2 EXP | Same |
| Crowd Favorite | 3 → 4 EXP | Strong against shopping rivals (41.3% at 3) |
| Small Ensemble | 3 → 4 EXP | Strong against shopping rivals (about 39% at 3) |
| Jam Session | 3 → 2 EXP | Situational (needs another bard on your space) |

Earlier in the same work, before the timing correction: Crowd Favorite became +10 Fame at Lv3+, Lingering Note became d20-only for 1 Inspiration, Dissonance became full damage once per turn, Nimble Fingers got two rerolls and covers any die, Rallying Cry refreshes d4/d8 songs, Harmony became +3, War Drums makes every die crit one number lower, and Muse's Favor started gaining Inspiration every turn.

## Sweeps against shopping rivals

Win % (400 games, from round 5) at different prices. Parity is 33.3%.

| Style | Prices tried → win % |
|---|---|
| Crowd Favorite | 3 → 41.3 · 4 → 35.6 · 5 → 37.4 |
| Double Time | 3 → 29.0 · 2 → 32.3 |
| Dragon's Roar | 4 → 28.9 · 3 → 31.9 · 2 → 34.9 |
| Lingering Note | 4 → 30.0 · 3 → 35.8 · 2 → 39.3 |
| Muse's Favor | +2/turn at 1 EXP → 31.0 (400 games) · +3/turn at 1 EXP → 34.5 |
| Small Ensemble (600 games) | 4 → 37.7 · 5 → 31.7 |
| Jam Session (600 games) | 1 → 33.0 · 2 → 31.0 |

Alternatives tried earlier, mostly measured with rivals that held no styles, so read them as rough: War Drums with bonus dice chaining one lower on all dice 50.0% held from round 1 (not shipped); War Drums on d4s only 36.7%, and d4s only with chaining 34.5%; Lingering Note on any die for 1 Inspiration 50.3%, for 2 Inspiration 38.2%; Dissonance at ¾ damage 42.8%.

## Where the logic lives

| What | File |
|---|---|
| Catalog (names, flavor), prices, live rule text (`styleRule`) | `src/data/styles.ts` |
| Every number (prices, bonuses, limits), in the **Styles** group | `src/data/tunables.ts` |
| Built-in roll effects (War Drums, Master's Touch, Dragon's Roar, Fanfare, Harmony), Lingering Note, Dissonance, Nimble Fingers, Rallying Cry and Crowd Favorite helpers | `src/game-logic/styles/styleEffects.ts` |
| Spec-based Studio styles (`studioSpec`), plus `specsOf` | `src/data/styleSpecs.ts` |
| The generic spec engine (conditions, roll modifiers, rewards, economy) | `src/game-logic/styles/specs.ts` |
| Applying styles in fights, the showdown, turn start (Muse's Favor), rewards (Crowd Favorite), rerolls and rallies | `src/engine/reducer.ts` |
| Legality (free rerolls, rally size limit) | `src/engine/validate.ts` |
| Prices after spec discounts (Studio Regular) | `src/engine/economy.ts` |
| How the smart bot values and plays each style | `src/sim/smartBot.ts`, `src/sim/odds.ts` |
| Tests | `src/engine/styles.test.ts`, `src/engine/styleSpecs.test.ts` |

## Re-running the numbers

```bash
OPP=1 ROUND=5 STYLES=jam-session npx tsx scripts/style-audit.ts 600
```

```bash
OPP=1 ROUND=5 STYLES=virtuoso TUNE='{"styleCostVirtuoso":3}' npx tsx scripts/style-audit.ts 600
```

```bash
npx tsx scripts/style-timing.ts 200
```

Add `none` to `STYLES` for the all-shopping baseline. Drop `OPP=1` for the easier "rivals hold no styles" test.

The 100 experimental styles that haven't been promoted, and the older rebalance history, are in [`docs/style-lab-report.md`](docs/style-lab-report.md).
