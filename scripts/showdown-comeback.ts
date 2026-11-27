/**
 * Can a bard who is behind at the Final Showdown still win?
 *
 * Plays smart-bot games to the start of the Showdown, then replays the
 * Showdown from that same state under each variant, with the same dice seed
 * per game (so variants differ only by their rule). Reports how often the bard
 * leading going into the Showdown wins, how often the last-placed one does,
 * and how often the Showdown changed the winner.
 *
 *   npx tsx scripts/showdown-comeback.ts            (GAMES=300 PLAYERS=3 PACE=expert|typical|learning)
 *   ONLY=steal npx tsx scripts/showdown-comeback.ts   only variants whose name matches (plus the current rules)
 *   GATES=150,100 npx tsx scripts/showdown-comeback.ts   also plays whole games at other fame gates
 *
 * Variants marked "scoring" re-score the same performances; "replay" variants
 * change the state or tunables and replay the Showdown with the bots.
 */
import { applyAction } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import { ALL_ELEMENTS } from '../src/data/elementTheme.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import type { EngineState } from '../src/engine/state.js'
import { DEFAULT_TUNABLES } from '../src/data/tunables.js'
import { paceSkill, SimulationPace } from '../src/data/simulationPaces.js'

const GAMES = Number(process.env.GAMES ?? 300)
const PLAYERS = Number(process.env.PLAYERS ?? 3)
const PACE = (process.env.PACE ?? 'expert') as SimulationPace
const GATES = (process.env.GATES ?? '').split(',').filter(Boolean).map(Number)
const skill = paceSkill(PACE)

/** One Showdown played out: each bard's fandom per verse (index = verse - 1). */
interface Played {
  verses: Record<string, number[]>
}

function playShowdown(start: EngineState, seed: number): Played {
  const bot = new SmartBot(start, mulberry32(seed), { skill })
  const verses: Record<string, number[]> = Object.fromEntries(start.players.map((p) => [p.id, []]))
  for (let guard = 0; guard < 200 && bot.state.phase === 'finalBoss' && !bot.state.showdownComplete; guard++) {
    const performer = bot.state.showdownOrder[bot.state.showdownPerformerIdx]
    const before = bot.state.showdownFandom[performer] ?? 0
    bot.playShowdownTurn()
    verses[performer].push((bot.state.showdownFandom[performer] ?? 0) - before)
  }
  return { verses }
}

type Score = (fame: Record<string, number>, played: Played) => Record<string, number>

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
const plain: Score = (fame, p) => Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] + sum(p.verses[id])]))
const times = (k: number): Score => (fame, p) => Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] + k * sum(p.verses[id])]))

interface Variant {
  name: string
  kind: 'scoring' | 'replay'
  /** Change the Showdown's starting state (replay variants). */
  prepare?: (s: EngineState) => EngineState
  score: Score
}

const leaderOf = (fame: Record<string, number>) => Object.keys(fame).sort((a, b) => fame[b] - fame[a])[0]

const VARIANTS: Variant[] = [
  { name: 'Current rules', kind: 'scoring', score: plain },
  { name: 'Fandom x2', kind: 'scoring', score: times(2) },
  { name: 'Fandom x3', kind: 'scoring', score: times(3) },
  {
    name: 'Five verses',
    kind: 'replay',
    prepare: (s) => ({ ...s, tunables: { ...s.tunables, showdownTurns: 5 } }),
    score: plain,
  },
  {
    name: 'Catch-up Inspiration (+1 per 20 Fame behind)',
    kind: 'replay',
    prepare: (s) => {
      const top = Math.max(...s.players.map((p) => p.fame))
      return { ...s, players: s.players.map((p) => ({ ...p, inspiration: p.inspiration + Math.floor((top - p.fame) / 20) })) }
    },
    score: plain,
  },
  {
    // Each bard's fandom is multiplied by how far behind the leader they started
    name: 'Underdog boost (fandom x leader/own Fame)',
    kind: 'scoring',
    score: (fame, p) => {
      const top = Math.max(...Object.values(fame))
      return Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] + sum(p.verses[id]) * (top / Math.max(1, fame[id]))]))
    },
  },
  {
    // The best performance of each verse earns a flat prize
    name: 'Verse crowns (+30 Fame to each verse\'s best)',
    kind: 'scoring',
    score: (fame, p) => {
      const total = plain(fame, p)
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const best = Object.keys(fame).sort((a, b) => (p.verses[b][v] ?? 0) - (p.verses[a][v] ?? 0))[0]
        total[best] += 30
      }
      return total
    },
  },
  {
    // The Silence presses on whoever is ahead: their performance counts half each verse
    name: 'Silence targets the leader (leader scores half)',
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        for (const id of Object.keys(fame)) total[id] += (p.verses[id][v] ?? 0) * (id === lead ? 0.5 : 1)
      }
      return total
    },
  },
  {
    // Showdown fans are converted from rivals: each verse's best performance takes
    // a quarter of its fandom from the bard leading at that moment (if that isn't them)
    name: 'Stolen fans (verse best takes 1/4 of it from the leader)',
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        const best = Object.keys(fame).sort((a, b) => (p.verses[b][v] ?? 0) - (p.verses[a][v] ?? 0))[0]
        for (const id of Object.keys(fame)) total[id] += p.verses[id][v] ?? 0
        if (best !== lead) {
          const take = Math.floor((p.verses[best][v] ?? 0) / 4)
          total[lead] -= take
          total[best] += take
        }
      }
      return total
    },
  },
  {
    name: 'Catch-up Inspiration (+1 per 10 Fame behind)',
    kind: 'replay',
    prepare: (s) => {
      const top = Math.max(...s.players.map((p) => p.fame))
      return { ...s, players: s.players.map((p) => ({ ...p, inspiration: p.inspiration + Math.floor((top - p.fame) / 10) })) }
    },
    score: plain,
  },
  {
    // Fame only sets a head start: placement points 2x / 1x / 0 of an average verse (40/20/0), then fandom decides
    name: 'Fame becomes a head start (40/20/0 by rank)',
    kind: 'scoring',
    score: (fame, p) => {
      const order = Object.keys(fame).sort((a, b) => fame[b] - fame[a])
      const head = [40, 20, 0, 0]
      return Object.fromEntries(order.map((id, i) => [id, head[i] + sum(p.verses[id]) + fame[id] / 10_000]))
    },
  },
  {
    name: 'Showdown fandom only (Fame breaks ties)',
    kind: 'scoring',
    score: (fame, p) => Object.fromEntries(Object.keys(fame).map((id) => [id, sum(p.verses[id]) + fame[id] / 10_000])),
  },
  { name: 'Fandom x4', kind: 'scoring', score: times(4) },
  { name: 'Fandom x6', kind: 'scoring', score: times(6) },
  ...[30, 20, 10].map((h): Variant => ({
    name: `Fame becomes a head start (${h}/${h / 2}/0 by rank)`,
    kind: 'scoring',
    score: (fame, p) => {
      const order = Object.keys(fame).sort((a, b) => fame[b] - fame[a])
      const head = [h, h / 2, 0, 0]
      return Object.fromEntries(order.map((id, i) => [id, head[i] + sum(p.verses[id]) + fame[id] / 10_000]))
    },
  })),
  {
    // Underdog boost, but on top of Fame counting half
    name: 'Underdog boost + Fame counts half',
    kind: 'scoring',
    score: (fame, p) => {
      const top = Math.max(...Object.values(fame))
      return Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] / 2 + sum(p.verses[id]) * (top / Math.max(1, fame[id]))]))
    },
  },
  {
    name: 'Head start 20/10/0 + Silence targets the leader',
    kind: 'scoring',
    score: (fame, p) => {
      const order = Object.keys(fame).sort((a, b) => fame[b] - fame[a])
      const total: Record<string, number> = Object.fromEntries(order.map((id, i) => [id, [20, 10, 0, 0][i] + fame[id] / 10_000]))
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        for (const id of Object.keys(fame)) total[id] += (p.verses[id][v] ?? 0) * (id === lead ? 0.5 : 1)
      }
      return total
    },
  },
  ...[2, 3].map((k): Variant => ({
    name: `Fandom x${k} + underdog boost`,
    kind: 'scoring',
    score: (fame, p) => {
      const top = Math.max(...Object.values(fame))
      return Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] + k * sum(p.verses[id]) * (top / Math.max(1, fame[id]))]))
    },
  })),
  ...[2, 3].map((k): Variant => ({
    name: `Fandom x${k} + Silence targets the leader`,
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        for (const id of Object.keys(fame)) total[id] += k * (p.verses[id][v] ?? 0) * (id === lead ? 0.5 : 1)
      }
      return total
    },
  })),
  ...[2, 3].map((k): Variant => ({
    // Each verse's best performance takes half its (multiplied) fandom from the leader
    name: `Fandom x${k} + stolen fans (half, from the leader)`,
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        const best = Object.keys(fame).sort((a, b) => (p.verses[b][v] ?? 0) - (p.verses[a][v] ?? 0))[0]
        for (const id of Object.keys(fame)) total[id] += k * (p.verses[id][v] ?? 0)
        if (best !== lead) {
          const take = Math.floor((k * (p.verses[best][v] ?? 0)) / 2)
          total[lead] -= take
          total[best] += take
        }
      }
      return total
    },
  })),
  {
    // Verse crowns sized like a big concert: the best performance of each verse wins a Lv4 monster's Fame
    name: 'Fandom x2 + verse crowns (+50 Fame)',
    kind: 'scoring',
    score: (fame, p) => {
      const total = times(2)(fame, p)
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const best = Object.keys(fame).sort((a, b) => (p.verses[b][v] ?? 0) - (p.verses[a][v] ?? 0))[0]
        total[best] += 50
      }
      return total
    },
  },
  ...([[2, 1], [2, 0.5], [1, 1], [3, 0.5]] as const).map(([k, share]): Variant => ({
    // Outplay the leader: every bard whose performance beats the verse-start leader's
    // takes (share x) the margin, in Fame, from the leader
    name: `Fandom x${k} + outplay steals ${share === 1 ? 'the' : 'half the'} margin from the leader`,
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const lead = leaderOf(total)
        const leadPerf = p.verses[lead][v] ?? 0
        for (const id of Object.keys(fame)) total[id] += k * (p.verses[id][v] ?? 0)
        for (const id of Object.keys(fame)) {
          if (id === lead) continue
          const margin = Math.floor(k * share * Math.max(0, (p.verses[id][v] ?? 0) - leadPerf))
          total[lead] -= margin
          total[id] += margin
        }
      }
      return total
    },
  })),
  {
    // The verse's best performance takes half of it from every bard ahead of its performer
    name: 'Fandom x2 + verse best steals half from everyone ahead',
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const before = { ...total }
        const best = Object.keys(fame).sort((a, b) => (p.verses[b][v] ?? 0) - (p.verses[a][v] ?? 0))[0]
        for (const id of Object.keys(fame)) total[id] += 2 * (p.verses[id][v] ?? 0)
        const take = Math.floor((2 * (p.verses[best][v] ?? 0)) / 2)
        for (const id of Object.keys(fame)) {
          if (id !== best && before[id] > before[best]) {
            total[id] -= take
            total[best] += take
          }
        }
      }
      return total
    },
  },
  ...([[1, 2], [1, 3], [2, 2], [2, 3]] as const).flatMap(([base, boost]): Variant[] => [
    {
      // Last place going into the Showdown scores boost x; everyone else base x
      name: `Last place (at start) x${base * boost}, others x${base}`,
      kind: 'scoring',
      score: (fame, p) => {
        const last = Object.keys(fame).sort((a, b) => fame[a] - fame[b])[0]
        return Object.fromEntries(Object.keys(fame).map((id) => [id, fame[id] + (id === last ? base * boost : base) * sum(p.verses[id])]))
      },
    },
    {
      // Re-checked at the start of every verse
      name: `Last place (each verse) x${base * boost}, others x${base}`,
      kind: 'scoring',
      score: (fame, p) => {
        const total = { ...fame }
        const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
        for (let v = 0; v < verses; v++) {
          const last = Object.keys(total).sort((a, b) => total[a] - total[b])[0]
          for (const id of Object.keys(fame)) total[id] += (id === last ? base * boost : base) * (p.verses[id][v] ?? 0)
        }
        return total
      },
    },
  ]),
  ...([[1, 3], [2, 4]] as const).map(([lo, hi]): Variant => ({
    // Multiplier by Fame rank at the start of each verse: the leader lo x, last place hi x, evenly between
    name: `By rank each verse: leader x${lo} ... last x${hi}`,
    kind: 'scoring',
    score: (fame, p) => {
      const total = { ...fame }
      const n = Object.keys(fame).length
      const verses = Math.max(...Object.values(p.verses).map((v) => v.length))
      for (let v = 0; v < verses; v++) {
        const order = Object.keys(total).sort((a, b) => total[b] - total[a])
        order.forEach((id, i) => { total[id] += (lo + ((hi - lo) * i) / Math.max(1, n - 1)) * (p.verses[id][v] ?? 0) })
      }
      return total
    },
  })),
  {
    name: 'Fandom x2 + catch-up Inspiration',
    kind: 'replay',
    prepare: (s) => {
      const top = Math.max(...s.players.map((p) => p.fame))
      return { ...s, players: s.players.map((p) => ({ ...p, inspiration: p.inspiration + Math.floor((top - p.fame) / 20) })) }
    },
    score: times(2),
  },
]

interface Tally {
  games: number
  leaderWins: number
  lastWins: number
  flipped: number
  fandom: number
  gap: number
}
const blank = (): Tally => ({ games: 0, leaderWins: 0, lastWins: 0, flipped: 0, fandom: 0, gap: 0 })

function record(t: Tally, fame: Record<string, number>, final: Record<string, number>, fandom: number) {
  const byFame = Object.keys(fame).sort((a, b) => fame[b] - fame[a])
  const winner = Object.keys(final).sort((a, b) => final[b] - final[a])[0]
  t.games++
  t.leaderWins += winner === byFame[0] ? 1 : 0
  t.lastWins += winner === byFame[byFame.length - 1] ? 1 : 0
  t.flipped += winner !== byFame[0] ? 1 : 0
  t.fandom += fandom
  t.gap += fame[byFame[0]] - fame[byFame[1]]
}

function report(title: string, tallies: [string, Tally][]) {
  const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(0)}%`.padStart(5)
  console.log(`\n${title}`)
  console.log(`${'variant'.padEnd(58)} leader wins | last wins | avg fandom/bard | avg lead over 2nd`)
  for (const [name, t] of tallies) {
    console.log(`${name.padEnd(58)} ${pct(t.leaderWins, t.games)}       | ${pct(t.lastWins, t.games)}     | ${(t.fandom / Math.max(1, t.games)).toFixed(0).padStart(6)}          | ${(t.gap / Math.max(1, t.games)).toFixed(0)}`)
  }
}

function toShowdown(gate: number, g: number): EngineState | null {
  const rng = mulberry32(PLAYERS * 1_000_003 + g * 7919 + gate)
  const elements = [...ALL_ELEMENTS].sort(() => rng() - 0.5).slice(0, PLAYERS)
  const dealt = applyAction(
    { ...createInitialEngineState(), tunables: { ...DEFAULT_TUNABLES, fameFinalBossThreshold: gate } },
    { type: 'START_GAME', playerConfigs: elements.map((element, i) => ({ name: `Bot ${i + 1}`, starterElement: element })) },
    { rng, actor: { kind: 'hotseat' } }
  )
  if (!dealt.ok) return null
  const bot = new SmartBot(dealt.state, rng, { skill })
  for (let turns = 0; turns < 40 * PLAYERS && bot.state.phase === 'main'; turns++) bot.takeTurn()
  return bot.state.phase === 'finalBoss' ? bot.state : null
}

const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null
const ACTIVE = VARIANTS.filter((v) => !ONLY || v.name === 'Current rules' || ONLY.test(v.name))
const tallies = new Map<string, Tally>(ACTIVE.map((v) => [v.name, blank()]))
for (let g = 0; g < GAMES; g++) {
  const start = toShowdown(DEFAULT_TUNABLES.fameFinalBossThreshold, g)
  if (!start) continue
  const fame = Object.fromEntries(start.players.map((p) => [p.id, p.fame]))
  const seed = 900_000 + g
  const base = playShowdown(start, seed)
  for (const v of ACTIVE) {
    const played = v.prepare ? playShowdown(v.prepare(start), seed) : base
    const final = v.score(fame, played)
    const fandom = sum(Object.values(played.verses).map(sum)) / PLAYERS
    record(tallies.get(v.name)!, fame, final, fandom)
  }
}
report(`${PLAYERS} bards, ${PACE} pace, ${tallies.get('Current rules')!.games} games (parity = ${(100 / PLAYERS).toFixed(0)}%)`, [...tallies])

if (GATES.length > 0) {
  const gateTallies: [string, Tally][] = []
  for (const gate of GATES) {
    const plainT = blank()
    const doubleT = blank()
    for (let g = 0; g < GAMES; g++) {
      const start = toShowdown(gate, g)
      if (!start) continue
      const fame = Object.fromEntries(start.players.map((p) => [p.id, p.fame]))
      const played = playShowdown(start, 900_000 + g)
      const fandom = sum(Object.values(played.verses).map(sum)) / PLAYERS
      record(plainT, fame, plain(fame, played), fandom)
      record(doubleT, fame, times(2)(fame, played), fandom)
    }
    gateTallies.push([`Fame gate ${gate}`, plainT], [`Fame gate ${gate} + fandom x2`, doubleT])
  }
  report(`${PLAYERS} bards, ${PACE} pace: lower fame gates (whole games replayed)`, gateTallies)
}
