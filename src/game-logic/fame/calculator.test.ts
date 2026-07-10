import { describe, it, expect } from 'vitest'
import {
  calculateFameEarned,
  calculateMonsterFameValue,
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
    inspiration: 0,
    inspirationBoughtThisTurn: 0,
    ...overrides,
  })

  describe('calculateMonsterFameValue', () => {
    it('ramps steeply by level since songs hit all monsters at once', () => {
      expect(calculateMonsterFameValue(1)).toBe(10)
      expect(calculateMonsterFameValue(2)).toBe(30)
      expect(calculateMonsterFameValue(3)).toBe(70)
      expect(calculateMonsterFameValue(4)).toBe(150)
      expect(calculateMonsterFameValue(5)).toBe(250)
    })

    it('clamps levels past 5 to the top value (like the HP cap)', () => {
      expect(calculateMonsterFameValue(6)).toBe(250)
      expect(calculateMonsterFameValue(9)).toBe(250)
    })

    it('treats out-of-range low levels as level 1', () => {
      expect(calculateMonsterFameValue(0)).toBe(10)
    })
  })

  describe('calculateFameEarned', () => {
    it('awards each monster its level-based fame value', () => {
      expect(calculateFameEarned([1])).toBe(10)
      expect(calculateFameEarned([2])).toBe(30)
      expect(calculateFameEarned([4])).toBe(150)
    })

    it('sums fame across all defeated monsters', () => {
      expect(calculateFameEarned([1, 2, 3])).toBe(110) // 10 + 30 + 70
      expect(calculateFameEarned([2, 4])).toBe(180) // 30 + 150
    })

    it('returns 0 when nothing was defeated', () => {
      expect(calculateFameEarned([])).toBe(0)
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
    it('should transition from main to finalBoss at fame threshold (100 per player)', () => {
      // 4 players × 100 fame/player = 400 collective threshold
      expect(getNextPhase('main', 400, 4)).toBe('finalBoss')
      expect(getNextPhase('main', 500, 4)).toBe('finalBoss')
      // 2 players × 100 = 200
      expect(getNextPhase('main', 200, 2)).toBe('finalBoss')
    })

    it('should not transition from main below threshold', () => {
      expect(getNextPhase('main', 399, 4)).toBeNull()
      expect(getNextPhase('main', 0, 4)).toBeNull()
    })

    it('should not transition from setup, finalBoss, or gameOver', () => {
      expect(getNextPhase('setup', 1000, 4)).toBeNull()
      expect(getNextPhase('finalBoss', 1000, 4)).toBeNull()
      expect(getNextPhase('gameOver', 1000, 4)).toBeNull()
    })
  })
})
