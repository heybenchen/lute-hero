/**
 * Genre lab: simulate data-defined genres (src/data/genreSpecBatches.ts)
 * with smart bots. For each genre, one bard holds only it from round 1 while
 * the others hold no genres; 3-bard games through the Final Showdown, random
 * seat, shared seeds. A no-genre baseline row comes first.
 *
 *   npx tsx scripts/genre-lab.ts [games=300]            # every spec
 *   BATCH=1 npx tsx scripts/genre-lab.ts 300           # one batch (1-based)
 *   SPECS=hot-streak,glass-cannon npx tsx scripts/genre-lab.ts
 *   PARALLEL=2/4 ...                                   # the 2nd quarter (for parallel runs)
 *
 * Prints: id, win share, final Fame vs table average, then the rule.
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState, EngineState } from '../src/engine/state.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_ELEMENTS } from '../src/data/elementTheme.js'
import { ALL_GENRE_IDS, genreCostKey } from '../src/data/genres.js'
import { GENRE_SPEC_BATCHES } from '../src/data/genreSpecBatches.js'
import { GENRE_SPECS } from '../src/data/genreSpecs.js'

const GAMES = Number(process.argv[2] ?? 300)
const PLAYERS = 3
const NO_BUY = Object.fromEntries(ALL_GENRE_IDS.map((id) => [genreCostKey(id), 99]))

function game(specId: string | null, seed: number) {
  const rng = mulberry32(seed)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const elements = [...ALL_ELEMENTS].sort(() => rng() - 0.5).slice(0, PLAYERS)
  let s: EngineState = { ...createInitialEngineState() }
  s = { ...s, tunables: { ...s.tunables, ...NO_BUY } }
  const r = applyAction(s, { type: 'START_GAME', playerConfigs: elements.map((g, i) => ({ name: `B${i}`, starterElement: g })) }, ctx)
  if (!r.ok) throw new Error(r.message)
  s = r.state
  const seat = Math.floor(rng() * PLAYERS)
  if (specId) s = { ...s, players: s.players.map((p, i) => (i === seat ? { ...p, specGenres: [specId] } : p)) }
  const bot = new SmartBot(s, rng)
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) bot.takeTurn()
  for (let t = 0; t < 40 && bot.state.showdownActive && !bot.state.showdownComplete; t++) bot.playShowdownTurn()
  const fame = bot.state.players.map((p) => p.fame)
  const max = Math.max(...fame)
  const winners = fame.filter((f) => f === max).length
  return {
    win: fame[seat] === max ? 1 / winners : 0,
    share: fame[seat] / (fame.reduce((a, b) => a + b, 0) / PLAYERS),
  }
}

let ids: (string | null)[]
if (process.env.SPECS) ids = process.env.SPECS.split(',').map((x) => (x === 'none' ? null : x))
else if (process.env.BATCH) ids = (GENRE_SPEC_BATCHES[Number(process.env.BATCH) - 1] ?? []).map((s) => s.id)
else ids = GENRE_SPEC_BATCHES.flat().map((s) => s.id)
if (process.env.PARALLEL) {
  const [k, n] = process.env.PARALLEL.split('/').map(Number)
  ids = ids.filter((_, i) => i % n === k - 1)
}
if (process.env.BASELINE !== '0') ids = [null, ...ids]

for (const id of ids) {
  let win = 0
  let share = 0
  for (let g = 0; g < GAMES; g++) {
    const r = game(id, 7000 + g)
    win += r.win
    share += r.share
  }
  const spec = id ? GENRE_SPECS[id] : null
  console.log(`${(id ?? 'none').padEnd(22)}\t${(100 * win / GAMES).toFixed(1)}%\t${(share / GAMES).toFixed(2)}\t${spec ? `${spec.name} [${spec.theme}] — ${spec.rule}` : 'no genre'}`)
}
