/**
 * What is an Inspiration worth? One bard (random seat) starts the game with a
 * bonus, the others don't; smart bots everywhere, natural style shopping, same
 * seeds for every bonus so rows compare directly (parity is 33.3%).
 *
 *   BONUS='{"inspiration":5}' npx tsx scripts/inspiration-value.ts [games=400]
 *   BONUS='{"exp":3}' ...
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_GENRES } from '../src/data/genreTheme.js'

const GAMES = Number(process.argv[2] ?? 400)
const BONUS = JSON.parse(process.env.BONUS ?? '{}') as { inspiration?: number; exp?: number }
const TUNE = JSON.parse(process.env.TUNE ?? '{}')
const PLAYERS = 3
let win = 0
let fame = 0
for (let g = 0; g < GAMES; g++) {
  const rng = mulberry32(7000 + g)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const genres = [...ALL_GENRES].sort(() => rng() - 0.5).slice(0, PLAYERS)
  const init = createInitialEngineState()
  const r = applyAction({ ...init, tunables: { ...init.tunables, ...TUNE } }, { type: 'START_GAME', playerConfigs: genres.map((x, i) => ({ name: `B${i}`, starterGenre: x })) }, ctx)
  if (!r.ok) throw new Error(r.message)
  let s = r.state
  const seat = Math.floor(rng() * PLAYERS)
  s = { ...s, players: s.players.map((p, i) => (i === seat ? { ...p, inspiration: p.inspiration + (BONUS.inspiration ?? 0), exp: p.exp + (BONUS.exp ?? 0) } : p)) }
  const bot = new SmartBot(s, rng)
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) bot.takeTurn()
  for (let t = 0; t < 40 && bot.state.showdownActive && !bot.state.showdownComplete; t++) bot.playShowdownTurn()
  const f = bot.state.players.map((p) => p.fame)
  const max = Math.max(...f)
  win += f[seat] === max ? 1 / f.filter((x) => x === max).length : 0
  fame += f[seat] / (f.reduce((a, b) => a + b, 0) / PLAYERS)
}
console.log(`${JSON.stringify(BONUS)}${process.env.TUNE ? ' ' + process.env.TUNE : ''}: win ${(100 * win / GAMES).toFixed(1)}%  fame×avg ${(fame / GAMES).toFixed(3)}`)
