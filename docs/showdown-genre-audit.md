# Genres in the Final Showdown

Measured with `npx tsx scripts/showdown-genre-audit.ts` (3 bards, 300 smart-bot games per pace, with the crown rule and Fame order). Each game is played to the start of the Showdown, then the Showdown is replayed once per genre: every bard's genres are cleared, the tested bard (seat 1) holds only that genre, and every replay uses the same dice seed. "Fame" is Showdown Fame (rounded fandom + crown bonuses); "wins" is how often the tested bard wins the game, which only the Showdown can change here. Baseline with no genre: typical 64.3 fandom / 108.6 Fame / 31% wins; expert 63.4 / 110.2 / 37%.

## Genres that help in the Showdown

| Genre | Price | Typical: Fame Δ | Typical: wins Δ | Expert: Fame Δ | Expert: wins Δ | Why |
|---|---|---|---|---|---|---|
| Opera | 2 | +16.6 | +13.0 | +19.0 | +12.7 | d20s +2 to the rolled value; end-game setlists are d20-heavy |
| Screamo | 2 | +16.8 | +7.3 | +15.5 | +11.3 | +3 to the first song each turn: every performance is a first song |
| Grunge | 2 | +13.7 | +8.0 | +18.6 | +13.3 | each d20 rolls as two d12s, which is higher on average and crits more often |
| New Age | 1 | +13.1 | +6.3 | +13.9 | +7.0 | the 7th song adds a die to an element's performance |
| Indie | 2 | +11.8 | +5.7 | +7.9 | +4.7 | crits one number lower |
| Country | 1 | +10.1 | +4.3 | +8.6 | +4.0 | starting-element dice +1 |
| Crossover | 2 | +9.3 | +4.0 | +5.8 | +2.3 | can keep performing the element the Silence is immune to |
| House | 2 | +9.1 | +4.3 | +6.6 | +6.7 | builds +1 per same-element die in a verse |
| Bebop | 1 | +8.8 | +5.3 | +9.1 | +5.3 | a free encore that keeps the higher roll |
| Soft Rock | 2 | +8.1 | +4.7 | +6.0 | +4.0 | d8s and d12s +1 |
| Punk | 2 | +6.7 | +3.0 | +6.9 | +3.0 | +4 on a crit |
| Ska | 2 | +6.7 | +5.0 | +4.7 | +6.0 | +1 per odd roll |
| Barbershop | 2 | +6.6 | +5.0 | +7.4 | +8.3 | +1 per song with all four elements |
| Bluegrass | 2 | +4.6 | +1.3 | +2.0 | +3.0 | d8s roll twice (few d8s are left by the end) |
| Trance | 2 | +4.3 | +1.0 | +2.1 | +0.3 | +3 only at 0 Inspiration, and bards keep Inspiration for encores |
| Baroque | 1 | +2.3 | +0.7 | +0.0 | +0.0 | lifts rolls below 3 to 3; big end-game dice rarely roll that low |

The best Showdown genres add about +12–13 win points: a bard with no genre wins about a third of games, and the same bard with Opera or Grunge wins about half.

## Genres that do nothing in the Showdown (15 of 31)

They trigger on things the Showdown doesn't have, so a bard holding only these enters the finale with no genre at all.

- **Monsters, concerts and the board (fine as is: their value comes earlier):** Gospel (calls a win over a monster), Blues (refreshes a spent song), Disco and K-Pop (Fame for winning monsters over), Dubstep (after moving a monster), Emo (ends a concert), Orchestra (needs 3+ monsters; the Silence is one), Trip-Hop (moves on the board), Lo-fi (cheaper upgrades), Rap (EXP each turn).
- **Could reasonably apply, but the wording rules them out:**
  - **Mariachi** (+2 while sharing a space with another bard): every bard is on the same stage in the Showdown.
  - **Pop** (+2 Inspiration before each concert): a verse could count as a concert.
  - **Soul** (spend 1 Inspiration for +2 to every song): the Showdown has no way to make that choice.
  - **Prog Rock** (3rd and later songs in a concert +2): a performance rolls all of one element's dice at once, so the engine counts it as one song.

## Bot fix found by the audit

The smart bot scored the Silence's immune element as worth 0 in the Showdown even when it held Crossover, which lets that element through. It now counts it (`immuneFactor` in `src/sim/smartBot.ts`), and Crossover's Showdown value rose from nothing to +6–9 Fame.
