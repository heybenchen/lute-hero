/**
 * When do bards actually buy genres? Plays normal 3-bard smart-bot games
 * (genres on sale at their real prices) and records the round of each bard's
 * first and second genre purchase, plus how many ever buy one.
 * The genre audit's ROUND mode uses these to hand a genre over at a
 * realistic moment instead of from round 1.
 *
 *   npx tsx scripts/genre-timing.ts [games=200]
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_ELEMENTS } from '../src/data/elementTheme.js'

const GAMES = Number(process.argv[2] ?? 200)
const PLAYERS = 3
const first: number[] = []
const second: number[] = []
let bards = 0
let neverBought = 0
const expAtTurn: Record<number, number[]> = {}

for (let g = 0; g < GAMES; g++) {
  const rng = mulberry32(7000 + g)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const elements = [...ALL_ELEMENTS].sort(() => rng() - 0.5).slice(0, PLAYERS)
  const r = applyAction(createInitialEngineState(), { type: 'START_GAME', playerConfigs: elements.map((x, i) => ({ name: `B${i}`, starterElement: x })) }, ctx)
  if (!r.ok) throw new Error(r.message)
  const bot = new SmartBot(r.state, rng)
  const seen = new Array(PLAYERS).fill(0)
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) {
    const round = bot.state.currentRound + 1
    const idx = bot.state.currentTurnPlayerIndex
    ;(expAtTurn[round] ??= []).push(bot.state.players[idx].exp)
    bot.takeTurn()
    const n = bot.state.players[idx].genres.length
    if (n > seen[idx]) {
      ;(seen[idx] === 0 ? first : second).push(round)
      seen[idx] = n
    }
  }
  bards += PLAYERS
  neverBought += seen.filter((n) => n === 0).length
}
const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const at = (p: number) => s[Math.min(s.length - 1, Math.floor(p * s.length))]
  return `median round ${at(0.5)}  (25th ${at(0.25)}, 75th ${at(0.75)})  mean ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)}`
}
console.log(`bards ${bards}, bought at least one genre: ${(100 * (1 - neverBought / bards)).toFixed(0)}%`)
console.log('first genre :', stats(first))
console.log('second genre:', second.length ? stats(second) : 'none')
const dist = new Map<number, number>()
for (const r of first) dist.set(r, (dist.get(r) ?? 0) + 1)
console.log('first-genre round histogram:', [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([r, c]) => `R${r}:${c}`).join(' '))
console.log('mean EXP held at the start of a turn, by round:', Object.entries(expAtTurn).slice(0, 8).map(([r, xs]) => `R${r}:${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)}`).join(' '))
