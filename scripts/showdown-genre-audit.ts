/**
 * How much does each genre help in the Final Showdown?
 *
 * Smart-bot games are played to the start of the Showdown. Each Showdown is
 * then replayed once per genre: every bard's genres are cleared, the tested
 * bard (seat 1) holds only that genre, and the same dice seed is used for
 * every replay, so differences come from the genre alone. Reports the tested
 * bard's fandom per Showdown, Showdown Fame (rounded fandom + crown bonuses)
 * and how often they win the game, against a no-genre baseline.
 *
 *   npx tsx scripts/showdown-genre-audit.ts      (GAMES=200 PLAYERS=3 PACE=typical)
 *
 * New Age (`coda`) adds a 7th song; holding it here also gives that song a d4
 * of the bard's most-held element, as a bard who bought it would have.
 */
import { applyAction } from '../src/engine/reducer.js'
import { createInitialEngineState } from '../src/engine/state.js'
import type { EngineState } from '../src/engine/state.js'
import { SmartBot } from '../src/sim/smartBot.js'
import { mulberry32 } from '../src/engine/rng.js'
import { DEFAULT_TUNABLES } from '../src/data/tunables.js'
import { ALL_GENRES } from '../src/data/genreTheme.js'
import { STYLES } from '../src/data/styles.js'
import { paceSkill, SimulationPace } from '../src/data/simulationPaces.js'
import type { Genre, Player, Song, StyleId } from '../src/types/index.js'

const GAMES = Number(process.env.GAMES ?? 200)
const PLAYERS = Number(process.env.PLAYERS ?? 3)
const PACE = (process.env.PACE ?? 'typical') as SimulationPace
const skill = paceSkill(PACE)
const ONLY = process.env.STYLES ? (process.env.STYLES.split(',') as StyleId[]) : null

function toShowdown(g: number): EngineState | null {
  const rng = mulberry32(PLAYERS * 7_000_001 + g * 104_729)
  const genres = [...ALL_GENRES].sort(() => rng() - 0.5).slice(0, PLAYERS)
  const dealt = applyAction(
    { ...createInitialEngineState(), tunables: { ...DEFAULT_TUNABLES } },
    { type: 'START_GAME', playerConfigs: genres.map((genre, i) => ({ name: `Bot ${i + 1}`, starterGenre: genre })) },
    { rng, actor: { kind: 'hotseat' } }
  )
  if (!dealt.ok) return null
  const bot = new SmartBot(dealt.state, rng, { skill })
  for (let turns = 0; turns < 40 * PLAYERS && bot.state.phase === 'main'; turns++) bot.takeTurn()
  return bot.state.phase === 'finalBoss' ? bot.state : null
}

const songDie = (s: Song) => s.slots.find((slot) => slot.dice)?.dice ?? null

/** Clear every bard's genres; the tested bard (seat 1) holds `style` (or nothing). */
function withGenre(start: EngineState, style: StyleId | null): EngineState {
  const testedId = start.players[0].id
  const players: Player[] = start.players.map((p) => {
    // Drop any New Age 7th song the bard really had, so every run starts level
    const songs = p.songs.filter((s) => s.id !== `${p.id}-coda`)
    if (p.id !== testedId || !style) return { ...p, styles: [], songs }
    if (style !== 'coda') return { ...p, styles: [style], songs }
    const counts = new Map<Genre, number>()
    for (const s of songs) { const d = songDie(s); if (d) counts.set(d.genre, (counts.get(d.genre) ?? 0) + 1) }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? p.starterGenre
    const coda: Song = { id: `${p.id}-coda`, used: false, slots: [{ dice: { id: `${p.id}-coda-d4`, type: 'd4', genre: top } }] } as Song
    return { ...p, styles: ['coda'], songs: [...songs, coda] }
  })
  return { ...start, players }
}

function play(start: EngineState, seed: number) {
  const bot = new SmartBot(start, mulberry32(seed), { skill })
  for (let guard = 0; guard < 200 && bot.state.phase === 'finalBoss' && !bot.state.showdownComplete; guard++) bot.playShowdownTurn()
  const s = bot.state
  const me = s.players[0]
  const crown = s.showdownHistory.flat().filter((h) => h.playerId === me.id).reduce((t, h) => t + (h.crownBonus ?? 0), 0)
  const winner = [...s.players].sort((a, b) => b.fame - a.fame || b.totalBossDamage - a.totalBossDamage)[0]
  return { fandom: s.showdownFandom[me.id] ?? 0, earned: s.showdownEarned[me.id] ?? 0, crown, won: winner.id === me.id ? 1 : 0 }
}

interface Tally { n: number; fandom: number; earned: number; crown: number; won: number }
const blank = (): Tally => ({ n: 0, fandom: 0, earned: 0, crown: 0, won: 0 })
const ids = (ONLY ?? (Object.keys(STYLES) as StyleId[]))
const tallies = new Map<string, Tally>([['(none)', blank()], ...ids.map((id): [string, Tally] => [id, blank()])])

for (let g = 0; g < GAMES; g++) {
  const start = toShowdown(g)
  if (!start) continue
  const seed = 31_337 + g
  for (const [key, t] of tallies) {
    const r = play(withGenre(start, key === '(none)' ? null : (key as StyleId)), seed)
    t.n++; t.fandom += r.fandom; t.earned += r.earned; t.crown += r.crown; t.won += r.won
  }
}

const base = tallies.get('(none)')!
const avg = (t: Tally, k: keyof Tally) => t[k] / Math.max(1, t.n)
const rows = [...tallies.entries()].map(([key, t]) => ({
  key,
  name: key === '(none)' ? '(no genre)' : STYLES[key as StyleId].name,
  cost: key === '(none)' ? '' : String(DEFAULT_TUNABLES[`styleCost${key.replace(/(^|-)([a-z])/g, (_m, _d, c: string) => c.toUpperCase())}` as keyof typeof DEFAULT_TUNABLES] ?? ''),
  fandom: avg(t, 'fandom'),
  earned: avg(t, 'earned'),
  crown: avg(t, 'crown'),
  win: (100 * t.won) / Math.max(1, t.n),
}))
rows.sort((a, b) => b.earned - a.earned)
console.log(`${PLAYERS} bards, ${PACE} pace, ${base.n} Showdowns. Tested bard: seat 1, holding only the genre; no other bard holds one.`)
console.log('genre (id)                         | fandom  Δ      | Showdown Fame  Δ     | crown Fame | wins  Δ')
for (const r of rows) {
  const d = (x: number, b: number) => `${x - b >= 0 ? '+' : ''}${(x - b).toFixed(1)}`
  console.log(
    `${`${r.name} (${r.key})`.padEnd(34)} | ${r.fandom.toFixed(1).padStart(5)} ${d(r.fandom, avg(base, 'fandom')).padStart(6)} | ${r.earned.toFixed(1).padStart(6)} ${d(r.earned, avg(base, 'earned')).padStart(6)}        | ${r.crown.toFixed(1).padStart(5)}      | ${r.win.toFixed(0).padStart(3)}% ${d(r.win, (100 * base.won) / Math.max(1, base.n)).padStart(6)}`
  )
}
