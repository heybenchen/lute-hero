import { describe, it, expect } from 'vitest'
import {
  createInspirationPool,
  drawInspirationDice,
  getInspirationCost,
  generateSongCard,
  getAllowedDiceTypes,
  SINGLE_DICE_COSTS,
  D12_FAME_THRESHOLD,
  D20_FAME_THRESHOLD,
} from './draftCards'

describe('Inspiration System', () => {
  describe('getInspirationCost', () => {
    it('should cost 10 EXP for first seek (rollCount 0)', () => {
      expect(getInspirationCost(0)).toBe(10)
    })

    it('should escalate cost by 10 per re-roll', () => {
      expect(getInspirationCost(1)).toBe(20)
      expect(getInspirationCost(2)).toBe(30)
      expect(getInspirationCost(3)).toBe(40)
    })
  })

  describe('getAllowedDiceTypes', () => {
    it('should return only d4 and d6 at low fame', () => {
      expect(getAllowedDiceTypes(0)).toEqual(['d4', 'd6'])
      expect(getAllowedDiceTypes(D12_FAME_THRESHOLD - 1)).toEqual(['d4', 'd6'])
    })

    it('should unlock d12 at D12_FAME_THRESHOLD', () => {
      const types = getAllowedDiceTypes(D12_FAME_THRESHOLD)
      expect(types).toContain('d12')
      expect(types).not.toContain('d20')
    })

    it('should unlock d20 at D20_FAME_THRESHOLD', () => {
      const types = getAllowedDiceTypes(D20_FAME_THRESHOLD)
      expect(types).toContain('d12')
      expect(types).toContain('d20')
    })
  })

  describe('createInspirationPool', () => {
    it('should create 2 of each (type x genre) per player', () => {
      const pool = createInspirationPool(2)
      // 4 genres x 4 types x 2 copies x 2 players = 64
      expect(pool).toHaveLength(64)
    })

    it('should create 128 dice for 4 players', () => {
      const pool = createInspirationPool(4)
      expect(pool).toHaveLength(128)
    })

    it('should include all genres and dice types', () => {
      const pool = createInspirationPool(1)
      const genres = new Set(pool.map((d) => d.genre))
      const types = new Set(pool.map((d) => d.type))

      expect(genres).toEqual(new Set(['Ballad', 'Folk', 'Hymn', 'Shanty']))
      expect(types).toEqual(new Set(['d4', 'd6', 'd12', 'd20']))
    })
  })

  describe('drawInspirationDice', () => {
    it('should draw the requested number of dice', () => {
      const pool = createInspirationPool(2)
      const { drawn, remainingPool } = drawInspirationDice(pool, 3)

      expect(drawn).toHaveLength(3)
      expect(remainingPool).toHaveLength(pool.length - 3)
    })

    it('should assign correct costs based on dice type', () => {
      const pool = createInspirationPool(2)
      const { drawn } = drawInspirationDice(pool, 3)

      drawn.forEach((item) => {
        expect(item.cost).toBe(SINGLE_DICE_COSTS[item.dice.type])
      })
    })

    it('should handle empty pool', () => {
      const { drawn, remainingPool } = drawInspirationDice([], 3)

      expect(drawn).toHaveLength(0)
      expect(remainingPool).toHaveLength(0)
    })

    it('should draw fewer if pool is smaller than requested', () => {
      const pool = createInspirationPool(1).slice(0, 2) // Only 2 dice
      const { drawn } = drawInspirationDice(pool, 3)

      expect(drawn).toHaveLength(2)
    })

    it('should weight against genres players already own', () => {
      // Create a pool with just Ballad and Folk
      const pool = createInspirationPool(4)
      const genreCounts = { Ballad: 10, Folk: 0, Hymn: 0, Shanty: 0 }

      // Draw many times and check distribution
      let balladCount = 0
      let otherCount = 0
      for (let i = 0; i < 100; i++) {
        const { drawn } = drawInspirationDice(pool, 3, genreCounts)
        drawn.forEach((d) => {
          if (d.dice.genre === 'Ballad') balladCount++
          else otherCount++
        })
      }

      // Ballad should appear much less frequently since players own 10
      expect(balladCount).toBeLessThan(otherCount)
    })

    it('should only draw allowed dice types when allowedTypes is provided', () => {
      const pool = createInspirationPool(2)
      const { drawn, remainingPool } = drawInspirationDice(pool, 4, undefined, ['d4', 'd6'])

      drawn.forEach((item) => {
        expect(['d4', 'd6']).toContain(item.dice.type)
      })
      // Locked dice (d12, d20) remain in the pool
      const lockedInPool = remainingPool.filter((d) => d.type === 'd12' || d.type === 'd20')
      expect(lockedInPool.length).toBeGreaterThan(0)
    })

    it('should keep total dice count consistent when filtering by type', () => {
      const pool = createInspirationPool(2)
      const { drawn, remainingPool } = drawInspirationDice(pool, 4, undefined, ['d4', 'd6'])

      expect(drawn.length + remainingPool.length).toBe(pool.length)
    })
  })

  describe('generateSongCard', () => {
    it('should generate a song card with correct type', () => {
      const card = generateSongCard()
      expect(card.type).toBe('song')
    })

    it('should cost 10 EXP', () => {
      const card = generateSongCard()
      expect(card.cost).toBe(10)
    })

    it('should have a song name', () => {
      const card = generateSongCard()
      expect(card.songName).toBeTruthy()
    })

    it('should have two effects', () => {
      const card = generateSongCard()
      expect(card.songEffect).toBeDefined()
      expect(card.songEffect2).toBeDefined()
    })
  })
})
