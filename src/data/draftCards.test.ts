import { describe, it, expect } from 'vitest'
import { getStudioLevel, generateDicePairCard } from './draftCards'

describe('Studio Level', () => {
  describe('getStudioLevel', () => {
    it('should return level 1 for 0-4 monsters defeated', () => {
      expect(getStudioLevel(0)).toBe(1)
      expect(getStudioLevel(1)).toBe(1)
      expect(getStudioLevel(4)).toBe(1)
    })

    it('should return level 2 for 5-9 monsters defeated', () => {
      expect(getStudioLevel(5)).toBe(2)
      expect(getStudioLevel(7)).toBe(2)
      expect(getStudioLevel(9)).toBe(2)
    })

    it('should return level 3 for 10+ monsters defeated', () => {
      expect(getStudioLevel(10)).toBe(3)
      expect(getStudioLevel(20)).toBe(3)
    })
  })

  describe('generateDicePairCard with studioLevel', () => {
    it('should generate valid dice pair cards at any studio level', () => {
      for (const level of [1, 2, 3]) {
        const card = generateDicePairCard('test-player', level)
        expect(card.type).toBe('dice')
        expect(card.dice).toHaveLength(2)
        expect(card.cost).toBeGreaterThanOrEqual(7)
        expect(card.cost).toBeLessThanOrEqual(25)
      }
    })

    it('should favor cheap dice at studio level 1', () => {
      const costs: number[] = []
      for (let i = 0; i < 200; i++) {
        const card = generateDicePairCard('test-player', 1)
        costs.push(card.cost)
      }
      const cheapCount = costs.filter((c) => c <= 10).length
      // At level 1, ~60% should be cheap (allow margin for randomness)
      expect(cheapCount).toBeGreaterThan(80) // At least 40% of 200
    })

    it('should favor expensive dice at studio level 3', () => {
      const costs: number[] = []
      for (let i = 0; i < 200; i++) {
        const card = generateDicePairCard('test-player', 3)
        costs.push(card.cost)
      }
      const expensiveCount = costs.filter((c) => c > 15).length
      // At level 3, ~60% should be expensive (allow margin for randomness)
      expect(expensiveCount).toBeGreaterThan(80) // At least 40% of 200
    })

    it('should default to level 1 when no studio level provided', () => {
      const card = generateDicePairCard('test-player')
      expect(card.type).toBe('dice')
      expect(card.dice).toHaveLength(2)
    })
  })
})
