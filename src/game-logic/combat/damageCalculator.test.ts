import { describe, it, expect } from 'vitest'
import {
  getElementMultiplier,
  applyDamageToMonster,
  isMonsterDefeated,
  songsCanStillDamage,
  songIsImmune,
} from './damageCalculator'
import { Element, Monster, Song } from '@/types'

describe('Damage Calculator', () => {
  const createTestMonster = (): Monster => ({
    id: 'test-monster',
    templateId: 'test',
    name: 'Test Monster',
    currentHP: 50,
    maxHP: 50,
    vulnerability: 'Ballad',
    resistance: 'Shanty',
    isBoss: false,
    level: 1,
  })

  describe('getElementMultiplier', () => {
    it('should return 2x for vulnerable genre', () => {
      const monster = createTestMonster()

      expect(getElementMultiplier('Ballad', monster)).toBe(2.0)
    })

    it('should return 0x for resistant genre (immune)', () => {
      const monster = createTestMonster()

      expect(getElementMultiplier('Shanty', monster)).toBe(0)
    })

    it('should return 1x for neutral genres', () => {
      const monster = createTestMonster()

      expect(getElementMultiplier('Folk', monster)).toBe(1.0)
      expect(getElementMultiplier('Hymn', monster)).toBe(1.0)
    })
  })

  describe('applyDamageToMonster', () => {
    it('should reduce monster HP by damage amount', () => {
      const monster = createTestMonster()
      const updatedMonster = applyDamageToMonster(monster, 20)

      expect(updatedMonster.currentHP).toBe(30)
      expect(updatedMonster.maxHP).toBe(50)
    })

    it('should not reduce HP below 0', () => {
      const monster = createTestMonster()
      const updatedMonster = applyDamageToMonster(monster, 100)

      expect(updatedMonster.currentHP).toBe(0)
    })

    it('should not modify original monster', () => {
      const monster = createTestMonster()
      const originalHP = monster.currentHP

      applyDamageToMonster(monster, 20)

      expect(monster.currentHP).toBe(originalHP)
    })
  })

  describe('isMonsterDefeated', () => {
    it('should return true when HP is 0', () => {
      const monster: Monster = {
        ...createTestMonster(),
        currentHP: 0,
      }

      expect(isMonsterDefeated(monster)).toBe(true)
    })

    it('should return false when HP is above 0', () => {
      const monster = createTestMonster()

      expect(isMonsterDefeated(monster)).toBe(false)
    })

    it('should return true when HP is negative', () => {
      const monster: Monster = {
        ...createTestMonster(),
        currentHP: -5,
      }

      expect(isMonsterDefeated(monster)).toBe(true)
    })
  })

  describe('songIsImmune', () => {
    const song = (element: Element): Song => ({
      id: 's',
      used: false,
      slots: [{ dice: { id: 'd0', type: 'd8' as const, element } }],
    })
    const monster = (): Monster => ({
      id: 'm', templateId: 't', name: 'M', currentHP: 50, maxHP: 50,
      vulnerability: 'Ballad', resistance: 'Shanty', isBoss: false, level: 1,
    })

    it('is true only for the immune element', () => {
      expect(songIsImmune(song('Shanty'), monster())).toBe(true)
      expect(songIsImmune(song('Folk'), monster())).toBe(false)
      expect(songIsImmune(song('Ballad'), monster())).toBe(false)
    })

    it('is false for a song with no dice, and when Dissonance softens the hit', () => {
      expect(songIsImmune({ id: 's', used: false, slots: [{ dice: null }] }, monster())).toBe(false)
      expect(songIsImmune(song('Shanty'), monster(), { immuneMultiplier: 0.5 })).toBe(false)
      expect(songIsImmune(song('Shanty'), monster(), { immuneMultiplier: 1 })).toBe(false)
    })

    it('looks only at elements, so it works for the Showdown boss, which has no HP', () => {
      expect(songIsImmune(song('Shanty'), { ...monster(), currentHP: 0, maxHP: 0 })).toBe(true)
    })
  })

  describe('songsCanStillDamage', () => {
    const song = (element: Element | null): Song => ({
      id: `s-${element}`,
      slots: [{ dice: element ? { id: `d-${element}`, type: 'd4', element } : null }],
      used: false,
    })

    it('is true when some die is not immune for a living monster', () => {
      expect(songsCanStillDamage([song('Shanty'), song('Folk')], [createTestMonster()])).toBe(true)
    })

    it('is false when every die is immune for every living monster', () => {
      expect(songsCanStillDamage([song('Shanty'), song(null)], [createTestMonster()])).toBe(false)
    })

    it('ignores defeated monsters', () => {
      const dead = { ...createTestMonster(), id: 'dead', resistance: 'Folk' as Element, currentHP: 0 }
      expect(songsCanStillDamage([song('Shanty')], [createTestMonster(), { ...dead, resistance: 'Ballad' }])).toBe(false)
    })

    it('counts immune dice when Dissonance softens the hit', () => {
      expect(songsCanStillDamage([song('Shanty')], [createTestMonster()], { immuneMultiplier: 0.5 })).toBe(true)
    })
  })
})
