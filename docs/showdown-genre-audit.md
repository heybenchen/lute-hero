# Genres in the Final Showdown

Measured with `npx tsx scripts/showdown-genre-audit.ts` (3 bards, 300 smart-bot games per pace). Each game is played to the start of the Showdown, then the Showdown is replayed once per genre: every bard's genres are cleared, the tested bard (seat 1) holds only that genre, and every replay uses the same dice seed. "Fame" is Showdown Fame (rounded fandom + crown bonuses); "wins" is how often the tested bard wins the game, which only the Showdown can change here. Baseline with no genre: typical 64.0 fandom / 104.6 Fame / 28% wins; expert 62.9 / 108.0 / 38%.

## Genres that help in the Showdown

| Genre | Price | Typical: Fame Δ | Typical: wins Δ | Expert: Fame Δ | Expert: wins Δ | Why |
|---|---|---|---|---|---|---|
| Screamo | 2 | +14.9 | +10.7 | +16.4 | +11.7 | +3 to the first song each turn: every performance is a first song |
| Opera | 2 | +11.6 | +11.0 | +17.3 | +13.3 | d20s +2 to the rolled value; end-game setlists are d20-heavy |
| New Age | 1 | +11.9 | +9.0 | +11.0 | +8.3 | the 7th song adds a die to an element's performance |
| Soft Rock | 2 | +11.8 | +8.0 | +6.4 | +5.0 | d8s and d12s +1 |
| Indie | 2 | +11.5 | +10.0 | +8.0 | +4.3 | crits one number lower |
| Country | 1 | +10.6 | +7.0 | +5.8 | +2.3 | starting-element dice +1 |
| Crossover | 2 | +10.0 | +8.7 | +5.7 | +1.3 | can keep performing the element the Silence is immune to |
| Bebop | 1 | +9.3 | +5.0 | +4.6 | +2.0 | a free encore that keeps the higher roll |
| Barbershop | 2 | +7.4 | +3.7 | +8.0 | +6.0 | +1 per song with all four elements |
| Punk | 2 | +7.2 | +4.3 | +4.5 | +0.7 | +4 on a crit |
| House | 2 | +6.0 | +4.0 | +4.5 | +1.7 | builds +1 per same-element die in a verse |
| Ska | 2 | +6.0 | +5.3 | +4.1 | +2.7 | +1 per odd roll |
| Bluegrass | 2 | +5.0 | +6.0 | +2.0 | +1.0 | d8s roll twice (few d8s are left by the end) |
| Baroque | 1 | +4.8 | +3.3 | +3.6 | +1.7 | low rolls +1 |
| Trance | 2 | +2.7 | +1.3 | +3.1 | +0.0 | +3 only at 0 Inspiration, and bards keep Inspiration for encores |

Winning the Showdown is worth roughly +10 win points for the best genres: about a third more wins than a bard with no genre.

## Genres that do nothing in the Showdown (16 of 31)

They trigger on things the Showdown doesn't have, so a bard holding only these enters the finale with no genre at all.

- **Monsters, concerts and the board (fine as is: their value comes earlier):** Gospel (calls a win over a monster), Blues (refreshes a spent song), Disco and K-Pop (Fame for winning monsters over), Grunge and Dubstep (after moving or winning a monster), Emo (ends a concert), Orchestra (needs 3+ monsters; the Silence is one), Trip-Hop (moves on the board), Lo-fi (cheaper upgrades), Rap (EXP each turn).
- **Could reasonably apply, but the wording rules them out:**
  - **Mariachi** (+2 while sharing a space with another bard): every bard is on the same stage in the Showdown.
  - **Pop** (+2 Inspiration before each concert): a verse could count as a concert.
  - **Soul** (spend 1 Inspiration for +2 to every song): the Showdown has no way to make that choice.
  - **Prog Rock** (4th and later songs in a concert +2): a performance rolls all of one element's dice at once, so the engine counts it as one song. The smart bot's odds counted each die separately, so it overrated Prog Rock here.

## Bot fix found by the audit

The smart bot scored the Silence's immune element as worth 0 in the Showdown even when it held Crossover, which lets that element through. It now counts it (`immuneFactor` in `src/sim/smartBot.ts`). Crossover's Showdown value rose from nothing to +5.7–10 Fame.
