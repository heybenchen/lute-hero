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
 *   ROUND=5 STYLES=ostinato npx tsx scripts/style-audit.ts           # buy it for real, from round 5 on (realistic)
 *   OPP=1 ROUND=5 STYLES=ostinato npx tsx scripts/style-audit.ts     # rivals shop for styles too (balance = parity with 1/3)
 *   BUY=3 STYLES=ostinato npx tsx scripts/style-audit.ts             # (older) give it for 3 EXP the first turn that much EXP is unspent
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
import { ALL_STYLE_IDS, styleCostKey } from '../src/data/styles.js'
import { DEFAULT_TUNABLES } from '../src/data/tunables.js'
import type { StyleId, Genre } from '../src/types/index.js'

const GAMES = Number(process.argv[2] ?? 400)
const PLAYERS = 3
const NO_BUY = { ...Object.fromEntries(ALL_STYLE_IDS.map((id) => [styleCostKey(id), 99])), ...JSON.parse(process.env.TUNE ?? '{}') }

function act(s: EngineState, a: Parameters<typeof applyAction>[1], ctx: ActionCtx): EngineState {
  const r = applyAction(s, a, ctx)
  if (!r.ok) throw new Error(`${a.type}: ${r.message}`)
  return r.state
}

/** Bots for every seat: the smart bot by default, the baseline with BOT=baseline. */
const USE_BASELINE = process.env.BOT === 'baseline'
/** BUY=n: instead of holding the style from round 1, the bard pays n EXP for it at the start of the first turn they can afford it. */
const BUY = process.env.BUY !== undefined ? Number(process.env.BUY) : null
/**
 * ROUND=n (the realistic mode): the style goes on the tested bard's shelf from round n on and
 * they buy it at its real price the first turn they can afford it, ahead of dice upgrades.
 * Real games: bards buy their first style in round 5 (middle half rounds 4–6) and a second in
 * round 7, because nobody has spare EXP before then (`scripts/style-timing.ts`).
 */
/**
 * OPP=1: the other bards shop for styles like anyone (real prices, whatever the smart bot likes),
 * so a style is judged against what bots naturally buy. The tested bard still buys the tested style
 * from round ROUND on. A balanced style then wins about 1/3: it is as good as the typical choice.
 * Without OPP rivals hold no styles, which flatters every style.
 */
const OPP = process.env.OPP === '1'
const ROUND = process.env.ROUND !== undefined ? Number(process.env.ROUND) : null

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
  s = { ...s, tunables: { ...s.tunables, ...(OPP ? JSON.parse(process.env.TUNE ?? '{}') : NO_BUY) } }
  s = act(s, { type: 'START_GAME', playerConfigs: genres.map((g, i) => ({ name: `B${i}`, starterGenre: g })) }, ctx)
  // The tested bard sits in a random seat, so seat order doesn't skew results
  const seat = Math.floor(rng() * PLAYERS)
  const pid = s.players[seat].id
  if (styles.length && BUY === null && ROUND === null) s = act(s, { type: 'DEBUG_PATCH', patch: { players: { [pid]: { styles } } } }, ctx)
  const bot = USE_BASELINE ? new Bot(s, rng) : new SmartBot(s, rng)
  const smart = bot instanceof SmartBot ? bot : new SmartBot(s, rng)
  let bought = BUY === null || styles.length === 0
  let buyRound = 0
  const tested = ROUND !== null && styles.length === 1 ? styles[0] : null
  const costKey = tested ? styleCostKey(tested) : ''
  // The tested style's real price (or a TUNE override); everyone else's prices stay out of reach
  const realPrice = tested
    ? (JSON.parse(process.env.TUNE ?? '{}') as Record<string, number>)[costKey] ?? (DEFAULT_TUNABLES as unknown as Record<string, number>)[costKey]
    : 0
  for (let t = 0; t < 40 * PLAYERS && bot.state.phase === 'main'; t++) {
    const me = bot.state.players[seat]
    if (tested && bot.state.currentTurnPlayerIndex === seat) {
      bot.state = { ...bot.state, tunables: { ...bot.state.tunables, [costKey]: realPrice } }
      ;(bot as SmartBot).forcedStyle = { id: tested, fromRound: ROUND! }
      if (!me.styles.includes(tested) && bot.state.currentRound + 1 >= ROUND!) {
        bot.state = { ...bot.state, styleOffers: [tested, ...bot.state.styleOffers.filter((o) => o !== tested)].slice(0, 2) }
      }
    }
    if (tested && bot.state.currentTurnPlayerIndex !== seat) {
      // Other bards never see a style they could afford
      bot.state = { ...bot.state, tunables: { ...bot.state.tunables, [costKey]: 99 } }
    }
    if (!bought && bot.state.currentTurnPlayerIndex === seat && me.exp >= BUY!) {
      bot.state = act(bot.state, { type: 'DEBUG_PATCH', patch: { players: { [pid]: { styles, exp: me.exp - BUY! } } } }, ctx)
      bought = true
    }
    const turnRound = bot.state.currentRound + 1
    bot.takeTurn()
    if (tested && !buyRound && bot.state.players[seat].styles.includes(tested)) buyRound = turnRound
  }
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
    bought: buyRound ? 1 : 0,
    buyRound,
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
  const acc = { win: 0, finalShare: 0, boardShare: 0, fandom: 0, tames: 0, rounds: 0, bought: 0, buyRound: 0 }
  for (let g = 0; g < GAMES; g++) {
    const r = game(styles, 7000 + g) // same seeds per case: paired comparison
    for (const k of Object.keys(acc) as (keyof typeof acc)[]) acc[k] += r[k]
  }
  const f = (k: keyof typeof acc, d = 2) => (acc[k] / GAMES).toFixed(d)
  const buyInfo = ROUND !== null && styles.length === 1 ? `  bought ${(100 * acc.bought / GAMES).toFixed(0)}% in round ${(acc.buyRound / Math.max(1, acc.bought)).toFixed(1)}` : ''
  rows.push(`${((styles.join('+') || 'none') + (process.env.TUNE ?? '') + (BUY !== null ? ` @${BUY}` : '') + (ROUND !== null && styles.length ? ` from R${ROUND}` : '')).padEnd(24)} win ${(100 * acc.win / GAMES).toFixed(1).padStart(5)}%  fame×avg ${f('finalShare')}  board×avg ${f('boardShare')}  fandom ${f('fandom', 1).padStart(5)}  tames ${f('tames', 1)}  rounds ${f('rounds', 1)}${buyInfo}`)
  console.log(rows[rows.length - 1])
}
