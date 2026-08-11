import { describe, it, expect } from 'vitest'
import { dealBalancedGenreTags, createBoardGraph, scatterChipsRandomly, capGenreTags } from './graphBuilder'
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

describe('scatterChipsRandomly', () => {
  const board = () => createBoardGraph()
  const total = (spaces: ReturnType<typeof createBoardGraph>) =>
    spaces.reduce((n, s) => n + s.genreTags.length, 0)

  it('places every chip, never two on the same space', () => {
    const chips: Genre[] = ['Ballad', 'Folk', 'Hymn', 'Shanty', 'Ballad', 'Folk', 'Hymn', 'Shanty']
    for (const seed of [1, 7, 42, 2024]) {
      const out = scatterChipsRandomly(board(), chips, mulberry32(seed))
      expect(total(out)).toBe(chips.length)
      // 8 chips over 16 spaces — each landed somewhere different
      expect(Math.max(...out.map((s) => s.genreTags.length))).toBe(1)
    }
  })

  it('scatters differently per seed, and repeatably for one seed', () => {
    const chips: Genre[] = ['Ballad', 'Folk', 'Hymn', 'Shanty']
    const layout = (seed: number) =>
      scatterChipsRandomly(board(), chips, mulberry32(seed)).map((s) => s.genreTags.join()).join('|')
    expect(layout(1)).not.toBe(layout(2))
    expect(layout(1)).toBe(layout(1))
  })

  it('only doubles up once every space has taken one', () => {
    // 20 chips over 16 spaces: every space gets one, four get a second
    const chips: Genre[] = Array.from({ length: 20 }, (_, i) => ALL_GENRES[i % 4])
    const out = scatterChipsRandomly(board(), chips, mulberry32(5))
    expect(total(out)).toBe(20)
    expect(out.every((s) => s.genreTags.length >= 1)).toBe(true)
    expect(Math.max(...out.map((s) => s.genreTags.length))).toBe(2)
  })

  it('caps one element per space but leaves other elements free', () => {
    const tiny = [
      { id: 0, name: 'Solo', connections: [], genreTags: [] as Genre[], monsters: [], isEdge: false },
    ]
    // Six Ballad chips onto a single space: the per-element cap is 5
    const out = scatterChipsRandomly(tiny, Array<Genre>(6).fill('Ballad'), mulberry32(1))
    expect(out[0].genreTags).toHaveLength(5)

    // A different element still fits on that same (Ballad-capped) space —
    // there is no cap on a space's total chips
    const mixed = scatterChipsRandomly(out, ['Folk'], mulberry32(1))
    expect(mixed[0].genreTags).toHaveLength(6)
    expect(mixed[0].genreTags.filter((g) => g === 'Folk')).toHaveLength(1)
  })

  it('leaves the board untouched when there are no chips', () => {
    const before = board()
    expect(scatterChipsRandomly(before, [], mulberry32(1))).toBe(before)
  })
})

describe('capGenreTags', () => {
  it('trims each element to its cap, keeping order and other elements', () => {
    const tags: Genre[] = ['Ballad', 'Folk', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Folk']
    // 6 Ballad drops to 5; both Folk survive
    expect(capGenreTags(tags)).toEqual(['Ballad', 'Folk', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Folk'])
  })

  it('does not cap a space total, only per element', () => {
    const tags: Genre[] = [...ALL_GENRES, ...ALL_GENRES, ...ALL_GENRES]
    expect(capGenreTags(tags)).toHaveLength(12)
  })
})
