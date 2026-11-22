/**
 * Bot tournament: mixed tables of the smart bot (src/sim/smartBot.ts) and the
 * baseline greedy bot (src/sim/bot.ts), played through the real engine and the
 * Final Showdown. Seats are shuffled every game; reports each side's share of
 * wins (ties split) and average final Fame.
 *
 *   npx tsx scripts/bot-tournament.ts [games=300] [lineup=SBB]
 *   PARAMS='{"songCost":0.4}' npx tsx scripts/bot-tournament.ts 300 SSB
 *   VS='{"songCost":0.8}' npx tsx scripts/bot-tournament.ts 300 SV   # smart vs smart variant
 *
 * Lineup letters: S = smart (PARAMS), V = smart variant (VS), B = baseline,
 * X = smart on the board but the baseline's showdown (isolates the showdown play).
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState, EngineState } from '../src/engine/state.js'
import { Bot, expectedDieValue } from '../src/sim/bot.js'
import { SmartBot, SmartParams } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_GENRES } from '../src/data/genreTheme.js'
import type { Genre } from '../src/types/index.js'

const GAMES = Number(process.argv[2] ?? 300)
const LINEUP = (process.argv[3] ?? 'SBB').split('') as ('S' | 'V' | 'B' | 'X')[]
const PARAMS: Partial<SmartParams> = JSON.parse(process.env.PARAMS ?? '{}')
const VS: Partial<SmartParams> = JSON.parse(process.env.VS ?? '{}')
/** Tunable overrides for every seat, e.g. TUNE='{"inspirationCostStep":0}'. */
const TUNE = JSON.parse(process.env.TUNE ?? '{}')

/** The baseline's showdown: the element with the highest expected total, no rerolls. */
function baselineShowdownTurn(s: EngineState, ctx: ActionCtx): EngineState {
  const performer = s.players.find((p) => p.id === s.showdownOrder[s.showdownPerformerIdx])!
  const byGenre = new Map<Genre, { total: number; songId: string }>()
  for (const song of performer.songs) {
    const d = song.slots[0]?.dice
    if (!d || d.genre === s.showdownResistGenre) continue
    const e = byGenre.get(d.genre) ?? { total: 0, songId: song.id }
    e.total += expectedDieValue(d.type)
    byGenre.set(d.genre, e)
  }
  const best = [...byGenre.values()].sort((a, b) => b.total - a.total)[0]
  const songId = best?.songId ?? performer.songs.find((sg) => sg.slots[0]?.dice)?.id
  let next = s
  if (songId) {
    const r = applyAction(next, { type: 'PLAY_SHOWDOWN_SONG', songId }, ctx)
    if (r.ok) next = r.state
  }
  const f = applyAction(next, { type: 'FINISH_SHOWDOWN_PERFORMANCE' }, ctx)
  return f.ok ? f.state : next
}

function game(seed: number) {
  const rng = mulberry32(seed)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const n = LINEUP.length
  const genres = [...ALL_GENRES].sort(() => rng() - 0.5).slice(0, n)
  const seats = [...LINEUP].sort(() => rng() - 0.5)
  const init = createInitialEngineState()
  const started = applyAction({ ...init, tunables: { ...init.tunables, ...TUNE } }, { type: 'START_GAME', playerConfigs: genres.map((g, i) => ({ name: `P${i}`, starterGenre: g })) }, ctx)
  if (!started.ok) throw new Error(started.message)
  let s = started.state
  const smart = new SmartBot(s, rng, PARAMS)
  const variant = new SmartBot(s, rng, VS)
  const base = new Bot(s, rng)
  const kindOf = (id: string) => seats[s.players.findIndex((p) => p.id === id)]

  for (let t = 0; t < 45 * n && s.phase === 'main'; t++) {
    const k = kindOf(s.players[s.currentTurnPlayerIndex].id)
    const bot = k === 'S' || k === 'X' ? smart : k === 'V' ? variant : base
    bot.state = s
    bot.takeTurn()
    s = bot.state
  }
  for (let g = 0; g < 40 && s.showdownActive && !s.showdownComplete; g++) {
    const k = kindOf(s.showdownOrder[s.showdownPerformerIdx])
    if (k === 'B' || k === 'X') s = baselineShowdownTurn(s, ctx)
    else {
      const bot = k === 'S' ? smart : variant
      bot.state = s
      bot.playShowdownTurn()
      s = bot.state
    }
  }
  const fame = s.players.map((p) => p.fame)
  const max = Math.max(...fame)
  const winners = fame.filter((f) => f === max).length
  return { seats, fame, win: fame.map((f) => (f === max ? 1 / winners : 0)), rounds: s.currentRound }
}

const totals: Record<string, { win: number; fame: number; seats: number }> = {}
let rounds = 0
const t0 = Date.now()
for (let g = 0; g < GAMES; g++) {
  const r = game(90_000 + g)
  rounds += r.rounds
  r.seats.forEach((k, i) => {
    totals[k] ??= { win: 0, fame: 0, seats: 0 }
    totals[k].win += r.win[i]
    totals[k].fame += r.fame[i]
    totals[k].seats++
  })
}
const label = { S: 'smart', V: 'variant', B: 'baseline', X: 'smart-board/basic-showdown' } as const
const parts = Object.entries(totals).map(([k, v]) =>
  `${label[k as 'S']} win ${(100 * v.win / GAMES / (v.seats / GAMES)).toFixed(1)}% per seat (fair ${(100 / LINEUP.length).toFixed(1)}%), fame ${(v.fame / v.seats).toFixed(0)}`)
console.log(`${LINEUP.join('')} ×${GAMES}: ${parts.join(' | ')} | rounds ${(rounds / GAMES).toFixed(1)} | ${((Date.now() - t0) / GAMES).toFixed(0)}ms/game`)
