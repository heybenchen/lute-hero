import { describe, it, expect } from 'vitest'
import { ELEMENT_MATCHUPS, getMatchup } from './resistances'
import { MONSTER_TEMPLATES } from './monsters'
import { getGenreMultiplier } from '../game-logic/combat/damageCalculator'
import { Monster, Genre } from '../types/index'

describe('ELEMENT_MATCHUPS', () => {
  it('covers all four non-boss elements', () => {
    expect(ELEMENT_MATCHUPS.map((m) => m.element).sort()).toEqual([
      'Ballad',
      'Folk',
      'Hymn',
      'Shanty',
    ])
  })

  it('makes each element weak to its own genre', () => {
    for (const m of ELEMENT_MATCHUPS) {
      expect(m.weakTo).toBe(m.element)
    }
  })

  it('pairs immunities mutually (opposite elements are immune to each other)', () => {
    for (const m of ELEMENT_MATCHUPS) {
      const opposite = getMatchup(m.immuneTo)
      expect(opposite?.immuneTo).toBe(m.element)
    }
  })

  it('matches the multipliers the engine actually applies', () => {
    for (const m of ELEMENT_MATCHUPS) {
      // Build a representative monster of this element from a real template.
      const template = MONSTER_TEMPLATES.find(
        (t) => !t.isBoss && t.vulnerability === m.element,
      )!
      const monster: Monster = {
        id: 't',
        templateId: template.id,
        name: template.name,
        currentHP: template.baseHP,
        maxHP: template.baseHP,
        vulnerability: template.vulnerability,
        resistance: template.resistance,
        isBoss: false,
        level: 1,
      }
      expect(getGenreMultiplier(m.weakTo, monster)).toBe(2)
      expect(getGenreMultiplier(m.immuneTo, monster)).toBe(0)
      const neutral = (['Ballad', 'Folk', 'Hymn', 'Shanty'] as Genre[]).find(
        (g) => g !== m.weakTo && g !== m.immuneTo,
      )!
      expect(getGenreMultiplier(neutral, monster)).toBe(1)
    }
  })
})
