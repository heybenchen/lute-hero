import { describe, it, expect } from 'vitest'
import {
  newD4Cost,
  upgradeCostFor,
  getNextDiceType,
  getUpgradeCost,
  createElementalDie,
  getInspirationCost,
} from './draftCards'
import { withTunables } from './tunables'

describe('Elemental Dice Shop', () => {
  describe('costs', () => {
    it('should cost 1 EXP for a new d4', () => {
      expect(newD4Cost()).toBe(1)
    })

    it('should cost 2/2/4 EXP to upgrade to d8/d12/d20', () => {
      expect(upgradeCostFor('d8')).toBe(2)
      expect(upgradeCostFor('d12')).toBe(2)
      expect(upgradeCostFor('d20')).toBe(4)
    })

    it('should cost a flat 1 EXP per Inspiration however many are bought this turn', () => {
      expect(getInspirationCost(0)).toBe(1)
      expect(getInspirationCost(1)).toBe(1)
      expect(getInspirationCost(3)).toBe(1)
    })

    it('should escalate when a cost step is set', () => {
      withTunables({ inspirationCostStep: 1 }, () => {
        expect(getInspirationCost(0)).toBe(1)
        expect(getInspirationCost(2)).toBe(3)
      })
    })
  })

  describe('getNextDiceType', () => {
    it('should follow the d4 -> d8 -> d12 -> d20 path', () => {
      expect(getNextDiceType('d4')).toBe('d8')
      expect(getNextDiceType('d8')).toBe('d12')
      expect(getNextDiceType('d12')).toBe('d20')
    })

    it('should return null for a maxed d20', () => {
      expect(getNextDiceType('d20')).toBeNull()
    })
  })

  describe('getUpgradeCost', () => {
    it('should price upgrades by the resulting die type', () => {
      expect(getUpgradeCost('d4')).toBe(2) // -> d8
      expect(getUpgradeCost('d8')).toBe(2) // -> d12
      expect(getUpgradeCost('d12')).toBe(4) // -> d20
    })

    it('should return null for a maxed d20', () => {
      expect(getUpgradeCost('d20')).toBeNull()
    })
  })

  describe('createElementalDie', () => {
    it('should create a d4 of the requested element', () => {
      const die = createElementalDie('Folk')
      expect(die.type).toBe('d4')
      expect(die.element).toBe('Folk')
    })

    it('should assign unique ids', () => {
      const a = createElementalDie('Ballad')
      const b = createElementalDie('Ballad')
      expect(a.id).not.toBe(b.id)
    })
  })
})
