/**
 * Exact roll and damage distributions for the simulation bots, mirroring
 * `rollStyledDie` (styleEffects.ts) and the crit cascade (roller.ts):
 *
 *  - a die rolls 1..N (Master's Touch: the higher of two rolls),
 *  - Dragon's Roar adds to a d20 and can push it onto its top face,
 *  - War Drums lowers a d4's crit face (cascade dice still need a 4),
 *  - a crit adds a cascade of plain rolls of the same die (each top face
 *    rolls again, capped at `maxCritCascades`),
 *  - Fanfare adds a flat bonus to the turn's first roll, Harmony to every die,
 *  - damage = floor(total × element multiplier).
 *
 * Everything is pure and memoised, so bots can ask "what are the odds this
 * song tames that monster?" thousands of times per game cheaply.
 */
import { DiceType } from '../types/index.js'
import { GenericRollOptions, effectiveCritFace } from '../game-logic/styles/specs.js'

const FACES: Record<DiceType, number> = { d4: 4, d8: 8, d12: 12, d20: 20 }

/** A discrete distribution: total → probability. */
export type Dist = Map<number, number>

/** Same options the engine's generic roll takes (built-in styles and specs reduce to these). */
export type RollOptions = GenericRollOptions

const cascadeCache = new Map<string, Dist>()

/**
 * Sum of the cascade rolls that follow a crit (first cascade roll included),
 * each bonus die adding `perDie` on top of its face.
 */
function cascadeDist(faces: number, maxCascades: number, perDie = 0, chainFace = faces): Dist {
  const key = `${faces}:${maxCascades}:${perDie}:${chainFace}`
  const hit = cascadeCache.get(key)
  if (hit) return hit
  // depth d: rolling the d-th cascade die (1-based); stop at the cap
  const levels = new Map<number, Dist>()
  const build = (depth: number): Dist => {
    const cached = levels.get(depth)
    if (cached) return cached
    const out: Dist = new Map()
    for (let r = 1; r <= faces; r++) {
      const p = 1 / faces
      if (r >= chainFace && depth < maxCascades) {
        for (const [rest, q] of build(depth + 1)) add(out, r + perDie + rest, p * q)
      } else {
        add(out, r + perDie, p)
      }
    }
    levels.set(depth, out)
    return out
  }
  const dist = prune(build(1))
  cascadeCache.set(key, dist)
  return dist
}

const rollCache = new Map<string, Dist>()

/**
 * Distribution of a die's pre-multiplier total, mirroring `rollWithOptions`
 * (game-logic/styles/specs.ts) step by step: advantage/disadvantage → reroll
 * of a low face → flip → floor → crit check → cascade → flat (+ odd-face bonus) → ×times.
 */
export function rollDist(type: DiceType, opts: RollOptions): Dist {
  const key = `${type}|${JSON.stringify(opts)}`
  const hit = rollCache.get(key)
  if (hit) return hit
  const n = FACES[type]
  // 1. The face
  let face = new Map<number, number>()
  const adv = !!opts.advantage && !opts.disadvantage
  const dis = !!opts.disadvantage && !opts.advantage
  for (let v = 1; v <= n; v++) {
    const p = adv ? (2 * v - 1) / (n * n) : dis ? (2 * (n - v) + 1) / (n * n) : 1 / n
    face.set(v, p)
  }
  if (opts.rerollAtMost) {
    const k = opts.rerollAtMost
    let low = 0
    for (const [v, p] of face) if (v <= k) low += p
    const next = new Map<number, number>()
    for (const [v, p] of face) if (v > k) next.set(v, p)
    for (let v = 1; v <= n; v++) next.set(v, (next.get(v) ?? 0) + low / n)
    face = next
  }
  if (opts.flipAtMost) {
    const next = new Map<number, number>()
    for (const [v, p] of face) {
      const w = v <= opts.flipAtMost ? n + 1 - v : v
      next.set(w, (next.get(w) ?? 0) + p)
    }
    face = next
  }
  if (opts.floor) {
    const fl = Math.min(n, opts.floor)
    const next = new Map<number, number>()
    for (const [v, p] of face) {
      const w = Math.max(v, fl)
      next.set(w, (next.get(w) ?? 0) + p)
    }
    face = next
  }
  // 2. Crits, bonuses, ×times
  const critFace = effectiveCritFace(type, opts)
  const bonus = opts.critBonus ?? 0
  const flat = opts.flat ?? 0
  const times = opts.times ?? 1
  const finish = (pre: number) => pre + (times !== 1 ? Math.round(pre * (times - 1)) : 0)
  const out: Dist = new Map()
  for (const [v, pv] of face) {
    const base = v + bonus + flat + (opts.oddBonus && v % 2 === 1 ? opts.oddBonus : 0)
    if (!opts.noCrit && v + bonus >= critFace) {
      for (const [c, q] of cascadeDist(n, opts.maxCascades, opts.cascadeBonus ?? 0, Math.max(2, Math.min(n, opts.cascadeFace ?? n)))) add(out, finish(base + c), pv * q)
    } else {
      add(out, finish(base), pv)
    }
  }
  const dist = prune(out)
  rollCache.set(key, dist)
  return dist
}

const memo = new WeakMap<Dist, Map<string, number>>()
function memoised(dist: Dist, key: string, compute: () => number): number {
  let m = memo.get(dist)
  if (!m) memo.set(dist, (m = new Map()))
  let v = m.get(key)
  if (v === undefined) m.set(key, (v = compute()))
  return v
}

/** P(floor(total × multiplier) ≥ hp). */
export function killChance(dist: Dist, multiplier: number, hp: number): number {
  return memoised(dist, `k${multiplier}:${hp}`, () => killChanceRaw(dist, multiplier, hp))
}

function killChanceRaw(dist: Dist, multiplier: number, hp: number): number {
  if (multiplier <= 0) return hp <= 0 ? 1 : 0
  let p = 0
  for (const [t, q] of dist) if (Math.floor(t * multiplier) >= hp) p += q
  return Math.min(1, p)
}

/** E[min(damage, cap)] — damage beyond what the monster has left is wasted. */
export function expectedDamage(dist: Dist, multiplier: number, cap = Infinity): number {
  return memoised(dist, `e${multiplier}:${cap}`, () => expectedDamageRaw(dist, multiplier, cap))
}

function expectedDamageRaw(dist: Dist, multiplier: number, cap: number): number {
  if (multiplier <= 0) return 0
  let e = 0
  for (const [t, q] of dist) e += Math.min(Math.floor(t * multiplier), cap) * q
  return e
}

/** E[damage | it doesn't reach hp] — the chip damage a miss still leaves behind. */
export function expectedChipOnMiss(dist: Dist, multiplier: number, hp: number): number {
  return memoised(dist, `c${multiplier}:${hp}`, () => expectedChipRaw(dist, multiplier, hp))
}

function expectedChipRaw(dist: Dist, multiplier: number, hp: number): number {
  if (multiplier <= 0) return 0
  let mass = 0
  let e = 0
  for (const [t, q] of dist) {
    const d = Math.floor(t * multiplier)
    if (d < hp) {
      mass += q
      e += d * q
    }
  }
  return mass > 0 ? e / mass : 0
}

/** Mean of a distribution. */
export function mean(dist: Dist): number {
  return memoised(dist, 'mean', () => meanRaw(dist))
}

function meanRaw(dist: Dist): number {
  let e = 0
  for (const [t, q] of dist) e += t * q
  return e
}

/** Distribution of a sum of independent rolls (showdown performances). */
export function convolve(a: Dist, b: Dist): Dist {
  const out: Dist = new Map()
  for (const [x, p] of a) for (const [y, q] of b) add(out, x + y, p * q)
  return prune(out)
}

function add(d: Dist, k: number, p: number) {
  d.set(k, (d.get(k) ?? 0) + p)
}

/** Drop vanishing tails so deep cascades don't bloat the maps. */
function prune(d: Dist): Dist {
  for (const [k, p] of d) if (p < 1e-9) d.delete(k)
  return d
}

const samplers = new WeakMap<Dist, { vals: number[]; cdf: number[] }>()

/** Draw one total from a distribution (for look-ahead rollouts). */
export function sample(dist: Dist, rng: () => number): number {
  let sm = samplers.get(dist)
  if (!sm) {
    const vals: number[] = []
    const cdf: number[] = []
    let acc = 0
    for (const [v, p] of dist) {
      acc += p
      vals.push(v)
      cdf.push(acc)
    }
    sm = { vals, cdf }
    samplers.set(dist, sm)
  }
  const r = rng() * sm.cdf[sm.cdf.length - 1]
  let lo = 0
  let hi = sm.cdf.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sm.cdf[mid] < r) lo = mid + 1
    else hi = mid
  }
  return sm.vals[lo]
}
