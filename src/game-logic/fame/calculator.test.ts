import { describe, it, expect } from 'vitest'
import {
  calculateFameEarned,
  calculateFailureBonus,
  calculateCollectiveFame,
  calculateTotalMonstersDefeated,
  calculateFinalRankings,
} from './calculator'
import { Player } from '@/types'

describe('Fame Calculator', () => {
  const createTestPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 'test-player',
    name: 'Test Player',
    color: '#ff0000',
    position: 0,
    songs: [],
    exp: 0,
    fame: 0,
    monstersDefeated: 0,
    isEliminated: false,
    totalBossDamage: 0,
    movesThisTurn: 0,
    fightsThisTurn: 0,
    ...overrides,
  })

  describe('calculateFameEarned', () => {
    it('should calculate fame with 1x multiplier for 1-3 monsters', () => {
      expect(calculateFameEarned(0, 1)).toBe(1) // 0 + 1 = 1 total, 1x multiplier
      expect(calculateFameEarned(1, 1)).toBe(1) // 1 + 1 = 2 total, 1x multiplier
      expect(calculateFameEarned(2, 1)).toBe(1) // 2 + 1 = 3 total, 1x multiplier
    })

    it('should calculate fame with 2x multiplier for 4-6 monsters', () => {
      expect(calculateFameEarned(3, 1)).toBe(2) // 3 + 1 = 4 total, 2x multiplier
      expect(calculateFameEarned(4, 2)).toBe(4) // 4 + 2 = 6 total, 2x multiplier
    })

    it('should calculate fame with 3x multiplier for 7-9 monsters', () => {
      expect(calculateFameEarned(6, 1)).toBe(3) // 6 + 1 = 7 total, 3x multiplier
      expect(calculateFameEarned(8, 1)).toBe(3) // 8 + 1 = 9 total, 3x multiplier
    })

    it('should calculate fame with 4x multiplier for 10+ monsters', () => {
      expect(calculateFameEarned(9, 1)).toBe(4) // 9 + 1 = 10 total, 4x multiplier
      expect(calculateFameEarned(15, 2)).toBe(8) // 15 + 2 = 17 total, 4x multiplier
    })
  })

  describe('calculateFailureBonus', () => {
    it('should add 50% bonus to base EXP', () => {
      expect(calculateFailureBonus(10)).toBe(15)
      expect(calculateFailureBonus(20)).toBe(30)
      expect(calculateFailureBonus(100)).toBe(150)
    })
  })

  describe('calculateCollectiveFame', () => {
    it('should sum fame across all players', () => {
      const players = [
        createTestPlayer({ fame: 10 }),
        createTestPlayer({ fame: 20 }),
        createTestPlayer({ fame: 15 }),
      ]

      expect(calculateCollectiveFame(players)).toBe(45)
    })

    it('should return 0 for no players', () => {
      expect(calculateCollectiveFame([])).toBe(0)
    })
  })

  describe('calculateTotalMonstersDefeated', () => {
    it('should sum monsters defeated across all players', () => {
      const players = [
        createTestPlayer({ monstersDefeated: 5 }),
        createTestPlayer({ monstersDefeated: 3 }),
        createTestPlayer({ monstersDefeated: 7 }),
      ]

      expect(calculateTotalMonstersDefeated(players)).toBe(15)
    })
  })

  describe('calculateFinalRankings', () => {
    it('should rank players by fame (highest first)', () => {
      const players = [
        createTestPlayer({ id: 'p1', fame: 10 }),
        createTestPlayer({ id: 'p2', fame: 30 }),
        createTestPlayer({ id: 'p3', fame: 20 }),
      ]

      const rankings = calculateFinalRankings(players)

      expect(rankings[0].id).toBe('p2')
      expect(rankings[1].id).toBe('p3')
      expect(rankings[2].id).toBe('p1')
    })

    it('should use boss damage as tiebreaker', () => {
      const players = [
        createTestPlayer({ id: 'p1', fame: 20, totalBossDamage: 50 }),
        createTestPlayer({ id: 'p2', fame: 20, totalBossDamage: 100 }),
        createTestPlayer({ id: 'p3', fame: 20, totalBossDamage: 75 }),
      ]

      const rankings = calculateFinalRankings(players)

      expect(rankings[0].id).toBe('p2') // Highest boss damage
      expect(rankings[1].id).toBe('p3')
      expect(rankings[2].id).toBe('p1')
    })

    it('should not modify original array', () => {
      const players = [
        createTestPlayer({ id: 'p1', fame: 10 }),
        createTestPlayer({ id: 'p2', fame: 30 }),
      ]

      const originalOrder = players.map((p) => p.id)
      calculateFinalRankings(players)

      expect(players.map((p) => p.id)).toEqual(originalOrder)
    })
  })
})
