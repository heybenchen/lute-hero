# Can a bard who is behind still win the Final Showdown?

Measured with `npx tsx scripts/showdown-comeback.ts` (smart bots; each game is played to the Showdown once, then every variant replays or re-scores the Showdown from that same state with the same dice seed). "Leader wins" is how often the bard with the most Fame going into the Showdown wins; parity is 33% at a 3-bard table.

## Findings

- **The leader wins 94–97% of games under the current rules.** They go into the Showdown 84–99 Fame ahead of second place, but a bard earns only ~70 fandom across the three verses, so the Showdown can almost never close the gap.
- **A lower fame gate doesn't help** (gate 150: 90–92%, gate 100: 89–94%). The lead comes from snowballing and from the final round everyone plays after the gate, not from how long the game runs.
- **The leader also has the best dice.** Even if Fame counted for nothing and only Showdown fandom scored, they would win 43–48%.
- **Extra Inspiration for trailing bards does nothing** (94–96%): encores only redraw a roll and can't make up 80+ points. More verses (88–93%) are weak for the same reason.
- Any flat bonus scaled to how far behind a bard is amounts to counting Fame for less, so the real levers are: how much a Fame lead is worth, how swingy the Showdown is, and whether the leader's dice advantage is taxed.

## Results (3 bards, 300 games each)

| Variant | Leader wins (expert) | Leader wins (typical) | Last place wins (typical) |
|---|---|---|---|
| Current rules | 94% | 97% | 0% |
| Fame gate 150 / 100 | 90% / 94% | 92% / 89% | 0–1% |
| Five verses | 88% | 93% | 1% |
| Catch-up Inspiration (+1 per 10 Fame behind) | 94% | 95% | 0% |
| Fandom ×2 / ×3 / ×4 / ×6 | 87 / 81 / 77 / 71% | 89 / 82 / 78 / 70% | 1 / 3 / 4 / 7% |
| Verse crowns (+30 Fame to each verse's best) | 82% | 83% | 2% |
| Silence targets the leader (their performance counts half) | 81% | 84% | 0% |
| Stolen fans (each verse's best takes 1/4 of it from the leader) | 83% | 85% | 1% |
| Underdog boost (fandom × leader's Fame / own Fame) | 77% | 67% | 23% |
| Fame becomes a head start, 30/15/0 by rank | 80% | 76% | 4% |
| Fame becomes a head start, 20/10/0 by rank | 67% | 67% | 8% |
| Fame becomes a head start, 10/5/0 by rank | 54% | 56% | 15% |
| Head start 20/10/0 + Silence targets the leader | 39% | 39% | 23% |
| Underdog boost + Fame counts half | 37% | 30% | 52% |
| Showdown fandom only (Fame breaks ties) | 43% | 48% | 24% |

At other table sizes (typical pace, 200 games): 2 bards (parity 50%): current 97%, head start 20/10 77%, 10/5 72%, fandom only 64%. 4 bards (parity 25%): current 89%, head start 20/10 57%, 10/5 47%, underdog boost 52%.

Re-run after the switch from styles to genres (3 bards, typical pace, 300 games): current rules 92%, fandom ×6 72%, head start 20/10/0 66%, 10/5/0 57%, head start 20/10/0 + Silence targets the leader 47%, fandom only 48%. Same picture.

The re-scored variants assume the bots would play the Showdown the same way under the new rule. Bots maximise their own fandom either way, so that holds closely.
