import { describe, it, expect } from 'vitest'
import {
  showdownTurns,
  createShowdownBoss,
  getDominantGenre,
  computeBossAdaptation,
  getPlayableSongs,
  ShowdownPerformance,
} from './showdown'
import { Genre, Song, DiceRoll } from '@/types'

function perf(playerId: string, fandom: number, genre: Genre | null): ShowdownPerformance {
  return { playerId, fandom, genre }
}

function roll(diceId: string, value: number, critBonus = 0): DiceRoll {
  return { diceId, value, isCrit: critBonus > 0, critBonus, cascadeRolls: [] }
}

function song(genre: Genre | null): Song {
  return {
    id: 's1',
    slots: [
      { dice: genre ? { id: 'd1', type: 'd8', genre } : null },
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

  it('carries its adaptation as monster vulnerability/resistance', () => {
    const boss = createShowdownBoss({ resistGenre: 'Ballad', weakGenre: 'Folk' })
    expect(boss.resistance).toBe('Ballad')
    expect(boss.vulnerability).toBe('Folk')
  })
})

describe('getDominantGenre', () => {
  it('returns the genre of a single-element song', () => {
    const s = song('Ballad')
    expect(getDominantGenre(s, [roll('d1', 3), roll('d2', 5)])).toBe('Ballad')
  })

  it('ignores rolls from other songs', () => {
    expect(getDominantGenre(song('Ballad'), [roll('d1', 2), roll('d2', 20)])).toBe('Ballad')
  })

  it('returns null for a song with no dice', () => {
    expect(getDominantGenre(song(null), [])).toBeNull()
  })
})

describe('computeBossAdaptation', () => {
  it('resists the strongest attack element and is weak to the weakest', () => {
    const result = computeBossAdaptation([
      perf('p1', 20, 'Ballad'),
      perf('p2', 35, 'Folk'),
      perf('p3', 8, 'Shanty'),
    ])
    expect(result.resistGenre).toBe('Folk')
    expect(result.weakGenre).toBe('Shanty')
  })

  it('does not adapt in a solo showdown', () => {
    const result = computeBossAdaptation([perf('p1', 25, 'Ballad')])
    expect(result.resistGenre).toBeNull()
    expect(result.weakGenre).toBeNull()
  })

  it('does not adapt with no performances', () => {
    expect(computeBossAdaptation([])).toEqual({ resistGenre: null, weakGenre: null })
  })

  it('does not adapt when strongest and weakest share an element', () => {
    const result = computeBossAdaptation([
      perf('p1', 30, 'Ballad'),
      perf('p2', 10, 'Ballad'),
    ])
    expect(result.resistGenre).toBeNull()
    expect(result.weakGenre).toBeNull()
  })

  it('breaks damage ties by performance order', () => {
    const result = computeBossAdaptation([
      perf('p1', 30, 'Ballad'),
      perf('p2', 30, 'Folk'),
      perf('p3', 10, 'Hymn'),
    ])
    expect(result.resistGenre).toBe('Ballad')
    expect(result.weakGenre).toBe('Hymn')
  })

  it('ignores performances without an element', () => {
    const result = computeBossAdaptation([
      perf('p1', 30, 'Ballad'),
      perf('p2', 5, null),
    ])
    expect(result.resistGenre).toBeNull()
    expect(result.weakGenre).toBeNull()
  })

  it('handles two players with different damage and elements', () => {
    const result = computeBossAdaptation([
      perf('p1', 12, 'Hymn'),
      perf('p2', 40, 'Shanty'),
    ])
    expect(result.resistGenre).toBe('Shanty')
    expect(result.weakGenre).toBe('Hymn')
  })
})

describe('getPlayableSongs', () => {
  it('only returns songs with at least one die', () => {
    const withDice = song('Ballad')
    const empty = { ...song(null), id: 's2' }
    expect(getPlayableSongs([withDice, empty])).toEqual([withDice])
  })
})
