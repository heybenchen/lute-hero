# Genres

A reference for every genre in the Studio: what it does, what it costs, which tunables shape it, where its logic lives and how strong it simulates.

> The same information is on the **`/songbook`** page of the app (`src/songbook/`). It reads rules, prices and settings live from the code, so only the win rates and "was" prices in `src/songbook/data.ts` need updating by hand along with this file.

> **Keep this file in sync.** If you change a genre's logic, rule text, price or a genre tunable's default, or add or remove a genre, update this file in the same change. The code carries notes pointing here; see [Where the logic lives](#where-the-logic-lives).

## How genres work

- A genre changes how **all** of a bard's songs play. A bard holds at most **2** (`maxGenres`).
- Players and code use the same words: a Studio purchase is a **genre** (`GenreId`, `player.genres`); songs and dice belong to **elements** (Ballad, Folk, Hymn, Shanty: `Element`, `die.element`). Each genre's id is its own name in kebab case (`opera`, `new-age`, `lo-fi`). Saves from before the rename are migrated on load (`src/engine/legacyNames.ts`).
- The Studio's **Genres** shelf shows **2** offers (`genreOfferCount`). Empty slots refill at the start of every turn, and Inspiration redraws the shelf (`REFRESH_GENRE_OFFERS`). Buying at the cap replaces a genre the bard names.
- Prices are in EXP and every price is a tunable (`genreCostKey(id)` gives its key, e.g. `genreCostCountry`).
- "Once per turn" genres fire automatically the first time they apply (Bluegrass is always on). Five are choices instead: **Bebop** (a free encore button), **Blues** (a refresh button on a spent d20 song), **Gospel** ("call it" before a song), **Soul** (pay Inspiration once for a bonus on every song that concert) and **Trip-Hop** (once per turn, move to any space; the board lights up every space beyond walking reach).
- Two kinds of bonus, worded the same way everywhere. "Add +N to the song" (or "to each song") is a flat bonus on top of the roll: it never changes a die's face, so it can't crit. "Increase the rolled value" changes the face itself, so the die can crit (Country, Soft Rock, Baroque, Orchestra).
- Guest songs (borrowed from another bard) roll without genres, never refresh anything and can't be called for Gospel.

## How strength is measured

Run `OPP=1 ROUND=5 GENRES=<id> npx tsx scripts/genre-audit.ts 600`. It plays 3-bard games with smart bots in every seat, through the real engine and the Final Showdown:

- **Real timing.** Bots buy their first genre in **round 5** and a second in round 7 (`npx tsx scripts/genre-timing.ts`). The tested bard gets the genre on their shelf from round 5 and buys it at its **real price** the first turn they can afford it, ahead of dice upgrades.
- **Shopping rivals.** The other two bards shop for genres like anyone (real prices, whatever the smart bot values).
- **What "balanced" means.** Three seats means a third of games (**33.3%**). The no-genre row (everyone shopping naturally) won **32.8%** in the latest run. At 600 games one result carries about ±1.9 points of noise (±3.8 at two sigma), so only gaps over about 4 points mean anything. The goal is every genre within about 4 points of parity (roughly 31–37%).
- **The bot values every genre.** Its odds model handles Grunge's replacement dice and Dubstep's follow-up bonus directly, and while it holds Trance it spends Inspiration down to 0 (no Showdown reserve, near-free encores, shelf redraws with what is left). K-Pop still carries an audit prior (`GENRE_PRIOR` in `smartBot.ts`) because its end-of-concert Fame is outside one-roll odds. Gospel, Blues and Soul are valued from this audit too.
- **The bot plays the choices.** Gospel calls a play it expects to win (at least 60%) while a spent song is waiting; Soul pays when the +2 lifts the win chance by more than the Inspiration is worth; Blues refreshes a spent d20 song when it is worth more than the Inspiration. These heuristics are simple, so the two choice genres that measure low (Gospel, Soul) may play better in human hands.

## All genres (current values)

**Price** is the default in EXP; **was** is the price before the latest rule update. **Win %** is the tested bard's win rate against two shopping rivals, 600 games, from round 5. Re-measured for every genre after the rename.

### Original twelve

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Gospel** | `gospel` | 2 (2) | Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh any spent song. | `gospelMaxFaces` (20) | 27.1 |
| **New Age** | `new-age` | 1 (1) | Gain a 7th song slot. If you replace this genre, you must pick a song to give up. | — | 28.1 |
| **Indie** | `indie` | 2 (2) | All your dice crit one number lower. Does not affect bonus dice. | `indieCritFace` (3), `indieMaxFaces` (20), `indieCascadeBonus` (0), `indieChainFace` (4) | 34.3 |
| **Bebop** | `bebop` | 1 (1) | Once per turn, re-roll the die you just rolled and keep the higher result. | `bebopMaxFaces` (20), `bebopUsesPerTurn` (1) | 32.9 |
| **Bluegrass** | `bluegrass` | 2 (2) | You may roll your d8 dice twice and keep the higher roll. Does not affect bonus dice. | `bluegrassMinFaces` (8), `bluegrassMaxFaces` (8) | 39.3 |
| **Opera** | `opera` | 2 (2) | Increase the rolled value of your d20s by 2. | `operaBonus` (2), `operaRaisesFace` (1) | 30.4 |
| **Blues** | `blues` | 3 (3) | Once per turn, you may refresh a spent d20 song for 1 Inspiration. | `bluesMinFaces` (20), `bluesInspirationCost` (1) | 31.5 |
| **Crossover** | `crossover` | 2 (2) | Once per turn, a song ignores immunity. | `crossoverMultiplier` (1) | 31.8 |
| **Barbershop** | `barbershop` | 2 (2) | When you have all four elements in your setlist, add +1 to each song. | `barbershopBonus` (1), `barbershopElements` (4) | 37.3 |
| **Screamo** | `screamo` | 2 (2) | Add +3 to your first song each turn. | `screamoBonus` (3) | 32.9 |
| **Disco** | `disco` | 3 (3) | Gain +10 Fame for every Lv3+ monster you win over. | `discoFamePerTame` (10), `discoMinLevel` (3) | 37.5 |
| **Pop** | `pop` | 1 (1) | Gain 2 Inspiration before each concert. | `popPerTurn` (2), `popMin` (1) | 32.9 |

### From the lab

These keep kebab-case ids. Their effects are data-defined specs that `studioSpec()` builds from the live tunables, except Soul, which the engine adds per play (`soulSpec()`).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Country** | `country` | 1 (1) | Increase the rolled value of all dice matching your starting element by 1. | `countryBonus` (1) | 33.9 |
| **Lo-fi** | `lo-fi` | 3 (3) | Upgrades cost 1 less EXP. | `loFiDiscount` (1) | 30.9 |
| **Soul** | `soul` | 2 (3) | If you started this turn with 2+ Inspiration, spend 1 Inspiration to add +2 to every song. | `soulBonus` (2), `soulMin` (2), `soulCost` (1) | 32.3 |
| **Baroque** | `baroque` | 1 (1) | Whenever a die roll is less than 3, change its rolled value to 3. | `baroqueFloor` (3) | 39.0† |
| **Rap** | `rap` | 2 (1) | Gain 2 EXP at the start of each turn. | `rapExp` (2) | 31.6 |
| **House** | `house` | 2 (2) | Add +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown. | `houseBonus` (2), `houseCap` (0), `houseShowdownBonus` (1) | 37.1 |
| **Orchestra** | `orchestra` | 2 (2) | While there are 3+ monsters remaining, increase the rolled value of all dice by 1. | `orchestraBonus` (1), `orchestraMin` (3) | 36.6 |
| **Mariachi** | `mariachi` | 2 (3) | While sharing a space with another bard, add +2 to each song. | `mariachiBonus` (2) | 35.3 |

### New with the rename

Data-defined specs, except Trip-Hop, which the `MOVE` reducer handles (`anywhere: true`). Their sizes and prices were tuned with the audit (see below).

| Genre | id | Price (was) | What it does | Tunables | Win % |
|---|---|---|---|---|---|
| **Punk** | `punk` | 2 (1) | Whenever you crit, add +4 to the song. | `punkBonus` (4) | 35.2 |
| **Soft Rock** | `soft-rock` | 2 (2) | Increase the rolled value of your d8s and d12s by 1. | `softRockBonus` (1) | 35.0 |
| **Prog Rock** | `prog-rock` | 2 (2) | Your 3rd and later songs in a concert add +2. | `progRockFrom` (3), `progRockBonus` (2) | 28.1† |
| **Ska** | `ska` | 2 (4) | Whenever you roll an odd number, add +1 to the song. | `skaBonus` (1) | 32.1 |
| **K-Pop** | `k-pop` | 2 (2) | Gain +15 Fame for winning over 3 monsters or +25 Fame for winning 4 monsters in one concert. | `kPopFame3` (15), `kPopFame4` (25) | 32.0 |
| **Emo** | `emo` | 2 (2) | Declare that this is your last song of the concert: add +8 to it. The concert ends after this song. | `emoBonus` (8) | 24.8 |
| **Trance** | `trance` | 2 (2) | While you have 0 Inspiration, add +3 to each song. | `tranceBonus` (3) | 35.0‡ |
| **Grunge** | `grunge` | 2 (2) | You may roll two d12s in place of your d20s. | — | 35.8‡ |
| **Dubstep** | `dubstep` | 2 (2) | Every time a song moves a monster without winning it over, add +2 to your next song. | `dubstepBonus` (2) | 28.8† |
| **Trip-Hop** | `trip-hop` | 1 (2) | Once per turn, move to any space on the board. | — | 29.0 |

All 30 land between **24.8% (Emo) and 39.3% (Bluegrass)**. 16 sit inside the 31–37% band. Rows swing up to ~5 points between runs, so read single rows as ±4 at best.

## Outside the band

Latest run (600 games each, baseline 32.8%), after the earlier buffs. † Baroque, Prog Rock and Dubstep changed afterward, so their listed rates are historical until the next audit. ‡ Re-measured separately (600 games, `OPP=1 ROUND=5`): Grunge after its rule change, and Trance once the smart bot learned to spend its Inspiration down to 0 while holding it (22.2% with the old bot, which banked Inspiration).

| Genre | Result | Notes |
|---|---|---|
| **Emo** | 24.8% at 2 EXP | A declared final song at +8 (see below). Earlier versions that boosted only the last song (doubling, +4, +5) measured 22–25%: the last song rarely comes up |
| **Gospel** | 27.1% at 2 EXP | Refreshing any die didn't move it; the call is the lever |
| **New Age** | 28.1% at 1 EXP | 34.9% at 0 EXP |
| **Prog Rock** | 28.1% at 2 EXP | 31.4% last run, partly noise |
| **Opera** | 30.4% at 2 EXP | Now raises the rolled value of d20s by 2 (was a flat +2: 28.5%); +3 flat 31.1%; +3 to the rolled value 36.7% |
| **Dubstep** | 28.8% at 2 EXP | Historical result for the retired roll-twice-and-+3 rule |
| **Trip-Hop** | 29.0% at 1 EXP | 32.1% at 0 EXP |
| **Lo-fi** | 30.9% at 3 EXP | Edge of the band |
| **House**, **Barbershop**, **Disco** | 37.1%, 37.3%, 37.5% | Edge of the band, rules unchanged |
| **Baroque** | 39.0% at 1 EXP | Historical result for the retired +1 rule |
| **Bluegrass** | 39.3% at 2 EXP | d8s only; 1 EXP made no difference |

**Historical adjustments:** the previous Baroque rule (+2 to a roll of 3 or less) measured **54.1%**, because a 2 or 3 on a d4 became a crit; the later +1 version measured **36.5%**. Baroque now floors rolls below 3 to 3 and has not been remeasured. Bluegrass on d4 and d8 measured **43.9%** (39.4% at 3 EXP, 37.4% at 4); it now covers d8s only.

### Emo as a declared final song

The bard declares a song their last of the concert for a bonus (`emoBonus`, 8), and the concert ends after it (`PLAY_SONG { emoFinale }`). Measured with the smart bot declaring only when nothing else is left to win (the last song, or the only monster left); an eager bot that declared to chase big wins ended concerts it would have kept winning and did worse (17–22%).

| Bonus | +3 | +6 | +8 | +10 | +15 | +20 | +8 at 1 EXP |
|---|---|---|---|---|---|---|---|
| Win % | 23.1 | 24.3 | 24.8 | 25.2 | 26.8 | 27.5 | 25.8 |

None reaches the band (baseline 32.8%; "+5 on your last 2 songs" measured 30.4%), but the declared finale was kept at +8 as the clearer rule; a player who plans the finale will do better than the conservative bot.

### Buffs measured for the weak genres

Not applied unless noted; each is a tunable change (600 games, same seeds).

| Genre | Buff | Win % |
|---|---|---|
| **Pop** | +2 Inspiration before each concert (**applied**) | **32.3** |
| **K-Pop** | +15 / +25 Fame (**applied**) | **32.9** |
| **Soul** | 2 EXP and 2+ Inspiration at turn start (**applied**) | **31.1** (2 EXP alone: 27.3) |
| **Opera** | +3 to d20 songs · +2 to the rolled value (**applied**) · +3 to the rolled value | 31.1 · **30.4** · 36.7 |
| **New Age** | 0 EXP | **34.9** |
| **Trip-Hop** | 0 EXP | **32.1** |
| Lo-fi | 2 EXP | 37.4 (overshoots) |
| **Dubstep (historical)** | rolls twice and +3 · doubles the next song · 1 EXP · every win | **30.6** · 26.3 · 27.5 · 23.8 |
| **Gospel** | refresh any die (**applied**) · plus 1 EXP | 25.8 · 28.2 |
| **Trance** | +3 (**applied**) · +3 at 1 EXP | 27.8 · 29.2 |


## Where the logic lives

| What | File |
|---|---|
| Catalog (names, flavour), prices, live rule text (`genreRule`) | `src/data/genres.ts` |
| Every number (prices, bonuses, limits), in the **Genres** group | `src/data/tunables.ts` |
| Built-in roll effects (Indie, Bluegrass, Opera, Screamo, Barbershop), Crossover, Bebop, Disco helpers, Blues and Gospel size limits (`bluesCanRefresh`, `gospelCanRefresh`), showdown combo counting | `src/game-logic/genres/genreEffects.ts` |
| Spec-based genres (`studioSpec`), Soul's per-play bonus (`soulSpec`), plus `specsOf` | `src/data/genreSpecs.ts` |
| The generic spec engine (conditions incl. `afterMove`, `afterWin`, `lastSong`, `inspirationAtMost`; modifiers incl. `oddBonus`, `critFlat`, `lowFaceBonus`) | `src/game-logic/genres/specs.ts` |
| Trip-Hop's move to any space (`MOVE { anywhere }`, `tripHopUsed`); applying genres in concerts and the showdown; Gospel calls and refreshes (`gospelCall`, `RALLY_SONG`), Blues (`LINGER_SONG`), Soul (`soul`, `soulActive`), Pop before a concert, K-Pop's concert reward, New Age's give-up (`giveUpSongId`), `turnStartInspiration`, `lastPlayResult` | `src/engine/reducer.ts` |
| Legality (calls, Soul's Inspiration, refresh sizes, free encores) | `src/engine/validate.ts` |
| Prices after spec discounts (Lo-fi) | `src/engine/economy.ts` |
| The concert screen's choices (call it, Soul) and refresh buttons | `src/components/game/Combat/index.tsx`, `SongCard.tsx` |
| New Age's give-up picker in the Studio | `src/components/game/DraftShop/GenreShelf.tsx` |
| Trip-Hop's jump targets on the board | `src/components/game/Board/index.tsx` |
| How the smart bot values and plays each genre | `src/sim/smartBot.ts`, `src/sim/odds.ts` |
| Tests | `src/engine/genres.test.ts`, `src/engine/styleSpecs.test.ts` |

## Re-running the numbers

```bash
OPP=1 ROUND=5 GENRES=mariachi npx tsx scripts/genre-audit.ts 600
```

```bash
OPP=1 ROUND=5 GENRES=emo TUNE='{"emoBonus":5}' npx tsx scripts/genre-audit.ts 600
```

```bash
npx tsx scripts/genre-timing.ts 200
```

Add `none` to `GENRES` for the all-shopping baseline. Drop `OPP=1` for the easier "rivals hold no genres" test.

The 100 experimental genres that haven't been promoted, and the older rebalance history, are in [`docs/genre-lab-report.md`](docs/genre-lab-report.md).
