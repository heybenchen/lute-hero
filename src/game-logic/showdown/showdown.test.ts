import { describe, it, expect } from 'vitest'
import {
  SHOWDOWN_TURNS,
  SHOWDOWN_RESIST_MULTIPLIER,
  SHOWDOWN_WEAKNESS_MULTIPLIER,
  createShowdownBoss,
  getShowdownMultiplier,
  computeBossAdaptation,
  calculateShowdownFandom,
  getPlayableSongs,
  ShowdownPerformance,
} from './showdown'
import { Song } from '@/types'

function perf(playerId: string, fandom: number): ShowdownPerformance {
  return { playerId, rawDamage: fandom, multiplier: 1, fandom }
}

describe('showdown constants', () => {
  it('lasts exactly 3 turns', () => {
    expect(SHOWDOWN_TURNS).toBe(3)
  })
})

describe('createShowdownBoss', () => {
  it('builds the final boss with no genre vulnerability or resistance', () => {
    const boss = createShowdownBoss()
    expect(boss.isBoss).toBe(true)
    expect(boss.vulnerability).toBeNull()
    expect(boss.resistance).toBeNull()
    expect(boss.currentHP).toBeGreaterThan(0)
    expect(boss.name).toBe('The Eternal Silence')
  })
})

describe('getShowdownMultiplier', () => {
  const adaptation = { resistedPlayerId: 'p1', weakenedPlayerId: 'p2' }

  it('halves fandom for the resisted player', () => {
    expect(getShowdownMultiplier('p1', adaptation)).toBe(SHOWDOWN_RESIST_MULTIPLIER)
  })

  it('doubles fandom for the player the boss is weak to', () => {
    expect(getShowdownMultiplier('p2', adaptation)).toBe(SHOWDOWN_WEAKNESS_MULTIPLIER)
  })

  it('returns 1x for unaffected players', () => {
    expect(getShowdownMultiplier('p3', adaptation)).toBe(1)
  })

  it('returns 1x when the boss has not adapted', () => {
    expect(
      getShowdownMultiplier('p1', { resistedPlayerId: null, weakenedPlayerId: null })
    ).toBe(1)
  })
})

describe('computeBossAdaptation', () => {
  it('resists the strongest attacker and is weak to the weakest', () => {
    const result = computeBossAdaptation([
      perf('p1', 20),
      perf('p2', 35),
      perf('p3', 8),
    ])
    expect(result.resistedPlayerId).toBe('p2')
    expect(result.weakenedPlayerId).toBe('p3')
  })

  it('does not adapt in a solo showdown', () => {
    const result = computeBossAdaptation([perf('p1', 25)])
    expect(result.resistedPlayerId).toBeNull()
    expect(result.weakenedPlayerId).toBeNull()
  })

  it('does not adapt with no performances', () => {
    const result = computeBossAdaptation([])
    expect(result.resistedPlayerId).toBeNull()
    expect(result.weakenedPlayerId).toBeNull()
  })

  it('does not adapt when all players deal equal damage', () => {
    const result = computeBossAdaptation([perf('p1', 15), perf('p2', 15)])
    // Ties go to earlier performers: p1 is both strongest and weakest candidate,
    // but a tie among everyone means strongest === weakest only when one player
    // holds both titles. Here p1 is strongest-first and p1 is weakest-first.
    expect(result.resistedPlayerId).toBeNull()
    expect(result.weakenedPlayerId).toBeNull()
  })

  it('breaks partial ties by performance order', () => {
    const result = computeBossAdaptation([
      perf('p1', 30),
      perf('p2', 30),
      perf('p3', 10),
    ])
    expect(result.resistedPlayerId).toBe('p1')
    expect(result.weakenedPlayerId).toBe('p3')
  })

  it('handles two players with different damage', () => {
    const result = computeBossAdaptation([perf('p1', 12), perf('p2', 40)])
    expect(result.resistedPlayerId).toBe('p2')
    expect(result.weakenedPlayerId).toBe('p1')
  })
})

describe('calculateShowdownFandom', () => {
  it('awards one fandom per point of damage at 1x', () => {
    expect(calculateShowdownFandom(17, 1)).toBe(17)
  })

  it('halves and floors fandom under resistance', () => {
    expect(calculateShowdownFandom(15, SHOWDOWN_RESIST_MULTIPLIER)).toBe(7)
  })

  it('doubles fandom under an exposed weakness', () => {
    expect(calculateShowdownFandom(15, SHOWDOWN_WEAKNESS_MULTIPLIER)).toBe(30)
  })

  it('never goes negative', () => {
    expect(calculateShowdownFandom(0, SHOWDOWN_WEAKNESS_MULTIPLIER)).toBe(0)
  })
})

describe('getPlayableSongs', () => {
  const songWithDice: Song = {
    id: 's1',
    name: 'Anthem',
    slots: [{ dice: { id: 'd1', type: 'd6', genre: 'Ballad' } }, { dice: null }],
    effect: null,
    used: false,
  }
  const emptySong: Song = {
    id: 's2',
    name: '',
    slots: [{ dice: null }, { dice: null }],
    effect: null,
    used: false,
  }

  it('only returns songs with at least one die', () => {
    expect(getPlayableSongs([songWithDice, emptySong])).toEqual([songWithDice])
  })
})
