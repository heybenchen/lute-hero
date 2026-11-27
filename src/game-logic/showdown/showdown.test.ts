import { describe, it, expect } from 'vitest'
import {
  showdownTurns,
  createShowdownBoss,
  getDominantGenre,
  computeBossAdaptation,
  getPlayableSongs,
  ShowdownPerformance,
  crownHolders,
  crownBonus,
  settleVerse,
  verseFame,
} from './showdown'
import { withTunables, DEFAULT_TUNABLES } from '@/data/tunables'
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

  it('carries its adaptation as an immunity, never a weakness', () => {
    const boss = createShowdownBoss({ resistGenre: 'Ballad' })
    expect(boss.resistance).toBe('Ballad')
    expect(boss.vulnerability).toBeNull()
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
  it('grows unmoved by the strongest performance\'s element', () => {
    const result = computeBossAdaptation([
      perf('p1', 20, 'Ballad'),
      perf('p2', 35, 'Folk'),
      perf('p3', 8, 'Shanty'),
    ])
    expect(result).toEqual({ resistGenre: 'Folk' })
  })

  it('does not adapt in a solo showdown', () => {
    expect(computeBossAdaptation([perf('p1', 25, 'Ballad')])).toEqual({ resistGenre: null })
  })

  it('does not adapt with no performances', () => {
    expect(computeBossAdaptation([])).toEqual({ resistGenre: null })
  })

  it('adapts even when every performance shares an element', () => {
    const result = computeBossAdaptation([perf('p1', 30, 'Ballad'), perf('p2', 10, 'Ballad')])
    expect(result.resistGenre).toBe('Ballad')
  })

  it('breaks ties by performance order', () => {
    const result = computeBossAdaptation([
      perf('p1', 30, 'Ballad'),
      perf('p2', 30, 'Folk'),
      perf('p3', 10, 'Hymn'),
    ])
    expect(result.resistGenre).toBe('Ballad')
  })

  it('ignores performances without an element', () => {
    expect(computeBossAdaptation([perf('p1', 30, 'Ballad'), perf('p2', 5, null)])).toEqual({ resistGenre: null })
  })
})

describe('getPlayableSongs', () => {
  it('only returns songs with at least one die', () => {
    const withDice = song('Ballad')
    const empty = { ...song(null), id: 's2' }
    expect(getPlayableSongs([withDice, empty])).toEqual([withDice])
  })
})

describe('the crown', () => {
  it('goes to the most Fame, counting Showdown Fame, and is shared on a tie', () => {
    const players = [{ id: 'a', fame: 200 }, { id: 'b', fame: 150 }, { id: 'c', fame: 120 }]
    expect(crownHolders(players, {})).toEqual(['a'])
    expect(crownHolders(players, { b: 60 })).toEqual(['b'])
    expect(crownHolders(players, { b: 50 })).toEqual(['a', 'b'])
  })

  it('rounds verse Fame down to whole chips', () => {
    expect(verseFame(23)).toBe(20)
    expect(verseFame(4)).toBe(0)
    expect(verseFame(45)).toBe(45)
    expect(withTunables({ ...DEFAULT_TUNABLES, showdownFameRounding: 1, showdownFandomMultiplier: 2 }, () => verseFame(23))).toBe(46)
  })

  it('pays 50 for beating the crown holder, 25 for matching, nothing to the holder', () => {
    const verse = [perf('a', 14, 'Ballad'), perf('b', 14, 'Folk'), perf('c', 22, 'Hymn'), perf('d', 9, 'Shanty')]
    expect(crownBonus(verse[0], verse, ['a'])).toBe(0)
    expect(crownBonus(verse[1], verse, ['a'])).toBe(25)
    expect(crownBonus(verse[2], verse, ['a'])).toBe(50)
    expect(crownBonus(verse[3], verse, ['a'])).toBe(0)
  })

  it('compares against the best verse of tied crown holders, and a 0 never matches', () => {
    const verse = [perf('a', 10, 'Ballad'), perf('b', 18, 'Folk'), perf('c', 15, 'Hymn')]
    expect(crownBonus(verse[2], verse, ['a', 'b'])).toBe(0)
    const silent = [perf('a', 0, null), perf('b', 0, null)]
    expect(crownBonus(silent[1], silent, ['a'])).toBe(0)
  })

  it('settles a verse into earned Fame', () => {
    const settled = settleVerse([perf('a', 44, 'Ballad'), perf('b', 17, 'Folk'), perf('c', 24, 'Hymn')], ['a'])
    expect(settled.map((s) => s.earned)).toEqual([40, 15, 20])
    const comeback = settleVerse([perf('a', 14, 'Folk'), perf('b', 14, 'Folk'), perf('c', 22, 'Folk')], ['a'])
    expect(comeback.map((s) => [s.earned, s.crownBonus])).toEqual([[10, 0], [35, 25], [70, 50]])
  })
})
