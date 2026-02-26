import { describe, it, expect, vi } from 'vitest'
import {
  getMaxValue,
  getMinValue,
  rollDie,
  rollDiceWithCrit,
  flipDiceValue,
  calculateBaseDamage,
  calculateCritBonuses,
} from './roller'
import { Dice, DiceType } from '@/types'

describe('Dice Roller', () => {
  describe('getMaxValue', () => {
    it('should return correct max values for each dice type', () => {
      expect(getMaxValue('d4')).toBe(4)
      expect(getMaxValue('d6')).toBe(6)
      expect(getMaxValue('d8')).toBe(8)
      expect(getMaxValue('d12')).toBe(12)
    })
  })

  describe('getMinValue', () => {
    it('should always return 1', () => {
      expect(getMinValue()).toBe(1)
    })
  })

  describe('rollDie', () => {
    it('should return a value between 1 and max', () => {
      const diceTypes: DiceType[] = ['d4', 'd6', 'd8', 'd12']

      diceTypes.forEach((type) => {
        const max = getMaxValue(type)
        const result = rollDie(type)

        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(max)
        expect(Number.isInteger(result)).toBe(true)
      })
    })

    it('should produce different results over multiple rolls', () => {
      const results = new Set()
      for (let i = 0; i < 20; i++) {
        results.add(rollDie('d12'))
      }
      // Should have at least some variety
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('rollDiceWithCrit', () => {
    it('should return DiceRoll with correct structure', () => {
      const dice: Dice = {
        id: 'test-dice',
        type: 'd6',
        genre: 'Ballad',
      }

      const result = rollDiceWithCrit(dice)

      expect(result).toHaveProperty('diceId', 'test-dice')
      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('isCrit')
      expect(result).toHaveProperty('critBonus')
      expect(result.value).toBeGreaterThanOrEqual(1)
      expect(result.value).toBeLessThanOrEqual(6)
    })

    it('should add flat +5 bonus on max roll (crit)', () => {
      const dice: Dice = {
        id: 'test-dice',
        type: 'd6',
        genre: 'Ballad',
      }

      // Mock Math.random to always return max
      vi.spyOn(Math, 'random').mockReturnValue(0.9999)

      const result = rollDiceWithCrit(dice)

      expect(result.value).toBe(6)
      expect(result.isCrit).toBe(true)
      expect(result.critBonus).toBe(4)

      vi.restoreAllMocks()
    })

    it('should not add crit bonus on non-max roll', () => {
      const dice: Dice = {
        id: 'test-dice',
        type: 'd6',
        genre: 'Ballad',
      }

      // Mock Math.random to return non-max
      vi.spyOn(Math, 'random').mockReturnValue(0.5)

      const result = rollDiceWithCrit(dice)

      expect(result.value).toBe(4) // Math.floor(0.5 * 6) + 1
      expect(result.isCrit).toBe(false)
      expect(result.critBonus).toBe(0)

      vi.restoreAllMocks()
    })
  })

  describe('flipDiceValue', () => {
    it('should flip dice values correctly', () => {
      expect(flipDiceValue(1, 'd6')).toBe(6)
      expect(flipDiceValue(6, 'd6')).toBe(1)
      expect(flipDiceValue(3, 'd6')).toBe(4)
      expect(flipDiceValue(3, 'd8')).toBe(6)
      expect(flipDiceValue(8, 'd8')).toBe(1)
    })
  })

  describe('calculateBaseDamage', () => {
    it('should sum up roll values', () => {
      const rolls = [
        { diceId: '1', value: 4, isCrit: false, critBonus: 0 },
        { diceId: '2', value: 6, isCrit: false, critBonus: 0 },
        { diceId: '3', value: 3, isCrit: false, critBonus: 0 },
      ]

      expect(calculateBaseDamage(rolls)).toBe(13)
    })

    it('should return 0 for empty rolls', () => {
      expect(calculateBaseDamage([])).toBe(0)
    })
  })

  describe('calculateCritBonuses', () => {
    it('should sum up crit bonuses', () => {
      const rolls = [
        { diceId: '1', value: 6, isCrit: true, critBonus: 4 },
        { diceId: '2', value: 4, isCrit: false, critBonus: 0 },
        { diceId: '3', value: 12, isCrit: true, critBonus: 4 },
      ]

      expect(calculateCritBonuses(rolls)).toBe(8)
    })

    it('should return 0 when no crits', () => {
      const rolls = [
        { diceId: '1', value: 4, isCrit: false, critBonus: 0 },
        { diceId: '2', value: 3, isCrit: false, critBonus: 0 },
      ]

      expect(calculateCritBonuses(rolls)).toBe(0)
    })
  })
})
