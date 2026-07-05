import { describe, it, expect } from 'vitest'
import {
  createElementBag,
  drawFromBag,
  shuffle,
  CHIPS_PER_ELEMENT_PER_PLAYER,
} from './elementBag'
import { Genre } from '@/types'

describe('Element Bag', () => {
  describe('createElementBag', () => {
    it('should contain 6 chips of each element per player', () => {
      const bag = createElementBag(2)
      // 4 elements x 6 chips x 2 players = 48
      expect(bag).toHaveLength(48)

      const counts = bag.reduce<Record<string, number>>((acc, g) => {
        acc[g] = (acc[g] || 0) + 1
        return acc
      }, {})
      for (const genre of ['Ballad', 'Folk', 'Hymn', 'Shanty']) {
        expect(counts[genre]).toBe(CHIPS_PER_ELEMENT_PER_PLAYER * 2)
      }
    })

    it('should scale with player count', () => {
      expect(createElementBag(4)).toHaveLength(96)
    })
  })

  describe('drawFromBag', () => {
    it('should draw the requested number and shrink the bag', () => {
      const bag = createElementBag(1)
      const { drawn, bag: rest } = drawFromBag(bag, [], 4)
      expect(drawn).toHaveLength(4)
      expect(rest).toHaveLength(bag.length - 4)
    })

    it('should not mutate the input arrays', () => {
      const bag = createElementBag(1)
      const before = [...bag]
      drawFromBag(bag, [], 4)
      expect(bag).toEqual(before)
    })

    it('should shuffle the discard back in when the bag empties', () => {
      const bag: Genre[] = ['Ballad', 'Folk']
      const discard: Genre[] = ['Hymn', 'Hymn', 'Shanty']
      const result = drawFromBag(bag, discard, 4)

      expect(result.drawn).toHaveLength(4)
      // First two drawn come from the bag (popped from the end)
      expect(result.drawn.slice(0, 2).sort()).toEqual(['Ballad', 'Folk'])
      // Remaining two come from the reshuffled discard
      expect(result.discard).toHaveLength(0)
      expect(result.bag).toHaveLength(1)
      // Chip conservation: drawn + bag = original bag + discard
      expect(result.drawn.length + result.bag.length).toBe(bag.length + discard.length)
    })

    it('should stop when bag and discard are both exhausted', () => {
      const { drawn, bag, discard } = drawFromBag(['Ballad'] as Genre[], [], 4)
      expect(drawn).toEqual(['Ballad'])
      expect(bag).toHaveLength(0)
      expect(discard).toHaveLength(0)
    })
  })

  describe('shuffle', () => {
    it('should preserve all items', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8]
      expect(shuffle(items).sort((a, b) => a - b)).toEqual(items)
    })
  })
})
