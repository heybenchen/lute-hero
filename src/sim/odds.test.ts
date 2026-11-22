import { describe, it, expect } from 'vitest'
import { rollDist, killChance, mean } from './odds'
import { rollSongWithStyles, StyleContext } from '../game-logic/styles/styleEffects'
import { mulberry32 } from '../engine/rng'
import { DiceType, Song, StyleId } from '../types'
import { DEFAULT_TUNABLES, withTunables } from '../data/tunables'

/** Monte Carlo of the real engine roll vs the exact distribution. */
function compare(type: DiceType, styles: StyleId[], firstRoll: boolean, opts: Parameters<typeof rollDist>[1]) {
  const song: Song = { id: 's', used: false, slots: [{ dice: { id: 'd', type, genre: 'Ballad' } }] }
  const ctx: StyleContext = { styles, used: [], firstRoll, allElements: true }
  const rng = mulberry32(17)
  const N = 120_000
  const counts = new Map<number, number>()
  withTunables(DEFAULT_TUNABLES, () => {
    for (let i = 0; i < N; i++) {
      const r = rollSongWithStyles(song, ctx, rng).rolls[0]
      const total = r.value + (r.bonus ?? 0) + r.critBonus
      counts.set(total, (counts.get(total) ?? 0) + 1)
    }
  })
  const dist = rollDist(type, opts)
  let mcMean = 0
  for (const [t, c] of counts) mcMean += (t * c) / N
  expect(mean(dist)).toBeCloseTo(mcMean, 1)
  for (const hp of [3, 6, 10, 15, 22]) {
    let mc = 0
    for (const [t, c] of counts) if (t >= hp) mc += c / N
    expect(Math.abs(killChance(dist, 1, hp) - mc)).toBeLessThan(0.01)
  }
}

describe('exact roll distributions match the engine', () => {
  const m = DEFAULT_TUNABLES.maxCritCascades
  it('plain dice', () => {
    for (const t of ['d4', 'd8', 'd12', 'd20'] as DiceType[]) compare(t, [], false, { maxCascades: m })
  })
  it('Master\'s Touch (advantage) on a d12', () => compare('d12', ['virtuoso'], false, { advantage: true, maxCascades: m }))
  it('Dragon\'s Roar on a d20', () => compare('d20', ['fortissimo'], false, { critBonus: DEFAULT_TUNABLES.fortissimoBonus, maxCascades: m }))
  it('War Drums on a d4', () => compare('d4', ['ostinato'], false, { critFace: DEFAULT_TUNABLES.ostinatoCritFace, maxCascades: m }))
  it('Fanfare + Harmony flat bonus on the first roll', () =>
    compare('d8', ['overture', 'tutti'], true, { flat: DEFAULT_TUNABLES.overtureBonus + DEFAULT_TUNABLES.tuttiBonus, maxCascades: m }))
})
