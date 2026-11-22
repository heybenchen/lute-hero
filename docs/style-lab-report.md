# Style lab report

**Summary:** 21 too strong · 12 slightly strong · 20 balanced · 13 slightly weak · 34 too weak

Generated from `scripts/style-lab.ts`: each style was held alone from round 1 by one bard in 250 three-bard games played by smart bots (`src/sim/smartBot.ts`) through the Final Showdown; seats random, seeds shared. **No-style baseline: 30.4% wins.** Target band for a balanced style: **42–48%** (about +12 points).

Verdicts: Too strong > 52% · Slightly strong 48–52% · Balanced 42–48% · Slightly weak 38–42% · Too weak < 38%.

## Inspiration: how much is it worth?

Measured with `scripts/inspiration-value.ts` (one bard starts with a bonus, smart bots everywhere, 600 paired games per row; the no-bonus seat wins 36.2%), `scripts/inspiration-audit.ts` (where it goes) and head-to-head bot variants (`scripts/bot-tournament.ts`, one varied bot against two default bots, where the control — an unchanged variant — wins 36.3%).

| Starting bonus | Win % | Gain over none |
|---|---|---|
| +3 Inspiration | 40.3 | +4.1 |
| +6 Inspiration | 43.5 | +7.3 |
| +10 Inspiration | 44.2 | +8.0 |
| +2 EXP | 40.6 | +4.4 |
| +4 EXP | 49.2 | +13.0 |
| +6 EXP | 58.0 | +21.8 |

- Inspiration is useful but **saturates around six**: three are worth about two EXP, ten barely more than six. EXP keeps compounding.
- Per bard per game (normal games): about 5.4 earned (clears plus Muse's Favor), 3.6 bought for 5.3 EXP, spent 2.3 on fight rerolls, 1.2 on shelf refreshes and 2.3 on showdown rerolls; 5.2 held when the showdown starts and 3.2 left at the end.
- That leftover is saturation, not a bot leak. Optimal stopping for showdown rerolls, a showdown reserve of 0 or 6, and buying up to 4 or 6 Inspiration all landed within noise of the control (+0 to +1.3). Lowering the fight-reroll value from 6 to 4 or raising it to 8 was worse (−2.3, −1.5), so 6 is about right.
- The price step (`inspirationCostStep`, now 0, so Inspiration always costs 1 EXP; it was 1) made no difference to bot play: the control wins 36.3% with a rising price and 36.4% with a flat price. Bots buy about 0.4 Inspiration a turn, so the step rarely binds.

## Correction: realistic timing

Every win rate below this section holds the style from round 1 for free. That is not how styles are bought: bots (and players) cannot afford one before round 4 to 6, because EXP goes into dice upgrades. `scripts/style-timing.ts` measured it: first style bought in round 5 (middle half rounds 4–6), second in round 7, in games lasting about 9.7 rounds. `ROUND=5 scripts/style-audit.ts` models that. The tested bard buys at the real price from round 5 on, ahead of dice. The results for the 20 Studio styles are in `songStyles.md`, which now judges styles with rivals who shop for styles too (`OPP=1`), where a balanced style wins about a third of games. Headlines: the spread is 28.7–42.5% (no-style baseline 31.8), expensive styles lose the most (Master's Touch 41.5 → 28.7, Nimble Fingers 45.2 → 29.2, Muse's Favor 42.3 → 29.7, Rallying Cry 47.0 → 36.2) and cheap roll-bonus styles hold up (Studio Regular 42.5, Double Time 42.5, Small Ensemble 41.3). Treat the "held from round 1" numbers below as superseded. They are history.

## Rebalance of the existing 12 styles

Same method (300 games each, smart bots; no-style baseline 31.8%). Every change is a tunable in the playtest console's **Values → Styles** group, so it can be tried live. (These were the first proposals; what shipped is in the next section.)

| Style | Today | Win % today | Proposed | Win % proposed | Tunables |
|---|---|---|---|---|---|
| **Crowd Favorite** | +5 Fame for every monster you tame | 64.7 | +2 Fame per tame | **44.3** | `bravoFamePerTame: 2` |
| **Lingering Note** | Once per turn, a d12/d20 song that misses isn't spent | 61.0 | d20 songs only, and keeping it costs 1 Inspiration | **47.7** | `fermataMinFaces: 20`, `fermataInspirationCost: 1` |
| **Rallying Cry** | Once per turn, after a tame, refresh a spent song of your choice | 51.8 | …a spent d4 or d8 song | **46.7** | `staccatoMaxFaces: 8` |
| **Harmony** | If your setlist holds all four elements, +4 to your first roll each turn | 49.5 | +3 instead of +4 | **46.5** | `tuttiBonus: 3` |
| **Dragon's Roar** | +2 to every d20 roll (can crit) | 46.2 | unchanged | 46.2 | — |
| **Fanfare** | +2 to your first roll each turn | 43.7 | unchanged | 43.7 | — |
| **Extra Verse** | A 7th song slot | 41.5 | unchanged (cheapest style, 1 EXP) | 41.5 | — |
| **Master's Touch** | Once per turn, your first d12/d20 roll is rolled twice; keep the higher | 41.5 | unchanged | 41.5 | — |
| **Dissonance** | Once per turn, a roll against an immune target deals half damage | 40.7 | ¾ damage instead of half | **42.8** | `counterpointMultiplier: 0.75` |
| **War Drums** | Your d4s crit on a 3 or 4 | 36.7 | …and their crit dice add +2 | **41.8** | `ostinatoCascadeBonus: 2` |
| **Nimble Fingers** | Once per turn, reroll a d4 or d8 song for free | 34.2 | any die, twice per turn | **45.2** | `rubatoMaxFaces: 20`, `rubatoUsesPerTurn: 2` |
| **Muse's Favor** | Start each turn with at least 1 Inspiration | 33.5 | +1 Inspiration at the start of every turn | **42.7** | `ispiratoPerTurn: 1` |

Rejected alternatives (same runs): Lingering Note d20-only but free 55.0 · Rallying Cry d4–d12 46.5 · Harmony +2 40.0 · Dragon's Roar +1 38.7 · Dissonance full damage 48.2 · War Drums crit on 2+ 34.2, reaching d8/d12 36.5–37.0, "+1 to d4s and d8s (can crit)" 49.5 · Nimble Fingers any die once 39.7, d4–d8 twice 41.0 · Muse's Favor floor of 2/3 36.7/35.0 · Master's Touch on d8s too 41.2.

With the rebalance, the twelve styles span 41.5–47.7% — all within noise (±2.8 points) of the band.

## Shipped defaults and the eight promoted styles

These are now the game's defaults. Power is measured the same way (style held from round 1, 300 games, smart bots); **no-style baseline 31.8%**.

### Existing styles that changed

| Style | What it does now | Win % | Tunables |
|---|---|---|---|
| **Crowd Favorite** | +10 Fame for every Lv3+ monster you tame (was +5 at 40.5%; price 2 → 3) | **48.8** held; bought at 2 / 3 / 4 EXP: 42.5 / 36.5 / 35.8 | `bravoFamePerTame: 10`, `bravoMinLevel: 3`, `styleCostBravo: 3` |
| **Rallying Cry** | Once per turn, after a tame, refresh a spent d4 or d8 song of your choice | **47.0** | `staccatoMaxFaces: 8` |
| **Harmony** | If your setlist holds all four elements, +3 to your first roll each turn (added on top of the face; can't crit) | **46.5** | `tuttiBonus: 3` |
| **War Drums** | All your dice crit one number lower (a d4 on a 3, a d20 on a 19); bonus dice still need the top face | **42.3** | `ostinatoMaxFaces: 20` (price unchanged at 2) |
| **Nimble Fingers** | Twice per turn, reroll any song for free | **45.2** (once per turn: 39.0) | `rubatoMaxFaces: 20`, `rubatoUsesPerTurn: 2` |
| **Muse's Favor** | Gain 1 Inspiration at the start of each turn | **42.3** | `ispiratoPerTurn: 1` |

War Drums variants (300 games): all dice, bonus dice also chaining one lower 50.0 (not shipped; the shipped version, first-roll crit only, is 42.3) · d4s only 36.7 · d4s only with bonus dice chaining on a 3 or 4, uncapped 34.5 (35.0 bought at 2 EXP). Chaining is a new tunable, `ostinatoChainFace` (default 4 = top face only; lower values chain that many numbers below the top, scaled by die size like the crit face).

Lingering Note (d20 songs only, 1 Inspiration per use: **47.7**) and Dissonance followed in later commits. Dissonance went to ¾ damage (**42.8**) first and then full damage (**48.5**). Also tried: Lingering Note on any die for 1 Inspiration 50.3, for 2 Inspiration 38.2.

Crowd Favorite triggers that were tried, all at +5 Fame unless noted (spec runs, 300 games): every tame 64.2 · Lv2+ 50.8 (built-in run: 51.0) · **Lv3+ 43.5** (built-in run: 40.5) · first tame each turn 41.3 · clearing a space 40.8 · weak-element tames 51.3 · one-song tames of untouched monsters 50.7 · +10 for Lv3+ 48.8 · +10 for Lv4+ 34.8 · +10 on clear 50.5 · +10 once per turn 62.3.

### Promoted from the style lab

| Style | What it does | Win % (held) | Price | Win % bought at 2 / 3 / 4 EXP |
|---|---|---|---|---|
| **Hometown Hero** | Dice of your starting element get +1 (can crit) | **45.8** | 2 | 34.2 / 33.5 / 33.5 |
| **Small Ensemble** | Your d4s and d8s roll twice; keep the higher | **46.5** | 3 | 34.5 / 35.2 / 34.5 |
| **Studio Regular** | Upgrades cost 1 less EXP | **48.2** | 2 | 37.5 / 31.2 / 32.8 |
| **Inspired Play** | +2 to every die while you hold 3+ Inspiration (can't crit) | **47.8** | 3 | 41.2 / 35.8 / 33.8 |
| **Double Time** | Once per turn, a die rolls twice; keep the higher | **43.2** | 3 | 40.3 / 38.5 / 33.5 |
| **Chain Reaction** | +2 per same-element song played in a row before this one (max +6, can't crit) | **47.8** | 3 | 38.5 / 34.3 / 34.5 |
| **Swarm Singer** | +2 to every die in fights with 3+ monsters (can't crit) | **44.7** | 2 | 36.2 / 32.8 / 32.2 |
| **Jam Session** | +2 to every die while you share a space with another bard (can't crit) | **47.5** | 3 | 39.2 / 35.2 / 33.3 |

**How prices were set** (`BUY=n scripts/style-audit.ts`): the tested bard pays n EXP for the style the first turn they can afford it, and the other bards hold no styles. Buying mid-game spends EXP that would have gone into dice, so the gain is smaller than holding the style from round 1. The current well-priced styles at their current prices are the yardstick: Rallying Cry @2 35.2 · Fanfare @3 34.5 · Dragon's Roar @4 33.8 · Harmony @4 34.2 · Crowd Favorite @2 38.3 · War Drums @2 / 3 / 4 34.2 / 34.8 / 33.7. Each new style takes the price that lands it in that 34–38% range. Where several prices fall within noise (±2.7 points), it takes the cheaper one.

## 100 new styles

## 1. Element-specific

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Ember Heart** | Your Ballad dice get +2 (can crit). | 55.0 | Too strong |
| **Purist** | Once per turn, a die of your starting element gets +4. | 50.0 | Slightly strong |
| **True Voice** | Dice of your starting element deal ×3 (not ×2) to monsters weak to them. | 49.2 | Slightly strong |
| **Hometown Hero** | Dice of your starting element get +1 (can crit). | 46.2 | Balanced |
| **Choir of Dawn** | Your Hymn dice roll twice; keep the higher. | 43.2 | Balanced |
| **Attuned** | +1 Inspiration whenever a die of your starting element tames a monster. | 41.4 | Slightly weak |
| **Defiant Tune** | Dice of your starting element deal full damage to monsters immune to them. | 39.6 | Slightly weak |
| **Greenwood Ballad** | Your Folk dice reroll a 1 or 2 once. | 35.6 | Too weak |
| **Signature Sound** | Dice of your starting element crit one face lower. | 35.2 | Too weak |
| **Sea Legs** | Your Shanty dice never roll below 3. | 32.6 | Too weak |

## 2. Dice-specific

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Quick Strum** | A d4 song that misses isn't spent. | 91.2 | Too strong |
| **Cheap Tuning** | New d4s cost 1 less EXP. | 50.0 | Slightly strong |
| **Small Ensemble** | Your d4s and d8s roll twice; keep the higher. | 49.4 | Slightly strong |
| **Organ Pipes** | Your d20s reroll a 1–5 once. | 43.6 | Balanced |
| **Big Band** | Your d12s and d20s get +1. | 35.8 | Too weak |
| **Lute Player's Pride** | Your d8s crit on a 7 or 8. | 34.6 | Too weak |
| **War Horn** | Your d20s crit on 18–20. | 33.4 | Too weak |
| **Pocket Drums** | Each crit bonus die from a d4 adds +2. | 31.8 | Too weak |
| **Drumline** | Your d4s get +2. | 30.4 | Too weak |
| **Harp Strings** | Your d12s never roll below 4. | 29.4 | Too weak |

## 3. Inspiration & economy

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Studio Regular** | Upgrades cost 1 less EXP. | 47.4 | Balanced |
| **Bard of Means** | In the Studio, each Inspiration can pay for 2 EXP. | 46.8 | Balanced |
| **Inspired Play** | +2 to every die while you hold 3+ Inspiration. | 46.8 | Balanced |
| **Empowered Encore** | Inspiration rerolls add +3 to the die. | 38.6 | Slightly weak |
| **Muse of Victory** | +1 more Inspiration when you clear a space. | 37.2 | Too weak |
| **Golden Take** | Inspiration rerolls keep whichever result was better. | 36.0 | Too weak |
| **Tip Jar** | +1 Inspiration whenever you tame a Lv3+ monster. | 35.8 | Too weak |
| **Patron** | Buying Inspiration costs 1 less EXP. | 35.4 | Too weak |
| **Saving for Glory** | When the showdown ends, each unspent Inspiration is worth 4 fans. | 34.0 | Too weak |
| **Second Take** | Your first Inspiration reroll each turn is free. | 33.0 | Too weak |

## 4. Dice manipulation

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Even Keel** | Your dice get +3 but can't crit. | 81.6 | Too strong |
| **Flip Side** | A roll of 1 flips to the top face (and crits). | 59.6 | Too strong |
| **Mirror Tune** | Once per turn, a d8/d12/d20 roll of 1–3 flips to its opposite face. | 51.6 | Slightly strong |
| **Second Chance** | Any die showing a 1 or 2 rerolls once. | 49.2 | Slightly strong |
| **Sleight of Hand** | Once per turn, a roll below 4 counts as 4. | 48.4 | Slightly strong |
| **Double Time** | Once per turn, a die rolls twice; keep the higher. | 45.4 | Balanced |
| **Loaded Dice** | Your first song each fight rolls twice; keep the higher. | 44.4 | Balanced |
| **Weighted Dice** | Your d12s and d20s never roll below 6. | 42.6 | Balanced |
| **Retune** | Once per turn, a die showing 1–4 rerolls. | 34.6 | Too weak |
| **Steady Hand** | Your dice never roll a 1. | 33.0 | Too weak |

## 5. Combo rolls

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Opening Chord** | Your first song each fight gets +4 (can crit). | 69.0 | Too strong |
| **Crescendo** | +1 per song already played this fight (max +4). | 64.8 | Too strong |
| **Medley** | +1 per different element already played this fight (max +3). | 58.4 | Too strong |
| **Call and Response** | +2 to a song whose element differs from the previous song's. | 51.6 | Slightly strong |
| **Building Hype** | Tames by your 4th or later song in a fight are worth +5 Fame. | 49.2 | Slightly strong |
| **Chain Reaction** | +2 per same-element song played in a row before this one (max +6). | 47.6 | Balanced |
| **Grand Crescendo** | Your 4th and later songs each fight roll twice; keep the higher. | 47.6 | Balanced |
| **Harmony Line** | A same-element follow-up deals ×3 (not ×2) to monsters weak to it. | 41.6 | Slightly weak |
| **Motif** | +2 to a song played right after a song of the same element. | 41.4 | Slightly weak |
| **Counter-Melody** | A song after one of a different element crits one face lower. | 34.0 | Too weak |

## 6. Gambles

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Triple Threat** | Your first song each fight deals ×3, but if it misses you lose 5 Fame. | 91.8 | Too strong |
| **Risky Business** | Missed songs aren't spent, but each miss costs 1 Inspiration. | 91.2 | Too strong |
| **Glass Cannon** | +3 to every die, but each miss costs 1 EXP. | 69.8 | Too strong |
| **All or Nothing** | Your dice roll twice and keep the LOWER, but deal double. | 64.0 | Too strong |
| **Double or Bust** | Your d20s deal ×1.5 but can't crit. | 57.6 | Too strong |
| **Last Stand** | While you have the least Fame, your dice deal ×1.5. | 54.0 | Too strong |
| **Showboat** | +5 Fame per tame, −3 Fame per miss. | 35.8 | Too weak |
| **House Money** | Taming a Lv4+ monster earns 2 Inspiration; missing one costs 1. | 25.8 | Too weak |
| **Reckless** | Dice roll twice and keep the lower, but crit one face lower and each crit die adds +3. | 4.8 | Too weak |
| **Gambler's Shot** | Dice roll twice and keep the lower, but each crit bonus die adds +10. | 4.8 | Too weak |

## 7. Crits

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Power Chord** | Your d8s and d12s get +3 (can crit). | 78.4 | Too strong |
| **Fever Pitch** | From your 3rd song each fight, dice crit one face lower and crit dice add +1. | 49.0 | Slightly strong |
| **Grand Encore** | Each crit bonus die adds +4. | 45.8 | Balanced |
| **Hunter's Crit** | Against Lv3+ monsters your dice crit one face lower. | 44.2 | Balanced |
| **Sharp Ear** | All your dice crit one face lower. | 43.4 | Balanced |
| **Resonance** | Each crit bonus die adds +2. | 41.2 | Slightly weak |
| **Stage Dive** | Your first song each fight crits on its top three faces. | 39.8 | Slightly weak |
| **Echo Chamber** | Your d12s and d20s crit one face lower, and their crit dice add +1. | 38.2 | Slightly weak |
| **Glimmer** | Your d4s and d8s crit on their top two faces. | 36.2 | Too weak |
| **Thunderclap** | Your d20s crit on 17–20, but your other dice can't crit. | 32.4 | Too weak |

## 8. Targeting

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Finisher** | +3 against already-wounded monsters. | 67.0 | Too strong |
| **Giant Slayer** | +3 against Lv4+ monsters. | 65.8 | Too strong |
| **Crowd Reader** | Your dice deal ×1.5 to monsters that are neither weak nor immune to them. | 55.0 | Too strong |
| **First Impression** | +3 against monsters not yet hit this fight. | 53.2 | Too strong |
| **Fan Favorite** | Your dice deal ×3 (not ×2) to monsters weak to them. | 53.0 | Too strong |
| **Pest Control** | +2 (can crit) against Lv1–2 monsters. | 44.0 | Balanced |
| **Swarm Singer** | +2 to every die in fights with 3+ monsters. | 43.6 | Balanced |
| **Big Game** | +2 EXP per Lv3+ monster tamed. | 40.8 | Slightly weak |
| **Open Mind** | Monsters immune to your dice take half damage instead of none. | 35.4 | Too weak |
| **Bounty Hunter** | +8 Fame per Lv4+ monster tamed. | 34.4 | Too weak |

## 9. Table position & rivalry

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Busker** | +2 EXP whenever a fight ends with monsters left. | 48.8 | Slightly strong |
| **Jam Session** | +2 to every die while you share a space with another bard. | 47.6 | Balanced |
| **Comeback Kid** | While you have the least Fame, your dice get +2 (can crit). | 45.2 | Balanced |
| **Street Performer** | +1 EXP at the start of each turn. | 43.2 | Balanced |
| **Chip on the Shoulder** | While you have the least Fame, +3 Fame per tame. | 39.8 | Slightly weak |
| **Wanderer** | +1 move per turn. | 38.8 | Slightly weak |
| **Trailblazer** | +2 moves per turn. | 38.0 | Slightly weak |
| **Underdog** | While you have the least Fame, +1 Inspiration at the start of your turn. | 37.0 | Too weak |
| **Headliner** | While you lead in Fame, +3 Fame per tame. | 37.0 | Too weak |
| **Duet Partner** | While you share a space with another bard, tames earn +1 Inspiration. | 31.0 | Too weak |

## 10. Showdown & tempo

| Style | What it does | Win % | Verdict |
|---|---|---|---|
| **Opening Act** | Your first song each fight rolls twice, keeps the higher, and gets +2. | 64.8 | Too strong |
| **Stamina** | +1 to every die, +1 more in the Final Showdown. | 56.8 | Too strong |
| **Second Wind** | Your 3rd and later songs each fight get +2. | 51.8 | Slightly strong |
| **Warm-Up** | +1 EXP at the start of each turn and +1 to showdown dice. | 46.0 | Balanced |
| **Encore Reserve** | +15 fans when the showdown ends. | 38.2 | Slightly weak |
| **Showstopper** | +3 to every die in the Final Showdown. | 36.8 | Too weak |
| **Grand Finale** | Showdown dice roll twice; keep the higher. | 34.6 | Too weak |
| **Headline Act** | Showdown dice crit one face lower and their crit dice add +2. | 34.4 | Too weak |
| **Legacy** | +1 Fame at the start of each turn. | 33.4 | Too weak |
| **Slow Burn** | −1 to dice in fights, +4 in the Final Showdown. | 19.8 | Too weak |

## Design lessons

- **"A miss isn't spent" is the most powerful effect in the game.** Quick Strum (d4s) and Risky Business (any die, 1 Inspiration) both win ~91%: replaying a song until it tames turns every fight into a guaranteed clear. Lingering Note works because it is once per turn; any such effect needs a hard per-turn limit.
- **Flat bonuses on every die are worth far more than they look.** +3 to all dice (Even Keel 82%, Glass Cannon 70% even with its EXP penalty) roughly doubles a d4. +1 on everything (Stamina) already lands at 57%. Conditional +2/+3 (Finisher, Giant Slayer, First Impression) is the right size class only when the condition is common.
- **"Roll twice, keep the lower" is ruinous** unless paid back in full: Reckless and Gambler's Shot ~5%, while All or Nothing (keep the lower, but ×2) is 64%.
- **Showdown-only styles are weak** (Showstopper 37%, Grand Finale 35%, Headline Act 34%): the showdown is three performances, while the board game decides most of the Fame. Slow Burn (−1 in fights, +4 in the showdown) is a trap at 20%.
- **Big-die crit tweaks barely matter** (War Horn 33%, Thunderclap 32%): d20s already hit hard; crits matter on small dice and in volume.
- **Economy styles land in the middle** (Cheap Tuning 50%, Studio Regular 47%, Bard of Means 47%) and are a good source of balanced, low-complexity options.
- **Inspiration styles are weak in smart hands** (Golden Take 36%, Second Take 33%, Patron 35%): the bot already uses Inspiration where it matters, so extra rerolls add little. Inspiration needs bigger levers (Inspired Play's +2 while holding 3+ is balanced at 47%).
- **Element-locked styles depend on luck of the draw**: Ember Heart (Ballad) 55% vs Sea Legs (Shanty) 33% — the starting-element versions (Hometown Hero 46%, True Voice 49%) are more reliable.
