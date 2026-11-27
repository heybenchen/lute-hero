# Genres

A reference for every genre in the Studio (called "styles" in code): what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> The same information is on the **`/songbook`** page of the app (`src/songbook/`). It reads rules, prices and settings live from the code, so only the win rates and "was" prices in `src/songbook/data.ts` need updating by hand along with this file.

> **Keep this file in sync.** If you change a genre's logic, rule text, price or a genre tunable's default, or add or remove a genre, update this file in the same change. The code carries notes pointing here; see [Where the logic lives](#where-the-logic-lives).

## How genres work

- A genre changes how **all** of a bard's songs play. A bard holds at most **2** (`maxStyles`).
- Everything players read says **genre**; songs and dice belong to **elements** (Ballad, Folk, Hymn, Shanty). Code identifiers keep the old `style` names so saves stay compatible.
- The Studio's **Genres** shelf shows **2** offers (`styleOfferCount`). Empty slots refill at the start of every turn, and Inspiration redraws the shelf (`REFRESH_STYLE_OFFERS`). Buying at the cap replaces a genre the bard names.
- Prices are in EXP and every price is a tunable (`styleCostKey(id)` gives its key, e.g. `styleCostHometownHero`).
- "Once per turn" genres fire automatically the first time they apply. Five are choices instead: **Bebop** (a free encore button), **Blues** (a refresh button on a spent d20 song), **Gospel** ("call it" before a song), **Soul** (pay Inspiration for a bonus on a song) and **Trip-Hop** (once per turn, move to any space; the board lights up every space beyond walking reach).
- Two kinds of bonus, worded the same way everywhere. "Adds +N to the song" (or "+N to each song") is a flat bonus on top of the roll: it never changes a die's face, so it can't crit. "Increases the face value of a die" changes the face itself, so the die can crit (Opera, Country, Soft Rock, Baroque).
- Guest songs (borrowed from another bard) roll without genres, never refresh anything and can't be called for Gospel.

## How strength is measured

Run `OPP=1 ROUND=5 STYLES=<id> npx tsx scripts/style-audit.ts 600`. It plays 3-bard games with smart bots in every seat, through the real engine and the Final Showdown:

- **Real timing.** Bots buy their first genre in **round 5** and a second in round 7 (`npx tsx scripts/style-timing.ts`). The tested bard gets the genre on their shelf from round 5 and buys it at its **real price** the first turn they can afford it, ahead of dice upgrades.
- **Shopping rivals.** The other two bards shop for genres like anyone (real prices, whatever the smart bot values).
- **What "balanced" means.** Three seats means a third of games (**33.3%**). The no-genre row (everyone shopping naturally) won **34.6%** in the latest run. At 600 games one result carries about ±1.9 points of noise (±3.8 at two sigma), so only gaps over about 4 points mean anything. The goal is every genre within about 4 points of parity (roughly 31–37%).
- **The bot values every genre.** Its odds model can't see "after a miss" or K-Pop's Fame, so Grunge, Dubstep and K-Pop carry audit priors (`STYLE_PRIOR` in `smartBot.ts`); without them the bot sold those genres off. Gospel, Blues and Soul are valued from this audit too.
- **The bot plays the choices.** Gospel calls a play it expects to win (at least 60%) while a spent song is waiting; Soul pays when the +2 lifts the win chance by more than the Inspiration is worth; Blues refreshes a spent d20 song when it is worth more than the Inspiration. These heuristics are simple, so the two choice genres that measure low (Gospel, Soul) may play better in human hands.

## All genres (current values)

**Price** is the default in EXP; **was** is the price before this rename (for the nine new genres, the price first proposed). **Win %** is the tested bard's win rate against two shopping rivals, 600 games, from round 5. Re-measured for every genre after the rename.

### Original twelve

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Gospel** | `staccato` | 2 (2) | Once per turn, before rolling, call which monster this song will win over. If it does, refresh a spent d12 or smaller song. A wrong call does nothing. | `staccatoMaxFaces` (12) | 26.4 |
| **New Age** | `coda` | 1 (1) | Gain a 7th song slot. | — | 32.8 |
| **Indie** | `ostinato` | 2 (2) | All your dice crit one number lower. Does not affect bonus dice. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4) | 33.3 |
| **Bebop** | `rubato` | 1 (1) | Once per turn, re-roll the die you just rolled and keep the higher result. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (1) | 36.5 |
| **Bluegrass** | `virtuoso` | 2 (2) | Once per turn, roll your first d4, d8 or d12 die twice and keep the higher roll. | `virtuosoMinFaces` (4), `virtuosoMaxFaces` (12) | 27.7 |
| **Opera** | `fortissimo` | 2 (2) | Increases the face value of every d20 by 2. Can crit. | `fortissimoBonus` (2) | 36.0 |
| **Blues** | `fermata` | 3 (3) | Once per turn, you may refresh a spent d20 song for 1 Inspiration. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 29.7 |
| **Crossover** | `counterpoint` | 2 (2) | Once per turn, a song ignores immunity. | `counterpointMultiplier` (1) | 36.5 |
| **Barbershop** | `tutti` | 2 (2) | With all four elements in your setlist, adds +1 to each song. | `tuttiBonus` (1), `tuttiElements` (4) | 39.1 |
| **Screamo** | `overture` | 2 (2) | Adds +3 to your first song each turn. | `overtureBonus` (3) | 33.9 |
| **Disco** | `bravo` | 3 (3) | +10 Fame for every Lv3+ monster you win over. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 38.0 |
| **Pop** | `ispirato` | 1 (1) | Gain 1 Inspiration after each concert. | `ispiratoPerTurn` (1), `ispiratoMin` (1) | 29.6 |

### From the lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables, except Soul, which the engine adds per play (`inspiredPlaySpec()`).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Country** | `hometown-hero` | 1 (1) | Increases the face value of your starting element's dice by 1. Can crit. | `hometownHeroBonus` (1) | 35.2 |
| **Lo-fi** | `studio-regular` | 3 (3) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 34.9 |
| **Soul** | `inspired-play` | 2 (3) | If you started this turn with 3+ Inspiration, spend 1 Inspiration to add +2 to a song. | `inspiredPlayBonus` (2), `inspiredPlayMin` (3), `inspiredPlayCost` (1) | 28.3 |
| **Baroque** | `steady-hands` | 1 (1) | Whenever a die roll is less than 3, change it to 3. | `steadyHandsFloor` (3) | 34.3 |
| **Hip-Hop** | `street-performer` | 1 (1) | Gain 1 EXP at the start of each turn. | `streetPerformerExp` (1) | 29.9 |
| **House** | `chain-reaction` | 2 (2) | Adds +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown. | `chainReactionBonus` (2), `chainReactionCap` (0), `chainReactionShowdownBonus` (1) | 35.7 |
| **Orchestra** | `swarm-singer` | 2 (2) | In concerts with 3+ monsters at the start, adds +1 to each song. | `swarmSingerBonus` (1), `swarmSingerMin` (3) | 37.3 |
| **Mariachi** | `jam-session` | 2 (3) | While sharing a space with another bard, adds +2 to each song. | `jamSessionBonus` (2) | 37.8 |

### New with the rename

Data-defined specs, except Trip-Hop, which the `MOVE` reducer handles (`anywhere: true`). Their sizes and prices were tuned with the audit (see below).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Punk** | `punk` | 1 (1) | Your d4 songs add +1. | `punkBonus` (1) | 33.8 |
| **Soft Rock** | `soft-rock` | 2 (2) | Increases the face value of your d8s and d12s by 1. Can crit. | `softRockBonus` (1) | 34.9 |
| **Prog Rock** | `prog-rock` | 2 (2) | Your 4th and later songs in a concert add +2. | `progRockFrom` (4), `progRockBonus` (2) | 33.8 |
| **Ska** | `ska` | 4 (2) | Dice that land on an odd number add +2. | `skaBonus` (2) | 34.7 |
| **K-Pop** | `k-pop` | 2 (2) | Whenever you move a monster without winning it over, +2 Fame. | `kPopFame` (2) | 32.1 |
| **Emo** | `emo` | 2 (2) | While you have a spent song, +1 to each song. | `emoBonus` (1), `emoCap` (1) | 32.1 |
| **Trance** | `trance` | 1 (2) | While you have 0 Inspiration, +2 to each song. | `tranceBonus` (2) | 30.3 |
| **Grunge** | `grunge` | 2 (1) | After a song misses, your next song adds +1. | `grungeBonus` (1) | 34.8 |
| **Dubstep** | `dubstep` | 1 (2) | Once per turn, after a song misses, your next song rolls twice and keeps the higher. | — | 33.5 |
| **Trip-Hop** | `trip-hop` | 1 (2) | Once per turn, move to any space on the board. | — | 31.7 |

All 30 land between **26.4% (Gospel) and 39.1% (Barbershop)**. 19 sit inside the 31–37% band. Genres whose rules didn't change moved by up to ~5 points between this run and the previous one (Bluegrass 31.0 → 27.7, Hip-Hop 35.3 → 29.9), so read single rows as ±4 at best.

## Outside the band

Latest run (600 games each, baseline 34.6%). The new genres were tuned until they landed in the band; the genres whose rules and prices were set in the design spec are left as designed and listed with the alternatives measured.

| Genre | Result | Alternatives measured |
|---|---|---|
| **Gospel** | 26.4% at 2 EXP | 27.1% at 1 EXP (earlier run). Price isn't the problem: the call plus the d12-or-smaller limit make it weaker than Rallying Cry was (31.8% with any tame and no call) |
| **Bluegrass** | 27.7% at 2 EXP | Rule unchanged; 31.0% in the previous run, so partly noise |
| **Soul** | 28.3% at 2 EXP | 28.6% at 1 EXP (earlier run). Paying 1 Inspiration for +2 costs more than it gains for the bot; a smaller cost or a bigger bonus is the lever, not the price |
| **Pop** | 29.6% at 1 EXP | Inspiration after a concert instead of at turn start; 31.5% in the previous run |
| **Blues** | 29.7% at 3 EXP | **33.0% at 2 EXP** (earlier run) |
| **Hip-Hop** | 29.9% at 1 EXP | Rule unchanged; 35.3% in the previous run, so noise |
| **Trance** | 30.3% at 1 EXP | Edge of the band |
| **Orchestra** | 37.3% at 2 EXP | Counting monsters at the start made it stronger than Swarm Singer (34.4%) |
| **Mariachi** | 37.8% at 2 EXP | 36.1% in the previous run; 3 EXP measured 26.0% before the rename |
| **Disco** | 38.0% at 3 EXP | Rule unchanged (35.4% before the rename) |
| **Barbershop** | 39.1% at 2 EXP | Rule unchanged (37.2% in the previous run) |

### How the new genres were tuned

| Genre | First proposal → result | Tried | Shipped |
|---|---|---|---|
| **Emo** | +1 per spent song, max +3, 2 EXP → 44.9% | 3 EXP → 39.9 · max +2 → 41.3 · max +2 at 3 EXP → 40.0 · max +1 at 1 EXP → 35.6 | **max +1, 2 EXP → 33.5 (32.1 in the latest run)** |
| **Grunge** | +2 after a miss, 1 EXP → 42.3% | 2 EXP → 40.2 · 3 EXP → 37.2 · +1 at 1 EXP → 34.7, then 40.8 once the bot valued it (it had been selling it off) · +1 at 3 EXP → 30.8 | **+1, 2 EXP → 34.8** |
| **Ska** | +2 on odd faces, 2 EXP → 40.7% | 3 EXP → 38.6 · +1 at 1 EXP → 40.0 | **+2, 4 EXP → 36.6 (34.7 in the latest run)** |
| **Punk** | +2 to d4 songs, 1 EXP → 38.3% | 2 EXP → 38.2 | **+1, 1 EXP → 36.3 (33.8 in the latest run)** |
| **Trance** | +2 at 0 Inspiration, 2 EXP → 28.8% | — | **1 EXP → 31.1 (30.3 in the latest run)** |
| **Dubstep** | 2 EXP → 30.8% | — | **1 EXP → 32.4 (33.5 in the latest run)** |
| **Trip-Hop** | once per turn, move to any space, 2 EXP → 28.6% | 3 EXP → 23.8 · 1 EXP with the bot jumping more eagerly → 31.8 (the bot isn't the limit: two moves already reach most of a 16-space board) | **1 EXP → 31.7** |
| **Soft Rock**, **Prog Rock**, **K-Pop** | 36.5 · 34.8 · 31.4 at 2 EXP | — | as proposed |

Misses are common (every song that doesn't win its monster over is spent), so "after a miss" and "per spent song" effects trigger almost every concert: they need small bonuses.

## Where the logic lives

| What | File |
|---|---|
| Catalog (names, flavour), prices, live rule text (`styleRule`) | `src/data/styles.ts` |
| Every number (prices, bonuses, limits), in the **Genres** group | `src/data/tunables.ts` |
| Built-in roll effects (Indie, Bluegrass, Opera, Screamo, Barbershop), Crossover, Bebop, Disco helpers, Blues and Gospel size limits (`fermataCanRefresh`, `staccatoCanRefresh`), showdown combo counting | `src/game-logic/styles/styleEffects.ts` |
| Spec-based genres (`studioSpec`), Soul's per-play bonus (`inspiredPlaySpec`), plus `specsOf` | `src/data/styleSpecs.ts` |
| The generic spec engine (conditions incl. `afterMiss`, `inspirationAtMost`, `monstersAtStartAtLeast`; modifiers incl. `oddBonus`, `perSpentSong`; rewards incl. `ifCharmed`) | `src/game-logic/styles/specs.ts` |
| Trip-Hop's move to any space (`MOVE { anywhere }`, `tripHopUsed`); applying genres in concerts and the showdown; Gospel calls and refreshes (`staccatoCall`, `RALLY_SONG`), Blues (`LINGER_SONG`), Soul (`inspiredPlay`), Pop after a concert, `turnStartInspiration`, `lastPlayMissed` | `src/engine/reducer.ts` |
| Legality (calls, Soul's Inspiration, refresh sizes, free encores) | `src/engine/validate.ts` |
| Prices after spec discounts (Lo-fi) | `src/engine/economy.ts` |
| The concert screen's choices (call it, Soul) and refresh buttons | `src/components/game/Combat/index.tsx`, `SongCard.tsx` |
| Trip-Hop's jump targets on the board | `src/components/game/Board/index.tsx` |
| How the smart bot values and plays each genre | `src/sim/smartBot.ts`, `src/sim/odds.ts` |
| Tests | `src/engine/styles.test.ts`, `src/engine/styleSpecs.test.ts` |

## Re-running the numbers

```bash
OPP=1 ROUND=5 STYLES=jam-session npx tsx scripts/style-audit.ts 600
```

```bash
OPP=1 ROUND=5 STYLES=emo TUNE='{"emoCap":2}' npx tsx scripts/style-audit.ts 600
```

```bash
npx tsx scripts/style-timing.ts 200
```

Add `none` to `STYLES` for the all-shopping baseline. Drop `OPP=1` for the easier "rivals hold no genres" test.

The 100 experimental styles that haven't been promoted, and the older rebalance history, are in [`docs/style-lab-report.md`](docs/style-lab-report.md).
