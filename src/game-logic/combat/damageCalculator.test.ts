import { describe, it, expect } from 'vitest'
import {
  getGenreMultiplier,
  applyDamageToMonster,
  isMonsterDefeated,
} from './damageCalculator'
import { Monster } from '@/types'

describe('Damage Calculator', () => {
  const createTestMonster = (): Monster => ({
    id: 'test-monster',
    templateId: 'test',
    name: 'Test Monster',
    currentHP: 50,
    maxHP: 50,
    vulnerability: 'Rock',
    resistance: 'Classical',
    isElite: false,
    isBoss: false,
    level: 1,
  })

  describe('getGenreMultiplier', () => {
    it('should return 2x for vulnerable genre', () => {
      const monster = createTestMonster()

      expect(getGenreMultiplier('Rock', monster)).toBe(2.0)
    })

    it('should return 0.5x for resistant genre', () => {
      const monster = createTestMonster()

      expect(getGenreMultiplier('Classical', monster)).toBe(0.5)
    })

    it('should return 1x for neutral genres', () => {
      const monster = createTestMonster()

      expect(getGenreMultiplier('Pop', monster)).toBe(1.0)
      expect(getGenreMultiplier('Electronic', monster)).toBe(1.0)
      expect(getGenreMultiplier('HipHop', monster)).toBe(1.0)
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
})
