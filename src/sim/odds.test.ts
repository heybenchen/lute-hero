import { describe, it, expect } from 'vitest'
import { rollDist, killChance, mean } from './odds'
import { rollSongWithStyles, StyleContext } from '../game-logic/styles/styleEffects'
import { mulberry32 } from '../engine/rng'
import { DiceType, Song, StyleId } from '../types'
import { DEFAULT_TUNABLES, withTunables } from '../data/tunables'

/** Monte Carlo of the real engine roll vs the exact distribution. */
function compare(type: DiceType, styles: StyleId[], firstRoll: boolean, opts: Parameters<typeof rollDist>[1]) {
  const song: Song = { id: 's', used: false, slots: [{ dice: { id: 'd', type, genre: 'Ballad' } }] }
  const ctx: StyleContext = { styles, used: [], firstRoll, allElements: true, elementCount: 4 }
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
  it('Bluegrass (advantage) on a d8', () => compare('d8', ['virtuoso'], false, { advantage: true, maxCascades: m }))
  it('Opera raising a d20\'s rolled value', () => compare('d20', ['fortissimo'], false, { critBonus: DEFAULT_TUNABLES.fortissimoBonus, maxCascades: m }))
  it('War Drums on a d4', () => compare('d4', ['ostinato'], false, { critFace: DEFAULT_TUNABLES.ostinatoCritFace, maxCascades: m }))
  it('Fanfare + Harmony flat bonus on the first roll', () =>
    compare('d8', ['overture', 'tutti'], true, { flat: DEFAULT_TUNABLES.overtureBonus + DEFAULT_TUNABLES.tuttiBonus, maxCascades: m }))
  it('Harmony alone adds its bonus on later rolls too', () =>
    compare('d8', ['tutti'], false, { flat: DEFAULT_TUNABLES.tuttiBonus, maxCascades: m }))
})

describe('generic roll options: engine roll matches the exact distribution', () => {
  const cases: [DiceType, Omit<import('../game-logic/styles/specs').GenericRollOptions, 'maxCascades'>][] = [
    ['d12', { disadvantage: true }],
    ['d8', { rerollAtMost: 3 }],
    ['d20', { flipAtMost: 5 }],
    ['d12', { floor: 5 }],
    ['d8', { cascadeBonus: 2, critFace: 7 }],
    ['d4', { critFace: 3, cascadeFace: 3 }],
    ['d8', { critFace: 7, cascadeFace: 6, cascadeBonus: 1 }],
    ['d20', { noCrit: true, flat: 3 }],
    ['d12', { times: 1.5, advantage: true }],
    ['d4', { rerollAtMost: 1, critBonus: 1, flat: 1, times: 2 }],
    ['d8', { critFlat: 4 }],
    ['d4', { lowFaceBonus: 2, lowFaceAtMost: 3 }],
    ['d8', { oddBonus: 1, critFlat: 4, advantage: true }],
  ]
  for (const [type, extra] of cases) {
    it(`${type} ${JSON.stringify(extra)}`, async () => {
      const { rollWithOptions } = await import('../game-logic/styles/specs')
      const opts = { ...extra, maxCascades: DEFAULT_TUNABLES.maxCritCascades }
      const rng = mulberry32(99)
      const N = 120_000
      const counts = new Map<number, number>()
      for (let i = 0; i < N; i++) {
        const r = rollWithOptions({ id: 'd', type, genre: 'Folk' }, opts, rng)
        const total = r.value + (r.bonus ?? 0) + r.critBonus
        counts.set(total, (counts.get(total) ?? 0) + 1)
      }
      const dist = rollDist(type, opts)
      let mc = 0
      for (const [t, c] of counts) mc += (t * c) / N
      expect(mean(dist)).toBeCloseTo(mc, 0)
      for (const hp of [4, 8, 12, 18, 25]) {
        let p = 0
        for (const [t, c] of counts) if (t >= hp) p += c / N
        expect(Math.abs(killChance(dist, 1, hp) - p)).toBeLessThan(0.01)
      }
    })
  }
})
