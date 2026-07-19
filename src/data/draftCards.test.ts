import { describe, it, expect } from 'vitest'
import {
  NEW_D4_COST,
  UPGRADE_COSTS,
  getNextDiceType,
  getUpgradeCost,
  createElementalDie,
  getInspirationCost,
} from './draftCards'

describe('Elemental Dice Shop', () => {
  describe('costs', () => {
    it('should cost 5 EXP for a new d4', () => {
      expect(NEW_D4_COST).toBe(5)
    })

    it('should cost 5/15/30 EXP to upgrade to d6/d12/d20', () => {
      expect(UPGRADE_COSTS.d6).toBe(5)
      expect(UPGRADE_COSTS.d12).toBe(15)
      expect(UPGRADE_COSTS.d20).toBe(30)
    })

    it('should escalate inspiration cost by 5 EXP per purchase this turn', () => {
      expect(getInspirationCost(0)).toBe(5)
      expect(getInspirationCost(1)).toBe(10)
      expect(getInspirationCost(2)).toBe(15)
      expect(getInspirationCost(3)).toBe(20)
    })
  })

  describe('getNextDiceType', () => {
    it('should follow the d4 -> d6 -> d12 -> d20 path', () => {
      expect(getNextDiceType('d4')).toBe('d6')
      expect(getNextDiceType('d6')).toBe('d12')
      expect(getNextDiceType('d12')).toBe('d20')
    })

    it('should return null for a maxed d20', () => {
      expect(getNextDiceType('d20')).toBeNull()
    })
  })

  describe('getUpgradeCost', () => {
    it('should price upgrades by the resulting die type', () => {
      expect(getUpgradeCost('d4')).toBe(5) // -> d6
      expect(getUpgradeCost('d6')).toBe(15) // -> d12
      expect(getUpgradeCost('d12')).toBe(30) // -> d20
    })

    it('should return null for a maxed d20', () => {
      expect(getUpgradeCost('d20')).toBeNull()
    })
  })

  describe('createElementalDie', () => {
    it('should create a d4 of the requested element', () => {
      const die = createElementalDie('Folk')
      expect(die.type).toBe('d4')
      expect(die.genre).toBe('Folk')
    })

    it('should assign unique ids', () => {
      const a = createElementalDie('Ballad')
      const b = createElementalDie('Ballad')
      expect(a.id).not.toBe(b.id)
    })
  })
})
