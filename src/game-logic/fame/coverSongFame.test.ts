import { describe, it, expect } from 'vitest'
import { roundDownTo5, calculateCoverFameSplit } from './coverSongFame'

describe('Cover Song Fame', () => {
  describe('roundDownTo5', () => {
    it('should round down to nearest 5', () => {
      expect(roundDownTo5(17)).toBe(15)
      expect(roundDownTo5(23)).toBe(20)
      expect(roundDownTo5(4)).toBe(0)
    })

    it('should keep exact multiples of 5', () => {
      expect(roundDownTo5(0)).toBe(0)
      expect(roundDownTo5(5)).toBe(5)
      expect(roundDownTo5(20)).toBe(20)
    })
  })

  describe('calculateCoverFameSplit', () => {
    it('should split fame in half rounded down to 5', () => {
      expect(calculateCoverFameSplit(40)).toBe(20)
      expect(calculateCoverFameSplit(30)).toBe(15)
      expect(calculateCoverFameSplit(10)).toBe(5)
    })

    it('should round down odd splits', () => {
      expect(calculateCoverFameSplit(7)).toBe(0)   // 3.5 -> 0
      expect(calculateCoverFameSplit(50)).toBe(25)  // 25 -> 25
    })

    it('should handle zero fame', () => {
      expect(calculateCoverFameSplit(0)).toBe(0)
    })
  })
})
