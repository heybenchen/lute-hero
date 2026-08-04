import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TUNABLES,
  TUNABLE_FIELDS,
  readTunable,
  writeTunable,
  normalizeTunables,
  changedTunablePaths,
  getTunables,
  withTunables,
} from './tunables'

describe('tunable field registry', () => {
  it('every field path resolves to a finite number on the defaults', () => {
    expect(TUNABLE_FIELDS.length).toBeGreaterThan(20)
    for (const field of TUNABLE_FIELDS) {
      const value = readTunable(DEFAULT_TUNABLES, field.path)
      expect(Number.isFinite(value), `${field.path} is not a number`).toBe(true)
      expect(value).toBeGreaterThanOrEqual(field.min)
      expect(value).toBeLessThanOrEqual(field.max)
    }
  })

  it('has unique field paths', () => {
    const paths = TUNABLE_FIELDS.map((f) => f.path)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('read/write', () => {
  it('writes scalars and array slots, leaving the original untouched', () => {
    const next = writeTunable(DEFAULT_TUNABLES, 'fameFinalBossThreshold', 40)
    expect(next.fameFinalBossThreshold).toBe(40)
    expect(DEFAULT_TUNABLES.fameFinalBossThreshold).toBe(150)

    const arrayEdit = writeTunable(DEFAULT_TUNABLES, 'monsterFameByLevel.2', 99)
    expect(arrayEdit.monsterFameByLevel[2]).toBe(99)
    expect(arrayEdit.monsterFameByLevel[0]).toBe(DEFAULT_TUNABLES.monsterFameByLevel[0])
    expect(DEFAULT_TUNABLES.monsterFameByLevel[2]).toBe(25)
  })

  it('clamps out-of-range writes and ignores unknown paths / NaN', () => {
    expect(writeTunable(DEFAULT_TUNABLES, 'maxMovesPerTurn', 9999).maxMovesPerTurn).toBe(16)
    expect(writeTunable(DEFAULT_TUNABLES, 'maxMovesPerTurn', -5).maxMovesPerTurn).toBe(0)
    expect(writeTunable(DEFAULT_TUNABLES, 'nope', 1)).toBe(DEFAULT_TUNABLES)
    expect(writeTunable(DEFAULT_TUNABLES, 'maxMovesPerTurn', NaN)).toBe(DEFAULT_TUNABLES)
  })

  it('reports which paths differ from the defaults', () => {
    expect(changedTunablePaths(DEFAULT_TUNABLES)).toEqual([])
    const tweaked = writeTunable(writeTunable(DEFAULT_TUNABLES, 'newD4Cost', 7), 'hpMultipliers.0', 4)
    expect(changedTunablePaths(tweaked).sort()).toEqual(['hpMultipliers.0', 'newD4Cost'])
  })
})

describe('normalizeTunables', () => {
  it('fills missing keys, repairs short arrays, and clamps values', () => {
    const restored = normalizeTunables({
      newD4Cost: 12,
      monsterFameByLevel: [1, 2],
      maxMovesPerTurn: 500,
    } as never)
    expect(restored.newD4Cost).toBe(12)
    expect(restored.monsterFameByLevel).toEqual([1, 2, 25, 50, 75])
    expect(restored.maxMovesPerTurn).toBe(16)
    expect(restored.showdownTurns).toBe(DEFAULT_TUNABLES.showdownTurns)
  })

  it('falls back to defaults for null/undefined', () => {
    expect(normalizeTunables(null)).toEqual(DEFAULT_TUNABLES)
    expect(normalizeTunables(undefined)).toEqual(DEFAULT_TUNABLES)
  })
})

describe('withTunables', () => {
  it('scopes the active set and restores it afterwards', () => {
    const before = getTunables()
    const inside = withTunables({ newD4Cost: 9 }, () => getTunables().newD4Cost)
    expect(inside).toBe(9)
    expect(getTunables()).toBe(before)
  })

  it('restores even when the callback throws', () => {
    const before = getTunables()
    expect(() => withTunables({ newD4Cost: 9 }, () => { throw new Error('boom') })).toThrow('boom')
    expect(getTunables()).toBe(before)
  })
})
