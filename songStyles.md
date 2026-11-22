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

## The styles

**Price** is the default in EXP.

**Win % (real timing)** is how often a bard wins a simulated 3-bard game against two bards with no styles, when the style is bought the way it really is bought: it is on their shelf from **round 5** (the median round in which bots buy their first style; the middle half buy in rounds 4–6, a second style in round 7, and nobody has spare EXP before then) and they pay its **real price** from their EXP, ahead of dice upgrades. Smart bots in every seat, 300 games each. **A bard with no style wins 31.8%.** Read it as: below about 35% the style is barely worth its price, 37–44% is healthy, above 44% is strong.

**Win % (held from R1)** is the older, flattering measure (style owned from round 1 for free). It is kept for reference only. It overstates every style, and reorders them: expensive styles looked fine and cheap, simple ones looked weak.

### Original styles

| Style | id | Price | What it does | Tunables | Win % (real timing) | Win % (held from R1) |
|---|---|---|---|---|---|---|
| **Rallying Cry** | `staccato` | 2 | Once per turn, after one of your songs tames a monster, refresh a spent d4 or d8 song of your choice. | `staccatoMaxFaces` (8) | 36.2 | 47.0 |
| **Extra Verse** | `coda` | 1 | Gain a 7th song slot. Losing the style returns that song's die as an unclaimed reward. | — | 40.0 | 41.5 |
| **War Drums** | `ostinato` | 2 | All your dice crit one number lower (a d4 on a 3, a d20 on a 19). Bonus dice from a crit still need the top face to keep chaining. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4 = top face only) | 38.2 | 42.3 |
| **Nimble Fingers** | `rubato` | 2 | Twice per turn, reroll any song for free. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (2) | 29.2 | 45.2 |
| **Master's Touch** | `virtuoso` | 4 | Once per turn, your first d12 or d20 roll is rolled twice; keep the higher. | `virtuosoMinFaces` (12) | 28.7 | 41.5 |
| **Dragon's Roar** | `fortissimo` | 4 | +2 to every d20 roll. A d20 that reaches 20 this way crits. | `fortissimoBonus` (2) | 38.0 | 46.2 |
| **Lingering Note** | `fermata` | 4 | Once per turn, a d20 song that doesn't tame its target isn't spent, for 1 Inspiration. Without the Inspiration, the song is spent as usual. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 37.5 | 47.7 |
| **Dissonance** | `counterpoint` | 2 | Once per turn, a roll against an immune target deals full damage. | `counterpointMultiplier` (1) | 33.7 | 48.5 |
| **Harmony** | `tutti` | 4 | If your setlist holds all four elements, +3 to your first roll each turn (can't crit). | `tuttiBonus` (3), `tuttiElements` (4) | 32.7 | 46.5 |
| **Fanfare** | `overture` | 3 | +2 to your first roll each turn (can't crit). | `overtureBonus` (2) | 32.2 | 43.7 |
| **Crowd Favorite** | `bravo` | 3 | +10 Fame for every Lv3+ monster you tame. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 39.2 | 48.8 |
| **Muse's Favor** | `ispirato` | 3 | Gain 1 Inspiration at the start of each turn. | `ispiratoPerTurn` (1), `ispiratoMin` (1, the floor it tops up to) | 29.7 | 42.3 |

Before the rebalance, Lingering Note held d12 and d20 songs for free and Dissonance dealt half damage. The "held from R1" column is how the rebalance was first judged; the real-timing column is the one to use now (see below).

Alternatives tried (all measured held from round 1, so read them against that column): War Drums with bonus dice also chaining one number lower on all dice (`ostinatoChainFace: 3`) 50.0%, slightly strong, so not shipped; War Drums on d4s only 36.7%, and on d4s only with bonus dice chaining on a 3 or 4 (`ostinatoMaxFaces: 4`, `ostinatoChainFace: 3`, no cascade cap) 34.5%, no better, because bard's d4s get upgraded away (fandom falls from 72 to 64); Lingering Note on any die for 1 Inspiration 50.3% (slightly strong), for 2 Inspiration 38.2% (too weak); Dissonance at ¾ damage 42.8%.

### Promoted from the style lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables.

| Style | id | Price | What it does | Tunables | Win % (real timing) | Win % (held from R1) |
|---|---|---|---|---|---|---|
| **Hometown Hero** | `hometown-hero` | 2 | Dice of your starting element get +1 (can crit). | `hometownHeroBonus` (1) | 32.7 | 45.8 |
| **Small Ensemble** | `small-ensemble` | 3 | Your d4s and d8s roll twice; keep the higher. | `smallEnsembleMaxFaces` (8) | 41.3 | 46.5 |
| **Studio Regular** | `studio-regular` | 2 | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 42.5 | 48.2 |
| **Inspired Play** | `inspired-play` | 3 | +2 to every die while you hold 3+ Inspiration (can't crit). | `inspiredPlayBonus` (2), `inspiredPlayMin` (3) | 40.3 | 47.8 |
| **Double Time** | `double-time` | 3 | Once per turn, a die rolls twice; keep the higher. It always applies to the first die you roll that turn. | — | 42.5 | 43.2 |
| **Chain Reaction** | `chain-reaction` | 3 | +2 per same-element song played in a row before this one (max +6, can't crit). | `chainReactionBonus` (2), `chainReactionCap` (6) | 35.0 | 47.8 |
| **Swarm Singer** | `swarm-singer` | 2 | +2 to every die in fights with 3+ monsters (can't crit). | `swarmSingerBonus` (2), `swarmSingerMin` (3) | 40.5 | 44.7 |
| **Jam Session** | `jam-session` | 3 | +2 to every die while you share a space with another bard (can't crit). | `jamSessionBonus` (2) | 37.3 | 47.5 |

## How the simulation models buying

`ROUND=5 STYLES=<id> npx tsx scripts/style-audit.ts 300` puts the style on the tested bard's shelf from round 5 on and makes them buy it at its real price the first turn they can afford it, ahead of dice upgrades, so the EXP cost is really paid. The other bards never see it. Round 5 comes from `npx tsx scripts/style-timing.ts`, which plays normal games with styles on sale and reports when bots buy: first style median round 5 (middle half 4–6), second style round 7; nearly every bard buys one; they hold about 0.4 EXP at the start of a round-5 turn and ~0 earlier, because everything is spent on dice every turn. `BUY=n` (an older mode) and no mode at all (style held from round 1) are kept for comparison but should not be used to set prices.

### Price and power sweeps at real timing (300 games, from round 5)

| Style | Price 1 | Price 2 | Price 3 | Price 4 | Notes |
|---|---|---|---|---|---|
| Master's Touch | 35.0 | 31.0 | 35.3 | 28.7 (now) | A price cut alone does not fix it. With `virtuosoMinFaces: 8` (also d8s): 38.5 at 2 EXP, 35.2 at 3 EXP |
| Nimble Fingers | 37.2 | 29.2 (now) | | | |
| Muse's Favor | 33.5 | 32.3 | 29.7 (now) | | Two Inspiration a turn (`ispiratoPerTurn: 2`): 34.5 at 3 EXP, 34.0 at 2 EXP |
| Fanfare | 41.7 | 37.0 | 32.2 (now) | | |
| Harmony | 40.2 | 38.3 | | 32.7 (now) | |
| Hometown Hero | 40.3 | 32.7 (now) | | | |
| Dissonance | 40.3 | 33.7 (now) | | | |
| Chain Reaction | | 38.7 | 35.0 (now) | | |

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
ROUND=5 STYLES=jam-session npx tsx scripts/style-audit.ts 300
```

```bash
npx tsx scripts/style-timing.ts 200
```

```bash
ROUND=5 STYLES=bravo TUNE='{"bravoMinLevel":2}' npx tsx scripts/style-audit.ts 300
```

```bash
ROUND=5 STYLES=virtuoso TUNE='{"styleCostVirtuoso":2}' npx tsx scripts/style-audit.ts 300
```

The 100 experimental styles that haven't been promoted, and the full rebalance history, are in [`docs/style-lab-report.md`](docs/style-lab-report.md).
