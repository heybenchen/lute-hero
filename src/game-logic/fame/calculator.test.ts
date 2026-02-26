import { describe, it, expect } from 'vitest'
import {
  calculateFameEarned,
  calculateFailureBonus,
  calculateCollectiveFame,
  calculateTotalMonstersDefeated,
  calculateFinalRankings,
  calculateMonsterExp,
  calculateTotalMonsterExp,
  getNextPhase,
} from './calculator'
import { Player, Monster } from '@/types'

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
    hasShoppedThisTurn: false,
    ...overrides,
  })

  describe('calculateFameEarned', () => {
    it('should calculate fame with 1x multiplier for 1-3 monsters', () => {
      expect(calculateFameEarned(0, 1)).toBe(10) // 0 + 1 = 1 total, 1x multiplier * 10
      expect(calculateFameEarned(1, 1)).toBe(10) // 1 + 1 = 2 total, 1x multiplier * 10
      expect(calculateFameEarned(2, 1)).toBe(10) // 2 + 1 = 3 total, 1x multiplier * 10
    })

    it('should calculate fame with 2x multiplier for 4-6 monsters', () => {
      expect(calculateFameEarned(3, 1)).toBe(20) // 3 + 1 = 4 total, 2x multiplier * 10
      expect(calculateFameEarned(4, 2)).toBe(40) // 4 + 2 = 6 total, 2x multiplier * 10
    })

    it('should calculate fame with 3x multiplier for 7-9 monsters', () => {
      expect(calculateFameEarned(6, 1)).toBe(30) // 6 + 1 = 7 total, 3x multiplier * 10
      expect(calculateFameEarned(8, 1)).toBe(30) // 8 + 1 = 9 total, 3x multiplier * 10
    })

    it('should calculate fame with 4x multiplier for 10+ monsters', () => {
      expect(calculateFameEarned(9, 1)).toBe(40) // 9 + 1 = 10 total, 4x multiplier * 10
      expect(calculateFameEarned(15, 2)).toBe(80) // 15 + 2 = 17 total, 4x multiplier * 10
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
        createTestPlayer({ fame: 100 }),
        createTestPlayer({ fame: 200 }),
        createTestPlayer({ fame: 150 }),
      ]

      expect(calculateCollectiveFame(players)).toBe(450)
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
        createTestPlayer({ id: 'p1', fame: 100 }),
        createTestPlayer({ id: 'p2', fame: 300 }),
        createTestPlayer({ id: 'p3', fame: 200 }),
      ]

      const rankings = calculateFinalRankings(players)

      expect(rankings[0].id).toBe('p2')
      expect(rankings[1].id).toBe('p3')
      expect(rankings[2].id).toBe('p1')
    })

    it('should use boss damage as tiebreaker', () => {
      const players = [
        createTestPlayer({ id: 'p1', fame: 200, totalBossDamage: 50 }),
        createTestPlayer({ id: 'p2', fame: 200, totalBossDamage: 100 }),
        createTestPlayer({ id: 'p3', fame: 200, totalBossDamage: 75 }),
      ]

      const rankings = calculateFinalRankings(players)

      expect(rankings[0].id).toBe('p2') // Highest boss damage
      expect(rankings[1].id).toBe('p3')
      expect(rankings[2].id).toBe('p1')
    })

    it('should not modify original array', () => {
      const players = [
        createTestPlayer({ id: 'p1', fame: 100 }),
        createTestPlayer({ id: 'p2', fame: 300 }),
      ]

      const originalOrder = players.map((p) => p.id)
      calculateFinalRankings(players)

      expect(players.map((p) => p.id)).toEqual(originalOrder)
    })
  })

  describe('calculateMonsterExp', () => {
    it('should return 5 + level * 5', () => {
      expect(calculateMonsterExp(1)).toBe(10)
      expect(calculateMonsterExp(2)).toBe(15)
      expect(calculateMonsterExp(3)).toBe(20)
      expect(calculateMonsterExp(4)).toBe(25)
    })
  })

  describe('calculateTotalMonsterExp', () => {
    const createTestMonster = (level: number): Monster => ({
      id: `m-${level}`,
      templateId: 'test',
      name: 'Test',
      currentHP: 0,
      maxHP: 20,
      vulnerability: null,
      resistance: null,
      isBoss: false,
      level,
    })

    it('should sum EXP across all monsters', () => {
      const monsters = [createTestMonster(1), createTestMonster(2), createTestMonster(3)]
      // 10 + 15 + 20 = 45
      expect(calculateTotalMonsterExp(monsters)).toBe(45)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalMonsterExp([])).toBe(0)
    })
  })

  describe('getNextPhase', () => {
    it('should transition from main to underground at fame threshold', () => {
      expect(getNextPhase('main', 200)).toBe('underground')
      expect(getNextPhase('main', 300)).toBe('underground')
    })

    it('should not transition from main below threshold', () => {
      expect(getNextPhase('main', 199)).toBeNull()
      expect(getNextPhase('main', 0)).toBeNull()
    })

    it('should transition from underground to finalBoss at fame threshold', () => {
      expect(getNextPhase('underground', 300)).toBe('finalBoss')
      expect(getNextPhase('underground', 400)).toBe('finalBoss')
    })

    it('should not transition from underground below threshold', () => {
      expect(getNextPhase('underground', 299)).toBeNull()
      expect(getNextPhase('underground', 150)).toBeNull()
    })

    it('should not transition from setup, finalBoss, or gameOver', () => {
      expect(getNextPhase('setup', 1000)).toBeNull()
      expect(getNextPhase('finalBoss', 1000)).toBeNull()
      expect(getNextPhase('gameOver', 1000)).toBeNull()
    })
  })
})
