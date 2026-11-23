/**
 * Compare the two "ending a concert early" rules with smart bots through the
 * real engine:
 *   moved — only monsters that were moved (wounded) but not won over level up (default)
 *   all   — every monster left on the space levels up
 * Reports game length, EXP and Fame earned, how often concerts end early, and
 * how big the monsters on the board get.
 *
 *   npx tsx scripts/retreat-rule-sim.ts [gamesPerTable]
 */
import { applyAction } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import { mulberry32 } from '../src/engine/rng.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { ALL_GENRES } from '../src/data/genreTheme.js'
import type { EngineState, GameAction } from '../src/types/index.js'

const GAMES = Number(process.argv[2] ?? 300)
const TABLES = [2, 3, 4]
const MAX_ROUNDS = 40

interface Stats {
  games: number
  showdownRound: number[]
  expPerBard: number[]
  famePerBard: number[]
  concerts: number
  endedEarly: number
  levelUpsFromEarlyEnd: number
  // board after each round: [round] -> samples
  chips: Map<number, number[]>
  avgLevel: Map<number, number[]>
  bigMonsters: Map<number, number[]> // Lv4+ monsters on the board
}

const newStats = (): Stats => ({ games: 0, showdownRound: [], expPerBard: [], famePerBard: [], concerts: 0, endedEarly: 0, levelUpsFromEarlyEnd: 0, chips: new Map(), avgLevel: new Map(), bigMonsters: new Map() })
const push = (m: Map<number, number[]>, k: number, v: number) => m.set(k, [...(m.get(k) ?? []), v])

function boardShape(state: EngineState) {
  let chips = 0
  const levels: number[] = []
  for (const s of state.spaces) {
    chips += s.genreTags.length
    for (const g of ALL_GENRES) {
      const n = s.genreTags.filter((t) => t === g).length
      if (n > 0) levels.push(n)
    }
  }
  const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0
  return { chips, avgLevel: avg, big: levels.filter((l) => l >= 4).length }
}

function playGame(players: number, seed: number, levelUpAll: 0 | 1, st: Stats) {
  const rng = mulberry32(seed)
  const genres = [...ALL_GENRES]
  for (let i = genres.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [genres[i], genres[j]] = [genres[j], genres[i]] }
  const started = applyAction(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: genres.slice(0, players).map((g, i) => ({ name: `Bot ${i + 1}`, starterGenre: g })),
  }, { rng, actor: { kind: 'hotseat' } })
  if (!started.ok) throw new Error(started.message)
  const state = { ...started.state, tunables: { ...started.state.tunables, retreatLevelsUpAll: levelUpAll } }
  const bot = new SmartBot(state, rng)

  const expEarned = new Map<string, number>()
  const act = bot.act.bind(bot)
  bot.act = (action: GameAction) => {
    const before = bot.state
    const ok = act(action)
    if (ok && action.type === 'END_COMBAT') {
      st.concerts++
      const fighterId = before.combat.playerId
      for (const p of bot.state.players) {
        const was = before.players.find((q) => q.id === p.id)!
        if (p.exp > was.exp) expEarned.set(p.id, (expEarned.get(p.id) ?? 0) + p.exp - was.exp)
      }
      const left = before.combat.monsters.filter((m) => m.currentHP > 0)
      if (left.length > 0 && fighterId) {
        st.endedEarly++
        const space = before.combat.spaceId
        const chipsBefore = before.spaces.find((s) => s.id === space)!.genreTags.length
        const chipsAfter = bot.state.spaces.find((s) => s.id === space)!.genreTags.length
        const removed = before.combat.monsters.filter((m) => m.currentHP <= 0).reduce((a, m) => a + m.level, 0)
        st.levelUpsFromEarlyEnd += Math.max(0, chipsAfter - (chipsBefore - removed))
      }
    }
    return ok
  }

  let round = bot.state.currentRound
  for (let turns = 0; turns < MAX_ROUNDS * players + players; turns++) {
    if (bot.state.phase !== 'main') break
    bot.takeTurn()
    if (bot.state.currentRound !== round) {
      const b = boardShape(bot.state)
      push(st.chips, round, b.chips)
      push(st.avgLevel, round, b.avgLevel)
      push(st.bigMonsters, round, b.big)
      round = bot.state.currentRound
      if (round > MAX_ROUNDS) break
    }
  }
  st.games++
  if (bot.state.showdownActive) st.showdownRound.push(round - 1)
  for (const p of bot.state.players) {
    st.expPerBard.push(expEarned.get(p.id) ?? 0)
    st.famePerBard.push(p.fame)
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor((s.length - 1) / 2)] ?? 0 }

for (const players of TABLES) {
  const results: Record<string, Stats> = { moved: newStats(), all: newStats() }
  for (let g = 0; g < GAMES; g++) {
    const seed = players * 1_000_003 + g
    playGame(players, seed, 0, results.moved)
    playGame(players, seed, 1, results.all)
  }
  console.log(`\n=== ${players} bards, ${GAMES} games per rule (same seeds) ===`)
  console.log('rule  | showdown after round (median / mean) | EXP per bard | Fame before show | concerts ended early | chips added by ending early (per game)')
  for (const [name, st] of Object.entries(results)) {
    console.log(`${name.padEnd(5)} | ${med(st.showdownRound)} / ${mean(st.showdownRound).toFixed(2)} (${st.showdownRound.length}/${st.games} reached) | ${mean(st.expPerBard).toFixed(1)} | ${mean(st.famePerBard).toFixed(0)} | ${(100 * st.endedEarly / st.concerts).toFixed(1)}% | ${(st.levelUpsFromEarlyEnd / st.games).toFixed(1)}`)
  }
  console.log('board after round: chips on board · avg monster level · Lv4+ monsters   (moved | all)')
  for (const r of [2, 4, 6, 8, 10]) {
    const a = results.moved, b = results.all
    if ((a.chips.get(r)?.length ?? 0) < GAMES / 3) continue
    const f = (st: Stats) => `${mean(st.chips.get(r) ?? []).toFixed(1).padStart(5)} · ${mean(st.avgLevel.get(r) ?? []).toFixed(2)} · ${mean(st.bigMonsters.get(r) ?? []).toFixed(2)}`
    console.log(`  R${String(r).padEnd(2)} ${f(a)}   |   ${f(b)}`)
  }
}
