# Genres

A reference for every genre in the Studio (called "styles" in code): what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> The same information is on the **`/songbook`** page of the app (`src/songbook/`). It reads rules, prices and settings live from the code, so only the win rates and "was" prices in `src/songbook/data.ts` need updating by hand along with this file.

> **Keep this file in sync.** If you change a genre's logic, rule text, price or a genre tunable's default, or add or remove a genre, update this file in the same change. The code carries notes pointing here; see [Where the logic lives](#where-the-logic-lives).

## How genres work

- A genre changes how **all** of a bard's songs play. A bard holds at most **2** (`maxStyles`).
- Everything players read says **genre**; songs and dice belong to **elements** (Ballad, Folk, Hymn, Shanty). Code identifiers keep the old `style` names so saves stay compatible.
- The Studio's **Genres** shelf shows **2** offers (`styleOfferCount`). Empty slots refill at the start of every turn, and Inspiration redraws the shelf (`REFRESH_STYLE_OFFERS`). Buying at the cap replaces a genre the bard names.
- Prices are in EXP and every price is a tunable (`styleCostKey(id)` gives its key, e.g. `styleCostHometownHero`).
- "Once per turn" genres fire automatically the first time they apply (Bluegrass is always on). Five are choices instead: **Bebop** (a free encore button), **Blues** (a refresh button on a spent d20 song), **Gospel** ("call it" before a song), **Soul** (pay Inspiration once for a bonus on every song that concert) and **Trip-Hop** (once per turn, move to any space; the board lights up every space beyond walking reach).
- Two kinds of bonus, worded the same way everywhere. "Add +N to the song" (or "to each song") is a flat bonus on top of the roll: it never changes a die's face, so it can't crit. "Increase the rolled value" changes the face itself, so the die can crit (Country, Soft Rock, Baroque, Orchestra).
- Guest songs (borrowed from another bard) roll without genres, never refresh anything and can't be called for Gospel.

## How strength is measured

Run `OPP=1 ROUND=5 STYLES=<id> npx tsx scripts/style-audit.ts 600`. It plays 3-bard games with smart bots in every seat, through the real engine and the Final Showdown:

- **Real timing.** Bots buy their first genre in **round 5** and a second in round 7 (`npx tsx scripts/style-timing.ts`). The tested bard gets the genre on their shelf from round 5 and buys it at its **real price** the first turn they can afford it, ahead of dice upgrades.
- **Shopping rivals.** The other two bards shop for genres like anyone (real prices, whatever the smart bot values).
- **What "balanced" means.** Three seats means a third of games (**33.3%**). The no-genre row (everyone shopping naturally) won **32.8%** in the latest run. At 600 games one result carries about ±1.9 points of noise (±3.8 at two sigma), so only gaps over about 4 points mean anything. The goal is every genre within about 4 points of parity (roughly 31–37%).
- **The bot values every genre.** Its odds model can't see "after a miss" or K-Pop's Fame, so Grunge, Dubstep and K-Pop carry audit priors (`STYLE_PRIOR` in `smartBot.ts`); without them the bot sold those genres off. Gospel, Blues and Soul are valued from this audit too.
- **The bot plays the choices.** Gospel calls a play it expects to win (at least 60%) while a spent song is waiting; Soul pays when the +2 lifts the win chance by more than the Inspiration is worth; Blues refreshes a spent d20 song when it is worth more than the Inspiration. These heuristics are simple, so the two choice genres that measure low (Gospel, Soul) may play better in human hands.

## All genres (current values)

**Price** is the default in EXP; **was** is the price before the latest rule update. **Win %** is the tested bard's win rate against two shopping rivals, 600 games, from round 5. Re-measured for every genre after the rename.

### Original twelve

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Gospel** | `staccato` | 2 (2) | Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh any spent song. | `staccatoMaxFaces` (20) | 27.1 |
| **New Age** | `coda` | 1 (1) | Gain a 7th song slot. If you replace this genre, you must pick a song to give up. | — | 28.1 |
| **Indie** | `ostinato` | 2 (2) | All your dice crit one number lower. Does not affect bonus dice. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4) | 34.3 |
| **Bebop** | `rubato` | 1 (1) | Once per turn, re-roll the die you just rolled and keep the higher result. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (1) | 32.9 |
| **Bluegrass** | `virtuoso` | 2 (2) | You may roll your d8 dice twice and keep the higher roll. Does not affect bonus dice. | `virtuosoMinFaces` (8), `virtuosoMaxFaces` (8) | 39.3 |
| **Opera** | `fortissimo` | 2 (2) | Add +2 to every d20 song. | `fortissimoBonus` (2), `fortissimoRaisesFace` (0) | 28.5 |
| **Blues** | `fermata` | 3 (3) | Once per turn, you may refresh a spent d20 song for 1 Inspiration. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 31.5 |
| **Crossover** | `counterpoint` | 2 (2) | Once per turn, a song ignores immunity. | `counterpointMultiplier` (1) | 31.8 |
| **Barbershop** | `tutti` | 2 (2) | When you have all four elements in your setlist, add +1 to each song. | `tuttiBonus` (1), `tuttiElements` (4) | 37.3 |
| **Screamo** | `overture` | 2 (2) | Add +3 to your first song each turn. | `overtureBonus` (3) | 32.9 |
| **Disco** | `bravo` | 3 (3) | Gain +10 Fame for every Lv3+ monster you win over. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 37.5 |
| **Pop** | `ispirato` | 1 (1) | Gain 2 Inspiration before each concert. | `ispiratoPerTurn` (2), `ispiratoMin` (1) | 32.9 |

### From the lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables, except Soul, which the engine adds per play (`inspiredPlaySpec()`).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Country** | `hometown-hero` | 1 (1) | Increase the rolled value of all dice matching your starting element by 1. | `hometownHeroBonus` (1) | 33.9 |
| **Lo-fi** | `studio-regular` | 3 (3) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 30.9 |
| **Soul** | `inspired-play` | 2 (3) | If you started this turn with 2+ Inspiration, spend 1 Inspiration to add +2 to every song. | `inspiredPlayBonus` (2), `inspiredPlayMin` (2), `inspiredPlayCost` (1) | 32.3 |
| **Baroque** | `steady-hands` | 1 (1) | Whenever a die roll is 3 or less, increase its rolled value by 1. Does not affect bonus dice. | `steadyHandsAtMost` (3), `steadyHandsBonus` (1) | 39.0 |
| **Rap** | `street-performer` | 2 (1) | Gain 2 EXP at the start of each turn. | `streetPerformerExp` (2) | 31.6 |
| **House** | `chain-reaction` | 2 (2) | Add +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown. | `chainReactionBonus` (2), `chainReactionCap` (0), `chainReactionShowdownBonus` (1) | 37.1 |
| **Orchestra** | `swarm-singer` | 2 (2) | While there are 3+ monsters remaining, increase the rolled value of all dice by 1. | `swarmSingerBonus` (1), `swarmSingerMin` (3) | 36.6 |
| **Mariachi** | `jam-session` | 2 (3) | While sharing a space with another bard, add +2 to each song. | `jamSessionBonus` (2) | 35.3 |

### New with the rename

Data-defined specs, except Trip-Hop, which the `MOVE` reducer handles (`anywhere: true`). Their sizes and prices were tuned with the audit (see below).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Punk** | `punk` | 2 (1) | Whenever you crit, add +4 to the song. | `punkBonus` (4) | 35.2 |
| **Soft Rock** | `soft-rock` | 2 (2) | Increase the rolled value of your d8s and d12s by 1. | `softRockBonus` (1) | 35.0 |
| **Prog Rock** | `prog-rock` | 2 (2) | Your 4th and later songs in a concert add +2. | `progRockFrom` (4), `progRockBonus` (2) | 28.1 |
| **Ska** | `ska` | 2 (4) | Whenever you roll an odd number, add +1 to the song. | `skaBonus` (1) | 32.1 |
| **K-Pop** | `k-pop` | 2 (2) | Gain +15 Fame for winning over 3 monsters or +25 Fame for winning 4 monsters in one concert. | `kPopFame3` (15), `kPopFame4` (25) | 32.0 |
| **Emo** | `emo` | 2 (2) | When you're down to your last song, double its value. | `emoMultiplier` (2), `emoBonus` (0), `emoSongsLeft` (1) | 21.8 |
| **Trance** | `trance` | 2 (2) | While you have 0 Inspiration, add +3 to each song. | `tranceBonus` (3) | 26.4 |
| **Grunge** | `grunge` | 2 (2) | Every time a song moves a monster without winning it over, add +1 to your next song. | `grungeBonus` (1) | 31.2 |
| **Dubstep** | `dubstep` | 2 (2) | Once per turn, after winning over a monster, your next song rolls twice and keeps the higher, then adds +3. | `dubstepAdvantage` (1), `dubstepBonus` (3), `dubstepMultiplier` (1), `dubstepOncePerTurn` (1) | 28.8 |
| **Trip-Hop** | `trip-hop` | 1 (2) | Once per turn, move to any space on the board. | — | 29.0 |

All 30 land between **21.8% (Emo) and 39.3% (Bluegrass)**. 16 sit inside the 31–37% band. Rows swing up to ~5 points between runs, so read single rows as ±4 at best.

## Outside the band

Latest run (600 games each, baseline 32.8%), after the buffs: Pop +2 Inspiration, K-Pop +15/+25 Fame, Soul at 2 EXP needing 2+ Inspiration (all three now in the band), Gospel refreshing any die, Trance +3, Emo doubling its last song, Dubstep rolling twice and adding +3.

| Genre | Result | Notes |
|---|---|---|
| **Emo** | 21.8% at 2 EXP | Doubling the last song, +4 or +5 all measure 22–25%: the last song rarely comes up. Reach is the lever (+3 on your last 3 songs measured 32.8%; +5 on the last 2, 30.4%) |
| **Trance** | 26.4% at 2 EXP | The smart bot banks Inspiration for the showdown, so it rarely sits at 0; players who spend it down will get more from it |
| **Gospel** | 27.1% at 2 EXP | Refreshing any die didn't move it; the call is the lever |
| **New Age** | 28.1% at 1 EXP | 34.9% at 0 EXP |
| **Prog Rock** | 28.1% at 2 EXP | 31.4% last run, partly noise |
| **Opera** | 28.5% at 2 EXP | Raising the rolled value by 2 measured 30.4%; +3 flat 31.1%; +3 to the rolled value 36.7% |
| **Dubstep** | 28.8% at 2 EXP | Up from 26.3% with the +3 |
| **Trip-Hop** | 29.0% at 1 EXP | 32.1% at 0 EXP |
| **Lo-fi** | 30.9% at 3 EXP | Edge of the band |
| **House**, **Barbershop**, **Disco** | 37.1%, 37.3%, 37.5% | Edge of the band, rules unchanged |
| **Baroque** | 39.0% at 1 EXP | +1 to rolls of 3 or less (36.5% last run) |
| **Bluegrass** | 39.3% at 2 EXP | d8s only; 1 EXP made no difference |

**Adjusted after the first run:** Baroque as designed (+2 to a roll of 3 or less) measured **54.1%**, because a 2 or 3 on a d4 became a crit; at +1 it measures **36.5%**. Bluegrass on d4 and d8 measured **43.9%** (39.4% at 3 EXP, 37.4% at 4); it now covers d8s only.

### Buffs measured for the weak genres

Not applied unless noted; each is a tunable change (600 games, same seeds).

| Genre | Buff | Win % |
|---|---|---|
| Emo | +5 on the last song | 25.0 |
| **Emo** | double the last song (**applied**) | 24.3 (21.8 in the full run) |
| Emo | +4 on the last song | 24.7 |
| Emo | +3 on your last 3 songs (`emoSongsLeft` 3) | **32.8** |
| Emo | +5 on your last 2 songs | 30.4 |
| **Pop** | +2 Inspiration before each concert (**applied**) | **32.3** |
| **K-Pop** | +15 / +25 Fame (**applied**) | **32.9** |
| **Soul** | 2 EXP and 2+ Inspiration at turn start (**applied**) | **31.1** (2 EXP alone: 27.3) |
| Opera | +3 to d20 songs · +2 to the rolled value · +3 to the rolled value | **31.1** · 30.4 · 36.7 |
| **New Age** | 0 EXP | **34.9** |
| **Trip-Hop** | 0 EXP | **32.1** |
| Lo-fi | 2 EXP | 37.4 (overshoots) |
| **Dubstep** | rolls twice and +3 (**applied**) · doubles the next song · 1 EXP · every win | **30.6** · 26.3 · 27.5 · 23.8 |
| **Gospel** | refresh any die (**applied**) · plus 1 EXP | 25.8 · 28.2 |
| **Trance** | +3 (**applied**) · +3 at 1 EXP | 27.8 · 29.2 |


## Where the logic lives

| What | File |
|---|---|
| Catalog (names, flavour), prices, live rule text (`styleRule`) | `src/data/styles.ts` |
| Every number (prices, bonuses, limits), in the **Genres** group | `src/data/tunables.ts` |
| Built-in roll effects (Indie, Bluegrass, Opera, Screamo, Barbershop), Crossover, Bebop, Disco helpers, Blues and Gospel size limits (`fermataCanRefresh`, `staccatoCanRefresh`), showdown combo counting | `src/game-logic/styles/styleEffects.ts` |
| Spec-based genres (`studioSpec`), Soul's per-play bonus (`inspiredPlaySpec`), plus `specsOf` | `src/data/styleSpecs.ts` |
| The generic spec engine (conditions incl. `afterMove`, `afterWin`, `lastSong`, `inspirationAtMost`; modifiers incl. `oddBonus`, `critFlat`, `lowFaceBonus`) | `src/game-logic/styles/specs.ts` |
| Trip-Hop's move to any space (`MOVE { anywhere }`, `tripHopUsed`); applying genres in concerts and the showdown; Gospel calls and refreshes (`staccatoCall`, `RALLY_SONG`), Blues (`LINGER_SONG`), Soul (`inspiredPlay`, `soulActive`), Pop before a concert, K-Pop's concert reward, New Age's give-up (`giveUpSongId`), `turnStartInspiration`, `lastPlayResult` | `src/engine/reducer.ts` |
| Legality (calls, Soul's Inspiration, refresh sizes, free encores) | `src/engine/validate.ts` |
| Prices after spec discounts (Lo-fi) | `src/engine/economy.ts` |
| The concert screen's choices (call it, Soul) and refresh buttons | `src/components/game/Combat/index.tsx`, `SongCard.tsx` |
| New Age's give-up picker in the Studio | `src/components/game/DraftShop/StyleShelf.tsx` |
| Trip-Hop's jump targets on the board | `src/components/game/Board/index.tsx` |
| How the smart bot values and plays each genre | `src/sim/smartBot.ts`, `src/sim/odds.ts` |
| Tests | `src/engine/styles.test.ts`, `src/engine/styleSpecs.test.ts` |

## Re-running the numbers

```bash
OPP=1 ROUND=5 STYLES=jam-session npx tsx scripts/style-audit.ts 600
```

```bash
OPP=1 ROUND=5 STYLES=emo TUNE='{"emoBonus":5}' npx tsx scripts/style-audit.ts 600
```

```bash
npx tsx scripts/style-timing.ts 200
```

Add `none` to `STYLES` for the all-shopping baseline. Drop `OPP=1` for the easier "rivals hold no genres" test.

The 100 experimental styles that haven't been promoted, and the older rebalance history, are in [`docs/style-lab-report.md`](docs/style-lab-report.md).
