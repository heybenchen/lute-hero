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

**Price** is the default in EXP. **Win %** is how often a bard who holds only that style from round 1 wins a simulated 3-bard game against two bards with none. Smart bots play every seat, over 300 games each. **A bard with no style wins 31.8%**, and the target range for a balanced style is **42–48%**.

### Original styles

| Style | id | Price | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Rallying Cry** | `staccato` | 2 | Once per turn, after one of your songs tames a monster, refresh a spent d4 or d8 song of your choice. | `staccatoMaxFaces` (8) | 47.0 |
| **Extra Verse** | `coda` | 1 | Gain a 7th song slot. Losing the style returns that song's die as an unclaimed reward. | — | 41.5 |
| **War Drums** | `ostinato` | 2 | All your dice crit one number lower (a d4 on a 3, a d20 on a 19). Bonus dice from a crit still need the top face to keep chaining. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0) | 42.3 |
| **Nimble Fingers** | `rubato` | 2 | Twice per turn, reroll any song for free. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (2) | 45.2 |
| **Master's Touch** | `virtuoso` | 4 | Once per turn, your first d12 or d20 roll is rolled twice; keep the higher. | `virtuosoMinFaces` (12) | 41.5 |
| **Dragon's Roar** | `fortissimo` | 4 | +2 to every d20 roll. A d20 that reaches 20 this way crits. | `fortissimoBonus` (2) | 46.2 |
| **Lingering Note** | `fermata` | 4 | Once per turn, a d20 song that doesn't tame its target isn't spent, for 1 Inspiration. Without the Inspiration, the song is spent as usual. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 47.7 |
| **Dissonance** | `counterpoint` | 2 | Once per turn, a roll against an immune target deals full damage. | `counterpointMultiplier` (1) | 48.5 |
| **Harmony** | `tutti` | 4 | If your setlist holds all four elements, +3 to your first roll each turn (can't crit). | `tuttiBonus` (3), `tuttiElements` (4) | 46.5 |
| **Fanfare** | `overture` | 3 | +2 to your first roll each turn (can't crit). | `overtureBonus` (2) | 43.7 |
| **Crowd Favorite** | `bravo` | 2 | +5 Fame for every Lv3+ monster you tame. | `bravoFamePerTame` (5), `bravoMinLevel` (3) | 40.5 |
| **Muse's Favor** | `ispirato` | 3 | Gain 1 Inspiration at the start of each turn. | `ispiratoPerTurn` (1), `ispiratoMin` (1, the floor it tops up to) | 42.3 |

Before the rebalance, Lingering Note held d12 and d20 songs for free (61.0%) and Dissonance dealt half damage (40.7%). Every original style now lands at 40.5–48.5%.

Alternatives tried: Lingering Note on any die for 1 Inspiration 50.3% (slightly strong), for 2 Inspiration 38.2% (too weak); Dissonance at ¾ damage 42.8%.

### Promoted from the style lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables.

| Style | id | Price | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Hometown Hero** | `hometown-hero` | 2 | Dice of your starting element get +1 (can crit). | `hometownHeroBonus` (1) | 45.8 |
| **Small Ensemble** | `small-ensemble` | 3 | Your d4s and d8s roll twice; keep the higher. | `smallEnsembleMaxFaces` (8) | 46.5 |
| **Studio Regular** | `studio-regular` | 2 | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 48.2 |
| **Inspired Play** | `inspired-play` | 3 | +2 to every die while you hold 3+ Inspiration (can't crit). | `inspiredPlayBonus` (2), `inspiredPlayMin` (3) | 47.8 |
| **Double Time** | `double-time` | 3 | Once per turn, a die rolls twice; keep the higher. It always applies to the first die you roll that turn. | — | 43.2 |
| **Chain Reaction** | `chain-reaction` | 3 | +2 per same-element song played in a row before this one (max +6, can't crit). | `chainReactionBonus` (2), `chainReactionCap` (6) | 47.8 |
| **Swarm Singer** | `swarm-singer` | 2 | +2 to every die in fights with 3+ monsters (can't crit). | `swarmSingerBonus` (2), `swarmSingerMin` (3) | 44.7 |
| **Jam Session** | `jam-session` | 3 | +2 to every die while you share a space with another bard (can't crit). | `jamSessionBonus` (2) | 47.5 |

## How prices were set

`BUY=n npx tsx scripts/style-audit.ts` makes the tested bard pay n EXP for the style the first turn they can afford it. Buying mid-game spends EXP that would have gone into dice, so the gain is smaller than holding the style from round 1. The yardstick is the current styles at their current prices, which land at **34–38%**: Rallying Cry @2 35.2 · Fanfare @3 34.5 · Dragon's Roar @4 33.8 · Harmony @4 34.2 · Crowd Favorite @2 38.3. Each new price was picked to land in that range, taking the cheaper option when two prices fall within noise (about ±2.7 points).

| Style | Bought at 2 | at 3 | at 4 | Price |
|---|---|---|---|---|
| War Drums | 34.2 | 34.8 | 33.7 | 2 |
| Hometown Hero | 34.2 | 33.5 | 33.5 | 2 |
| Small Ensemble | 34.5 | 35.2 | 34.5 | 3 |
| Studio Regular | 37.5 | 31.2 | 32.8 | 2 |
| Inspired Play | 41.2 | 35.8 | 33.8 | 3 |
| Double Time | 40.3 | 38.5 | 33.5 | 3 |
| Chain Reaction | 38.5 | 34.3 | 34.5 | 3 |
| Swarm Singer | 36.2 | 32.8 | 32.2 | 2 |
| Jam Session | 39.2 | 35.2 | 33.3 | 3 |

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
npx tsx scripts/style-audit.ts 300
```

```bash
STYLES=bravo TUNE='{"bravoMinLevel":2}' npx tsx scripts/style-audit.ts 300
```

```bash
BUY=3 STYLES=jam-session npx tsx scripts/style-audit.ts 300
```

The 100 experimental styles that haven't been promoted, and the full rebalance history, are in [`docs/style-lab-report.md`](docs/style-lab-report.md).
