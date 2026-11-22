/**
 * Exact roll and damage distributions for the simulation bots, mirroring
 * `rollStyledDie` (styleEffects.ts) and the crit cascade (roller.ts):
 *
 *  - a die rolls 1..N (Master's Touch: the higher of two rolls),
 *  - Dragon's Roar adds to a d20 and can push it onto its top face,
 *  - War Drums lowers a d4's crit face (cascade dice still need a 4),
 *  - a crit adds a cascade of plain rolls of the same die (each top face
 *    rolls again, capped at `maxCritCascades`),
 *  - Fanfare / Harmony add a flat bonus to the turn's first roll,
 *  - damage = floor(total × element multiplier).
 *
 * Everything is pure and memoised, so bots can ask "what are the odds this
 * song tames that monster?" thousands of times per game cheaply.
 */
import { DiceType } from '../types/index.js'

const FACES: Record<DiceType, number> = { d4: 4, d8: 8, d12: 12, d20: 20 }

/** A discrete distribution: total → probability. */
export type Dist = Map<number, number>

export interface RollOptions {
  /** Master's Touch: roll twice, keep the higher. */
  advantage?: boolean
  /** Dragon's Roar bonus on a d20 (can reach the crit face). */
  critBonus?: number
  /** War Drums: the face a d4 crits from. */
  critFace?: number
  /** Fanfare / Harmony: flat bonus that never crits. */
  flat?: number
  maxCascades: number
}

const cascadeCache = new Map<string, Dist>()

/** Sum of the cascade rolls that follow a crit (first cascade roll included). */
function cascadeDist(faces: number, maxCascades: number): Dist {
  const key = `${faces}:${maxCascades}`
  const hit = cascadeCache.get(key)
  if (hit) return hit
  // depth d: rolling the d-th cascade die (1-based); stop at the cap
  const build = (depth: number): Dist => {
    const out: Dist = new Map()
    for (let r = 1; r <= faces; r++) {
      const p = 1 / faces
      if (r === faces && depth < maxCascades) {
        for (const [rest, q] of build(depth + 1)) add(out, r + rest, p * q)
      } else {
        add(out, r, p)
      }
    }
    return out
  }
  const dist = prune(build(1))
  cascadeCache.set(key, dist)
  return dist
}

const rollCache = new Map<string, Dist>()

/** Distribution of a die's pre-multiplier total (value + bonuses + cascade). */
export function rollDist(type: DiceType, opts: RollOptions): Dist {
  const key = `${type}:${opts.advantage ? 1 : 0}:${opts.critBonus ?? 0}:${opts.critFace ?? 0}:${opts.flat ?? 0}:${opts.maxCascades}`
  const hit = rollCache.get(key)
  if (hit) return hit
  const n = FACES[type]
  const critFace = Math.min(n, opts.critFace ?? n)
  const bonus = opts.critBonus ?? 0
  const flat = opts.flat ?? 0
  const out: Dist = new Map()
  for (let v = 1; v <= n; v++) {
    const pv = opts.advantage ? (2 * v - 1) / (n * n) : 1 / n
    const base = v + bonus + flat
    if (v + bonus >= critFace) {
      for (const [c, q] of cascadeDist(n, opts.maxCascades)) add(out, base + c, pv * q)
    } else {
      add(out, base, pv)
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
