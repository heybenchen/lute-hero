# Song Styles

A reference for every style in the Studio: what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> The same information is on the **`/songbook`** page of the app (`src/songbook/`). It reads rules, prices and settings live from the code, so only the win rates and "was" prices in `src/songbook/data.ts` need updating by hand along with this file.

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
- **What "balanced" means.** Three seats means a third of games (**33.3%**). A balanced style is as good as the typical choice, so it wins about a third. The no-style row (everyone shopping naturally) wins 33.5% in the final run. At 800 games one result carries about ±1.7 points of noise (±3.4 at two sigma), and the tested style's own results swing a little more than that between runs, so only gaps over about 4 points mean anything. The goal is every style within about 4 points of the middle (roughly 32–39%).

Earlier rounds of this work judged styles with rivals who had no styles, or with the style owned from round 1. Both flatter every style and rank them differently. Those numbers are history, not guidance.

## All styles (current values)

**Price** is the default in EXP; **was** is the price before the latest rebalance (the one that followed the target-lock merge). **Win %** is the tested bard's win rate against two shopping rivals (parity is 33.3%, the no-style baseline is 33.5%), 800 games, from round 5.

### Original styles

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Rallying Cry** | `staccato` | 1 (2) | Once per turn, after one of your songs tames a monster, refresh a spent song of your choice. | `staccatoMaxFaces` (20 = any die, was 8) | 35.3 |
| **Extra Verse** | `coda` | 1 (1) | Gain a 7th song slot. Losing the style returns that song's die as an unclaimed reward. | — | 32.6 |
| **War Drums** | `ostinato` | 2 (2) | All your dice crit one number lower (a d4 on a 3, a d20 on a 19). Bonus dice from a crit still need the top face to keep chaining. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4 = top face only) | 37.1 |
| **Nimble Fingers** | `rubato` | 1 (1) | Twice per turn, reroll any song for free. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (2) | 34.4 |
| **Master's Touch** | `virtuoso` | 2 (2) | Once per turn, your first d8, d12 or d20 roll is rolled twice; keep the higher. | `virtuosoMinFaces` (8, was 12) | 35.1 |
| **Dragon's Roar** | `fortissimo` | 2 (2) | +2 to every d20 roll. A d20 that reaches 20 this way crits. | `fortissimoBonus` (2) | 36.0 |
| **Lingering Note** | `fermata` | 3 (3) | Once per turn, a d20 song that doesn't tame its target isn't spent, for 1 Inspiration. Without the Inspiration, the song is spent as usual. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 35.1 |
| **Dissonance** | `counterpoint` | 2 (1) | Once per turn, a roll against an immune target deals full damage. | `counterpointMultiplier` (1) | 35.8 |
| **Harmony** | `tutti` | 1 (2) | If your setlist holds all four elements, +4 to your first roll each turn (can't crit). | `tuttiBonus` (4, was 3), `tuttiElements` (4) | 38.4 |
| **Fanfare** | `overture` | 2 (2) | +3 to your first roll each turn (can't crit). | `overtureBonus` (3, was 2) | 35.5 |
| **Crowd Favorite** | `bravo` | 3 (4) | +10 Fame for every Lv3+ monster you tame. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 35.4 |
| **Muse's Favor** | `ispirato` | 2 (1) | Gain 3 Inspiration at the start of each turn. | `ispiratoPerTurn` (3, was 1), `ispiratoMin` (1, the floor it tops up to) | 38.5 |

### Promoted from the style lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables.

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Hometown Hero** | `hometown-hero` | 1 (1) | Dice of your starting element get +1 (can crit). | `hometownHeroBonus` (1) | 33.7 |
| **Small Ensemble** | `small-ensemble` | 4 (4) | Your d4s and d8s roll twice; keep the higher. | `smallEnsembleMaxFaces` (8) | 34.9 |
| **Studio Regular** | `studio-regular` | 3 (2) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 37.1 |
| **Inspired Play** | `inspired-play` | 3 (3) | +2 to every die while you hold 3+ Inspiration (can't crit). | `inspiredPlayBonus` (2), `inspiredPlayMin` (3) | 33.6 |
| **Double Time** | `double-time` | 1 (2) | Once per turn, a die rolls twice; keep the higher. It always applies to the first die you roll that turn. | — | 34.9 |
| **Chain Reaction** | `chain-reaction` | 2 (2) | +2 per same-element song played in a row before this one (max +6, can't crit). | `chainReactionBonus` (2), `chainReactionCap` (6) | 35.9 |
| **Swarm Singer** | `swarm-singer` | 2 (2) | +1 to every die in fights with 3+ monsters (can't crit). | `swarmSingerBonus` (1, was 2), `swarmSingerMin` (3) | 35.0 |
| **Jam Session** | `jam-session` | 4 (2) | +2 to every die while you share a space with another bard (can't crit). | `jamSessionBonus` (2) | 36.2 |

All 20 land between **32.6% and 38.5%** (Extra Verse lowest, Muse's Favor highest).

## What the latest rebalance changed

The merge of the combat target lock and the Showdown stage changed play: bards now tame about 9 monsters a game (it was about 14), which weakened everything that pays on a tame and shifted the table. Re-run against the new rules, then tuned:

| Style | Change | Why |
|---|---|---|
| Rallying Cry | 2 → 1 EXP; refreshes **any** spent song (was d4/d8 only) | 27.7% after the merge: it needs a tame, and there are fewer. Any die at 1 EXP is 31.8%; free is 35.8% |
| Harmony | 2 → 1 EXP; +3 → **+4** | 29.0% after the merge |
| Fanfare | +2 → **+3** (price stays 2) | 30.8% after the merge; price alone did not move it |
| Crowd Favorite | 4 → 3 EXP | 28.3% after the merge (fewer tames) |
| Double Time | 2 → 1 EXP | 29.3% after the merge |
| Dissonance | 1 → 2 EXP | 39.0% after the merge |
| Muse's Favor | 1 → 2 EXP | 39.9% at 1 EXP; 30.3% at 3 EXP |
| Swarm Singer | +2 → **+1** (price stays 2) | 40.9% after the merge; price alone did not move it |
| Jam Session | 2 → 4 EXP | Strong at 2 and 3 EXP (about 40%), 36.2% at 4 |
| Studio Regular | 2 → 3 EXP | 39.8% at 2 EXP |

Left alone: Extra Verse (the lowest at 32.6%, already 1 EXP) and Hometown Hero (+2 is far too strong at 43.3%, +1 is 30.5–33.7%).

Earlier rebalance passes, before the merge: the price cuts, Master's Touch also covering d8s, the d20-only Lingering Note, full-damage Dissonance, +10 Crowd Favorite, and +3 Inspiration a turn for Muse's Favor. Rule values are in the tables above.

## Sweeps after the merge

Win % at different settings, 600 games (800 where marked), from round 5, rivals shopping for styles. No-style baseline 34.7%.

| Style | Settings tried → win % |
|---|---|
| Rallying Cry | d4/d8 at 2 EXP → 27.7 · d4/d8 at 1 → 27.8 · d4–d12 at 2 → 26.8 · any die at 2 → 29.8 · any die at 1 → 31.8 (800) · any die free → 35.8 (800) |
| Harmony | +3 at 2 EXP → 29.0 · +3 at 1 → 30.3 · +4 at 2 → 31.4 · +5 at 2 → 34.2 (800) · +4 at 1 → 33.8 (800) |
| Fanfare | +2 at 2 EXP → 30.8 · +2 at 1 → 30.3 · +3 at 2 → 33.0 |
| Crowd Favorite | 4 EXP → 28.3 · 3 EXP → 32.2 |
| Double Time | 2 EXP → 29.3 · 1 EXP → 34.0 |
| Dissonance | 1 EXP → 39.0 · 2 EXP → 33.7 |
| Muse's Favor | 1 EXP → 39.9 · 2 EXP → 37.4 · 3 EXP → 30.3 |
| Swarm Singer | +2 at 2 EXP → 40.9 · +2 at 3 → 40.4 · +1 at 2 → 33.5 |
| Hometown Hero | +1 at 1 EXP → 30.5 · +2 at 1 → 43.3 |
| Extra Verse | 1 EXP → 30.7 · free → 31.8 |
| Jam Session (800) | 2 EXP → 40.8 · 3 → 39.9 · 4 → 36.2 |
| Studio Regular (800) | 2 EXP → 39.8 · 3 → 37.1 · 4 → 35.4 |

Alternatives tried earlier (mostly measured under the old rules or against rivals with no styles, so read them as rough): War Drums with bonus dice chaining one lower on all dice 50.0% held from round 1 (not shipped); War Drums on d4s only 36.7%; Lingering Note on any die for 1 Inspiration 50.3%; Dissonance at ¾ damage 42.8%.

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
