import { describe, it, expect } from 'vitest'
import {
  showdownTurns,
  createShowdownBoss,
  getDominantElement,
  computeBossAdaptation,
  getPlayableSongs,
  ShowdownPerformance,
} from './showdown'
import { Element, Song, DiceRoll } from '@/types'

function perf(playerId: string, fandom: number, element: Element | null): ShowdownPerformance {
  return { playerId, fandom, element }
}

function roll(diceId: string, value: number, critBonus = 0): DiceRoll {
  return { diceId, value, isCrit: critBonus > 0, critBonus, cascadeRolls: [] }
}

function song(element: Element | null): Song {
  return {
    id: 's1',
    slots: [
      { dice: element ? { id: 'd1', type: 'd8', element } : null },
    ],
    used: false,
  }
}

describe('showdown constants', () => {
  it('lasts exactly 3 turns', () => {
    expect(showdownTurns()).toBe(3)
  })
})

describe('createShowdownBoss', () => {
  it('starts with no genre vulnerability or resistance', () => {
    const boss = createShowdownBoss()
    expect(boss.isBoss).toBe(true)
    expect(boss.vulnerability).toBeNull()
    expect(boss.resistance).toBeNull()
    expect(boss.name).toBe('The Eternal Silence')
  })

  it('carries its adaptation as an immunity, never a weakness', () => {
    const boss = createShowdownBoss({ resistElement: 'Ballad' })
    expect(boss.resistance).toBe('Ballad')
    expect(boss.vulnerability).toBeNull()
  })
})

describe('getDominantElement', () => {
  it('returns the element of a single-element song', () => {
    const s = song('Ballad')
    expect(getDominantElement(s, [roll('d1', 3), roll('d2', 5)])).toBe('Ballad')
  })

  it('ignores rolls from other songs', () => {
    expect(getDominantElement(song('Ballad'), [roll('d1', 2), roll('d2', 20)])).toBe('Ballad')
  })

  it('returns null for a song with no dice', () => {
    expect(getDominantElement(song(null), [])).toBeNull()
  })
})

describe('computeBossAdaptation', () => {
  it('grows unmoved by the strongest performance\'s element', () => {
    const result = computeBossAdaptation([
      perf('p1', 20, 'Ballad'),
      perf('p2', 35, 'Folk'),
      perf('p3', 8, 'Shanty'),
    ])
    expect(result).toEqual({ resistElement: 'Folk' })
  })

  it('does not adapt in a solo showdown', () => {
    expect(computeBossAdaptation([perf('p1', 25, 'Ballad')])).toEqual({ resistElement: null })
  })

  it('does not adapt with no performances', () => {
    expect(computeBossAdaptation([])).toEqual({ resistElement: null })
  })

  it('adapts even when every performance shares an element', () => {
    const result = computeBossAdaptation([perf('p1', 30, 'Ballad'), perf('p2', 10, 'Ballad')])
    expect(result.resistElement).toBe('Ballad')
  })

  it('breaks ties by performance order', () => {
    const result = computeBossAdaptation([
      perf('p1', 30, 'Ballad'),
      perf('p2', 30, 'Folk'),
      perf('p3', 10, 'Hymn'),
    ])
    expect(result.resistElement).toBe('Ballad')
  })

  it('ignores performances without an element', () => {
    expect(computeBossAdaptation([perf('p1', 30, 'Ballad'), perf('p2', 5, null)])).toEqual({ resistElement: null })
  })
})

describe('getPlayableSongs', () => {
  it('only returns songs with at least one die', () => {
    const withDice = song('Ballad')
    const empty = { ...song(null), id: 's2' }
    expect(getPlayableSongs([withDice, empty])).toEqual([withDice])
  })
})
