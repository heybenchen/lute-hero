/**
 * Style power audit: for each style (or pair), one bard holds only that from
 * round 1 while the others hold none (style prices are set out of reach), over
 * many 3-bard bot games played through the real engine and the Final Showdown.
 * The tested bard sits in a random seat and every style uses the same seeds,
 * so rows compare directly against the "none" baseline.
 *
 *   npx tsx scripts/style-audit.ts [games=400]
 *   STYLES=bravo,fermata TUNE='{"bravoFamePerTame":2}' npx tsx scripts/style-audit.ts
 *   STYLES=fortissimo+virtuoso npx tsx scripts/style-audit.ts      # a pair held together
 *   PAIRS=1 npx tsx scripts/style-audit.ts 200                      # every pair
 *
 * Every seat is played by the smart bot (src/sim/smartBot.ts); BOT=baseline
 * uses the simple greedy bot instead.
 *
 * Columns: win share, final Fame vs the table average, board Fame (before the
 * showdown) vs average, showdown fandom, tames, rounds played.
 */
import { applyAction, ActionCtx } from '../src/engine/reducer.js'
import { createInitialEngineState, EngineState } from '../src/engine/state.js'
import { Bot, expectedDieValue } from '../src/sim/bot.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { ALL_GENRES } from '../src/data/genreTheme.js'
import { ALL_STYLE_IDS } from '../src/data/styles.js'
import type { StyleId, Genre } from '../src/types/index.js'

const GAMES = Number(process.argv[2] ?? 400)
const PLAYERS = 3
const NO_BUY = { ...Object.fromEntries(ALL_STYLE_IDS.map((id) => [`styleCost${id[0].toUpperCase()}${id.slice(1)}`, 99])), ...JSON.parse(process.env.TUNE ?? '{}') }

function act(s: EngineState, a: Parameters<typeof applyAction>[1], ctx: ActionCtx): EngineState {
  const r = applyAction(s, a, ctx)
  if (!r.ok) throw new Error(`${a.type}: ${r.message}`)
  return r.state
}

/** Bots for every seat: the smart bot by default, the baseline with BOT=baseline. */
const USE_BASELINE = process.env.BOT === 'baseline'

function playShowdown(s: EngineState, ctx: ActionCtx, smart: SmartBot): EngineState {
  for (let guard = 0; guard < 50 && s.showdownActive && !s.showdownComplete; guard++) {
    if (!USE_BASELINE) {
      smart.state = s
      smart.playShowdownTurn()
      s = smart.state
      continue
    }
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
    const fallback = performer.songs.find((sg) => sg.slots[0]?.dice)?.id
    const songId = best?.songId ?? fallback
    if (songId) s = act(s, { type: 'PLAY_SHOWDOWN_SONG', songId }, ctx)
    s = act(s, { type: 'FINISH_SHOWDOWN_PERFORMANCE' }, ctx)
  }
  return s
}

function game(styles: StyleId[], seed: number) {
  const rng = mulberry32(seed)
  const ctx: ActionCtx = { rng, actor: { kind: 'hotseat' } }
  const genres = [...ALL_GENRES].sort(() => rng() - 0.5).slice(0, PLAYERS)
  let s = createInitialEngineState()
  s = { ...s, tunables: { ...s.tunables, ...NO_BUY } }
  s = act(s, { type: 'START_GAME', playerConfigs: genres.map((g, i) => ({ name: `B${i}`, starterGenre: g })) }, ctx)
  // The tested bard sits in a random seat, so seat order doesn't skew results
  const seat = Math.floor(rng() * PLAYERS)
  const pid = s.players[seat].id
  if (styles.length) s = act(s, { type: 'DEBUG_PATCH', patch: { players: { [pid]: { styles } } } }, ctx)
  const bot = USE_BASELINE ? new Bot(s, rng) : new SmartBot(s, rng)
  const smart = bot instanceof SmartBot ? bot : new SmartBot(s, rng)
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) bot.takeTurn()
  const boardFame = bot.state.players.map((p) => p.fame)
  const end = playShowdown(bot.state, ctx, smart)
  const final = end.players.map((p) => p.fame)
  const max = Math.max(...final)
  const winners = final.filter((f) => f === max).length
  return {
    win: final[seat] === max ? 1 / winners : 0,
    finalShare: final[seat] / (final.reduce((a, b) => a + b, 0) / PLAYERS),
    boardShare: boardFame[seat] / (boardFame.reduce((a, b) => a + b, 0) / PLAYERS),
    fandom: (end.showdownFandom[pid] ?? 0),
    tames: end.players[seat].monstersDefeated,
    rounds: end.currentRound,
  }
}

const rows: string[] = []
// STYLES=a,b,c tests each; a+b tests a pair held together; PAIRS=1 tests every pair
// PAIRS=1 runs every pair; PAIRS=2/4 runs the 2nd quarter of them (for parallel runs)
const [slice, slices] = (process.env.PAIRS ?? '1/1').split('/').map(Number)
const pairs = process.env.PAIRS
  ? ALL_STYLE_IDS.flatMap((a, i) => ALL_STYLE_IDS.slice(i + 1).map((b) => [a, b]))
      .filter((_, i) => slices > 1 ? i % slices === slice - 1 : true)
  : null
const cases: StyleId[][] = pairs ?? (process.env.STYLES?.split(',').map((c) => (c === 'none' ? [] : (c.split('+') as StyleId[])))
  ?? [[], ...ALL_STYLE_IDS.map((id) => [id])])
for (const styles of cases) {
  const acc = { win: 0, finalShare: 0, boardShare: 0, fandom: 0, tames: 0, rounds: 0 }
  for (let g = 0; g < GAMES; g++) {
    const r = game(styles, 7000 + g) // same seeds per case: paired comparison
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] += r[k]
  }
  const f = (k: keyof typeof acc, d = 2) => (acc[k] / GAMES).toFixed(d)
  rows.push(`${((styles.join('+') || 'none') + (process.env.TUNE ?? '')).padEnd(24)} win ${(100 * acc.win / GAMES).toFixed(1).padStart(5)}%  fame×avg ${f('finalShare')}  board×avg ${f('boardShare')}  fandom ${f('fandom', 1).padStart(5)}  tames ${f('tames', 1)}  rounds ${f('rounds', 1)}`)
  console.log(rows[rows.length - 1])
}
