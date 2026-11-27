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
- **What "balanced" means.** Three seats means a third of games (**33.3%**). The no-genre row (everyone shopping naturally) won **31.9%** in the latest run. At 600 games one result carries about ±1.9 points of noise (±3.8 at two sigma), so only gaps over about 4 points mean anything. The goal is every genre within about 4 points of parity (roughly 31–37%).
- **The bot values every genre.** Its odds model can't see "after a miss" or K-Pop's Fame, so Grunge, Dubstep and K-Pop carry audit priors (`STYLE_PRIOR` in `smartBot.ts`); without them the bot sold those genres off. Gospel, Blues and Soul are valued from this audit too.
- **The bot plays the choices.** Gospel calls a play it expects to win (at least 60%) while a spent song is waiting; Soul pays when the +2 lifts the win chance by more than the Inspiration is worth; Blues refreshes a spent d20 song when it is worth more than the Inspiration. These heuristics are simple, so the two choice genres that measure low (Gospel, Soul) may play better in human hands.

## All genres (current values)

**Price** is the default in EXP; **was** is the price before the latest rule update. **Win %** is the tested bard's win rate against two shopping rivals, 600 games, from round 5. Re-measured for every genre after the rename.

### Original twelve

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Gospel** | `staccato` | 2 (2) | Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh a spent d4/d8/d12. | `staccatoMaxFaces` (12) | 27.3 |
| **New Age** | `coda` | 1 (1) | Gain a 7th song slot. If you replace this genre, you must pick a song to give up. | — | 28.3 |
| **Indie** | `ostinato` | 2 (2) | All your dice crit one number lower. Does not affect bonus dice. | `ostinatoCritFace` (3), `ostinatoMaxFaces` (20), `ostinatoCascadeBonus` (0), `ostinatoChainFace` (4) | 34.1 |
| **Bebop** | `rubato` | 1 (1) | Once per turn, re-roll the die you just rolled and keep the higher result. | `rubatoMaxFaces` (20), `rubatoUsesPerTurn` (1) | 34.2 |
| **Bluegrass** | `virtuoso` | 2 (2) | You may roll your d8 dice twice and keep the higher roll. Does not affect bonus dice. | `virtuosoMinFaces` (8), `virtuosoMaxFaces` (8) | 38.1 |
| **Opera** | `fortissimo` | 2 (2) | Add +2 to every d20 song. | `fortissimoBonus` (2) | 29.1 |
| **Blues** | `fermata` | 3 (3) | Once per turn, you may refresh a spent d20 song for 1 Inspiration. | `fermataMinFaces` (20), `fermataInspirationCost` (1) | 32.5 |
| **Crossover** | `counterpoint` | 2 (2) | Once per turn, a song ignores immunity. | `counterpointMultiplier` (1) | 31.3 |
| **Barbershop** | `tutti` | 2 (2) | When you have all four elements in your setlist, add +1 to each song. | `tuttiBonus` (1), `tuttiElements` (4) | 36.3 |
| **Screamo** | `overture` | 2 (2) | Add +3 to your first song each turn. | `overtureBonus` (3) | 32.3 |
| **Disco** | `bravo` | 3 (3) | Gain +10 Fame for every Lv3+ monster you win over. | `bravoFamePerTame` (10), `bravoMinLevel` (3) | 38.7 |
| **Pop** | `ispirato` | 1 (1) | Gain 1 Inspiration before each concert. | `ispiratoPerTurn` (1), `ispiratoMin` (1) | 26.1 |

### From the lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables, except Soul, which the engine adds per play (`inspiredPlaySpec()`).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Country** | `hometown-hero` | 1 (1) | Increase the rolled value of all dice matching your starting element by 1. | `hometownHeroBonus` (1) | 34.9 |
| **Lo-fi** | `studio-regular` | 3 (3) | Upgrades cost 1 less EXP. | `studioRegularDiscount` (1) | 30.3 |
| **Soul** | `inspired-play` | 3 (2) | If you started this turn with 3+ Inspiration, spend 1 Inspiration to add +2 to every song. | `inspiredPlayBonus` (2), `inspiredPlayMin` (3), `inspiredPlayCost` (1) | 28.6 |
| **Baroque** | `steady-hands` | 1 (1) | Whenever a die roll is 3 or less, increase its rolled value by 1. Does not affect bonus dice. | `steadyHandsAtMost` (3), `steadyHandsBonus` (1) | 36.5 |
| **Rap** | `street-performer` | 2 (1) | Gain 2 EXP at the start of each turn. | `streetPerformerExp` (2) | 32.5 |
| **House** | `chain-reaction` | 2 (2) | Add +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown. | `chainReactionBonus` (2), `chainReactionCap` (0), `chainReactionShowdownBonus` (1) | 36.4 |
| **Orchestra** | `swarm-singer` | 2 (2) | While there are 3+ monsters remaining, increase the rolled value of all dice by 1. | `swarmSingerBonus` (1), `swarmSingerMin` (3) | 38.8 |
| **Mariachi** | `jam-session` | 2 (3) | While sharing a space with another bard, add +2 to each song. | `jamSessionBonus` (2) | 36.2 |

### New with the rename

Data-defined specs, except Trip-Hop, which the `MOVE` reducer handles (`anywhere: true`). Their sizes and prices were tuned with the audit (see below).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Punk** | `punk` | 2 (1) | Whenever you crit, add +4 to the song. | `punkBonus` (4) | 34.8 |
| **Soft Rock** | `soft-rock` | 2 (2) | Increase the rolled value of your d8s and d12s by 1. | `softRockBonus` (1) | 35.2 |
| **Prog Rock** | `prog-rock` | 2 (2) | Your 4th and later songs in a concert add +2. | `progRockFrom` (4), `progRockBonus` (2) | 31.4 |
| **Ska** | `ska` | 2 (4) | Whenever you roll an odd number, add +1 to the song. | `skaBonus` (1) | 31.2 |
| **K-Pop** | `k-pop` | 2 (2) | Gain +10 Fame for winning over 3 monsters or +15 Fame for winning 4 monsters in one concert. | `kPopFame3` (10), `kPopFame4` (15) | 29.8 |
| **Emo** | `emo` | 2 (2) | When you're down to your last song, add +5. | `emoBonus` (5), `emoSongsLeft` (1) | 25.0 |
| **Trance** | `trance` | 2 (1) | While you have 0 Inspiration, add +2 to each song. | `tranceBonus` (2) | 27.8 |
| **Grunge** | `grunge` | 2 (2) | Every time a song moves a monster without winning it over, add +1 to your next song. | `grungeBonus` (1) | 32.9 |
| **Dubstep** | `dubstep` | 2 (1) | Once per turn, after winning over a monster, your next song rolls twice and keeps the higher. | `dubstepOncePerTurn` (1) | 26.3 |
| **Trip-Hop** | `trip-hop` | 1 (2) | Once per turn, move to any space on the board. | — | 30.3 |

All 30 land between **25.0% (Emo) and 38.8% (Orchestra)**. 16 sit inside the 31–37% band. Rows swing up to ~5 points between runs, so read single rows as ±4 at best.

## Outside the band

Latest run (600 games each, baseline 31.9%), after the spec's rule update. Rules and prices are as designed; Baroque and Bluegrass were adjusted after the first run (see below).

| Genre | Result | Notes |
|---|---|---|
| **Emo** | 25.0% at 2 EXP (+5) | +3 measured 24.2%: the last song rarely comes up. Reach is the lever: +3 on your last 3 songs measured 32.8% (`emoSongsLeft` 3) |
| **Pop** | 26.1% at 1 EXP | Inspiration before a concert instead of after |
| **Dubstep** | 26.3% at 2 EXP | After a win, rolling twice matters less: the song that follows is often a sure thing |
| **Gospel** | 27.3% at 2 EXP | 1 EXP reached only ~27% in earlier runs; the call is the lever, not the price |
| **Trance** | 27.8% at 2 EXP | 31.1% at 1 EXP in an earlier run |
| **New Age** | 28.3% at 1 EXP | Rule change only affects giving it up; partly noise (32.8% two runs ago) |
| **Soul** | 28.6% at 3 EXP | One payment now covers the whole concert, but 3 EXP and the 3+ Inspiration gate keep it low |
| **Opera** | 29.1% at 2 EXP | A flat +2 no longer crits (35–36% when it raised the face) |
| **K-Pop** | 29.8% at 2 EXP | 3+ wins in one concert is uncommon |
| **Lo-fi**, **Trip-Hop** | 30.3%, 30.3% | Edge of the band |
| **Bluegrass** | 38.1% at 2 EXP | d8s only (d4 and d8 measured 43.9%); 1 EXP made no difference (39%) |
| **Disco** | 38.7% at 3 EXP | Rule unchanged; consistently high |
| **Orchestra** | 38.8% at 2 EXP | Raising the rolled value (can crit) made it stronger |

**Adjusted after the first run:** Baroque as designed (+2 to a roll of 3 or less) measured **54.1%**, because a 2 or 3 on a d4 became a crit; at +1 it measures **36.5%**. Bluegrass on d4 and d8 measured **43.9%** (39.4% at 3 EXP, 37.4% at 4); it now covers d8s only.

### Buffs measured for the weak genres

Not applied unless noted; each is a tunable change (600 games, same seeds).

| Genre | Buff | Win % |
|---|---|---|
| **Emo** | +5 on the last song (**applied**) | 25.0 |
| Emo | +3 on your last 3 songs (`emoSongsLeft` 3) | **32.8** |
| Emo | +5 on your last 2 songs | 30.4 |
| **Pop** | +2 Inspiration before each concert | **32.3** |
| **K-Pop** | +15 / +25 Fame | **32.9** |
| **Soul** | 2 EXP and 2+ Inspiration at turn start | **31.1** (2 EXP alone: 27.3) |
| **Opera** | +3 to d20 songs | **31.1** |
| **New Age** | 0 EXP | **34.9** |
| **Trip-Hop** | 0 EXP | **32.1** |
| Lo-fi | 2 EXP | 37.4 (overshoots) |
| Dubstep | 1 EXP · every win (no once per turn) | 27.5 · 23.8 |
| Gospel | refresh any die · plus 1 EXP | 25.8 · 28.2 |
| Trance | +3 · +3 at 1 EXP | 27.8 · 29.2 |


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
