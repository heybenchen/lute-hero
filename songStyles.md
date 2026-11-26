# Song Styles

A reference for every style in the Studio: what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> The same information is on the **`/songbook`** page of the app (`src/songbook/`). It reads rules, prices and settings live from the code, so only the win rates and "was" prices in `src/songbook/data.ts` need updating by hand along with this file.

> **Keep this file in sync.** If you change a style's logic, rule text, price or a style tunable's default, or add or remove a style, update this file in the same change. The code carries notes pointing here; see [Where the logic lives](#where-the-logic-lives).

## How styles work

- A style changes how **all** of a bard's songs play. A bard holds at most **2** (`maxStyles`).
- The Studio shelf shows **2** offers (`styleOfferCount`). Empty slots refill at the start of every turn, and Inspiration redraws the shelf (`REFRESH_STYLE_OFFERS`). Buying at the cap replaces a style the bard names.
- Prices are in EXP and every price is a tunable (`styleCostKey(id)` gives its key, e.g. `styleCostHometownHero`).
- "Once per turn" styles fire automatically the first time they apply. The two exceptions are buttons: Nimble Fingers (a free reroll) and Rallying Cry (choose a spent song to refresh after a tame).
- Two kinds of bonus, worded the same way everywhere. "Adds +N to the **value of the song**" is a flat bonus on top of the dice: it never changes a die's face, so it can't crit (the text says "Can't crit"). "Increases the **face value of a die**" changes the face itself, so the die can crit (Dragon's Roar, Hometown Hero, Steady Hands: a low die is raised to 3). Rule text is kept short on purpose: say only what the player needs.
- Featured songs (borrowed from another bard) roll without styles.

## How strength is measured

Run `OPP=1 ROUND=5 STYLES=<id> npx tsx scripts/style-audit.ts 600`. It plays 3-bard games with smart bots in every seat, through the real engine and the Final Showdown:

- **Real timing.** Bots buy their first style in **round 5** (middle half rounds 4–6) and a second in round 7. Nobody has spare EXP earlier, because everything goes into dice upgrades (`npx tsx scripts/style-timing.ts` measures this). The tested bard gets the style on their shelf from round 5 and buys it at its **real price** the first turn they can afford it, ahead of dice upgrades, so the EXP cost is really paid.
- **Shopping rivals.** The other two bards shop for styles like anyone (real prices, whatever the smart bot values). So a style is judged against what bots naturally buy.
- **What "balanced" means.** Three seats means a third of games (**33.3%**). A balanced style is as good as the typical choice, so it wins about a third. The no-style row (everyone shopping naturally) wins 33.4% in the final run. At 800 games one result carries about ±1.7 points of noise (±3.4 at two sigma), and the tested style's own results swing a little more than that between runs, so only gaps over about 4 points mean anything. The goal is every style within about 4 points of the middle (roughly 32–39%).

Earlier rounds of this work judged styles with rivals who had no styles, or with the style owned from round 1. Both flatter every style and rank them differently. Those numbers are history, not guidance.

## All styles (current values)

**Price** is the default in EXP; **was** is the price before the latest rebalance (the one that followed the target-lock merge). **Win %** is the tested bard's win rate against two shopping rivals (parity is 33.3%, the no-style baseline is 33.4%), 800 games, from round 5.

### Original styles

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Rallying Cry** | `staccato` | 2 (1) | Once per turn, after a song wins over a monster, refresh any spent song. | `staccatoMaxFaces` (20 = any die) | 32.5 |
| **Extra Verse** | `coda` | 1 (1) | Gain a 7th song slot. Losing the style returns that song's die as an unclaimed reward. | — | 29.5 |
| **War Drums** | `ostinato` | 2 (2) | All your dice crit one number lower. Bonus dice still need the top face. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4 = top face only) | 36.0 |
| **Nimble Fingers** | `rubato` | 1 (1) | Once per turn, re-roll the die you just rolled and keep the higher result. If the new roll is lower, your first roll stands (the use is still spent). | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (1) | 33.8 |
| **Master's Touch** | `virtuoso` | 2 (2) | Once per turn, roll your first d4, d8 or d12 die twice and keep the higher. | `virtuosoMinFaces` (4), `virtuosoMaxFaces` (12) | 32.3 |
| **Dragon's Roar** | `fortissimo` | 2 (2) | Increases the face value of every d20 by 2. Reaching 20 crits. | `fortissimoBonus` (2) | 33.3 |
| **Lingering Note** | `fermata` | 3 (3) | Once per turn, a d20 song that doesn't win over its monster isn't spent. Costs 1 Inspiration. Without the Inspiration, the song is spent as usual. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 35.5 |
| **Dissonance** | `counterpoint` | 2 (2) | Once per turn, a song counts in full against an immune monster. | `counterpointMultiplier` (1) | 31.5 |
| **Harmony** | `tutti` | 2 (1) | With all four elements in your setlist, adds +1 to the value of the song. Can't crit. | `tuttiBonus` (1), `tuttiElements` (4) | 31.7 |
| **Fanfare** | `overture` | 2 (2) | Adds +3 to the value of your first song each turn. Can't crit. | `overtureBonus` (3) | 31.6 |
| **Crowd Favorite** | `bravo` | 3 (3) | +10 Fame for every Lv3+ monster you win over. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 35.4 |
| **Muse's Favor** | `ispirato` | 1 (2) | Gain 1 Inspiration at the start of each turn. | `ispiratoPerTurn` (1), `ispiratoMin` (1, the floor it tops up to) | 33.1 |

### Promoted from the style lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables.

| Style | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Hometown Hero** | `hometown-hero` | 1 (1) | Increases the face value of your starting element's dice by 1. Reaching the crit face crits. | `hometownHeroBonus` (1) | 36.1 |
| **Steady Hands** | `steady-hands` | 1 (1) | Increases the face value of any die below 3 to 3. The raised face can crit. New. | `steadyHandsFloor` (3) | 34.8 |
| **Street Performer** | `street-performer` | 1 (1) | Gain 1 EXP at the start of each turn. New. | `streetPerformerExp` (1) | 33.3 |
| **Studio Regular** | `studio-regular` | 3 (3) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 35.9 |
| **Inspired Play** | `inspired-play` | 3 (3) | With 3+ Inspiration, adds +2 to the value of the song. Can't crit. | `inspiredPlayBonus` (2), `inspiredPlayMin` (3) | 31.9 |
| **Chain Reaction** | `chain-reaction` | 2 (2) | Adds +2 to the value of the song, for each same-element song played just before it (max +6). Can't crit. | `chainReactionBonus` (2), `chainReactionCap` (6) | 31.3 |
| **Swarm Singer** | `swarm-singer` | 2 (2) | In concerts with 3+ monsters, adds +1 to the value of the song. Can't crit. | `swarmSingerBonus` (1), `swarmSingerMin` (3) | 34.4 |
| **Jam Session** | `jam-session` | 3 (4) | While sharing a space with another bard, adds +2 to the value of the song. Can't crit. | `jamSessionBonus` (2) | 32.5 |

All 20 land between **29.5% and 36.1%** (Extra Verse lowest, Hometown Hero highest).

## What the latest rebalance changed

Requested changes, applied together and then re-measured (all 20 styles, 800 games each, no-style baseline 33.4%):

| Style | Change | Result |
|---|---|---|
| Harmony | 1 → 2 EXP | 31.7% |
| Rallying Cry | 1 → 2 EXP | 32.5% |
| Muse's Favor | +3 → **+1** Inspiration a turn, 2 → 1 EXP | 33.1% |
| Jam Session | 4 → 3 EXP | 32.5% |
| Master's Touch | Now applies to d12 and smaller (`virtuosoMinFaces` 4, `virtuosoMaxFaces` 12); was d8 and larger | 32.3% at 2 EXP (31.8–32.1% at 1 or 3 EXP, so price barely matters) |
| **Nimble Fingers** | Now "Once per turn, you may re-roll the die you just rolled and keep the higher value" (was: two free rerolls that replace the roll). 1 EXP | 33.8% at 1 EXP; 30.3% at 2 or 3 EXP |
| Bonus wording | Flat bonuses say "adds +N to the value of the song" (can't crit); face changes say "increases the face value of a die" (can crit) | text only |

**Replaced:** Double Time and Small Ensemble. With Master's Touch covering d12 and smaller, Double Time ("once per turn, the first die you roll rolls twice, keep the higher") did everything Master's Touch does and more (any die, including the d20, and no waiting for a qualifying die), so it was strictly better apart from spending itself on whatever die came first. Small Ensemble (d4/d8 always roll twice) was a third roll-twice style. They became effects that are not about advantage:

| New style | Effect | Price | Win % | Why this one |
|---|---|---|---|---|
| **Steady Hands** | A die that lands below 3 counts as showing 3 | 1 EXP | 34.8% | Consistency, helps small dice most. A floor of 4 is far too strong (54.2%): a d4 would always show 4 |
| **Street Performer** | Gain 1 EXP at the start of each of your turns | 1 EXP | 33.3% | An economy style. +1 EXP at 2 EXP is 28.7%; +2 EXP a turn at 1 EXP is 37.9%, at 2 EXP 29.8% |

The price edits you asked for on those two (Double Time to 2 EXP, Small Ensemble to 3 EXP) no longer apply, since the styles are gone. Their old ids are dropped from saved games when they load.

Earlier passes: price and power changes to bring every style within a few points of a third (see the "Sweeps" below and `docs/style-lab-report.md`).

## Sweeps after the latest change

Win % at different settings (600 games unless noted), from round 5, rivals shopping for styles. Parity is 33.3%.

| Style | Settings tried → win % |
|---|---|
| Nimble Fingers (keep higher, once a turn) | 1 EXP → 36.0 · 2 EXP → 30.3 · 3 EXP → 30.3 · final run at 1 EXP (800) → 33.8 |
| Steady Hands | floor 3: 1 EXP → 33.3 · 2 EXP → 30.4 · 3 EXP → 28.8 · floor 4 at 2 EXP → 54.2 |
| Street Performer | +1 EXP: 0 EXP → 33.7 · 1 EXP → 32.1 · 2 EXP → 28.7 · 3 EXP → 25.9 · 4 EXP → 25.1; +2 EXP: 1 EXP → 37.9 · 2 EXP → 29.8 · 3 EXP → 27.3 · 4 EXP → 28.4 |
| Master's Touch (d12 and smaller) | 1 EXP → 32.1 · 2 EXP → 31.8 · 3 EXP → 31.8 |

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
