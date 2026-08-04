import { describe, it, expect } from 'vitest'
import { dealBalancedGenreTags, createBoardGraph } from './graphBuilder'
import { mulberry32 } from '../../engine/rng'
import { ALL_GENRES } from '../../data/genreTheme'
import { Genre } from '../../types'

function tally(dealt: Genre[][]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(ALL_GENRES.map((g) => [g, 0]))
  for (const tags of dealt) for (const tag of tags) counts[tag]++
  return counts
}

describe('dealBalancedGenreTags', () => {
  it('gives each space exactly the requested number of chips', () => {
    const dealt = dealBalancedGenreTags(16, 1, mulberry32(1))
    expect(dealt).toHaveLength(16)
    expect(dealt.every((tags) => tags.length === 1)).toBe(true)

    const three = dealBalancedGenreTags(16, 3, mulberry32(1))
    expect(three.every((tags) => tags.length === 3)).toBe(true)
  })

  it('splits the pool evenly across elements when it divides', () => {
    // 16 x 1 = 16 chips → 4 each; 16 x 3 = 48 → 12 each
    expect(tally(dealBalancedGenreTags(16, 1, mulberry32(7)))).toEqual({ Ballad: 4, Folk: 4, Hymn: 4, Shanty: 4 })
    expect(tally(dealBalancedGenreTags(16, 3, mulberry32(7)))).toEqual({ Ballad: 12, Folk: 12, Hymn: 12, Shanty: 12 })
  })

  it('never puts an element more than one chip ahead when it does not divide', () => {
    // 6 chips over 4 elements → two elements get 2, the rest 1
    const counts = Object.values(tally(dealBalancedGenreTags(6, 1, mulberry32(3))))
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(6)
  })

  it('is deterministic per seed but varies across seeds', () => {
    const flat = (seed: number) => dealBalancedGenreTags(16, 1, mulberry32(seed)).flat().join()
    expect(flat(5)).toBe(flat(5))
    expect(flat(5)).not.toBe(flat(6))
  })

  it('covers a real board with no empty space', () => {
    const board = createBoardGraph()
    const dealt = dealBalancedGenreTags(board.length, 1, mulberry32(11))
    expect(dealt.every((tags) => tags.length > 0)).toBe(true)
  })
})
