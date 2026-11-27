import { describe, it, expect } from 'vitest'
import { dealBalancedElementTags, createBoardGraph, scatterChipsRandomly, capElementTags, ensureStarterChips, getReachableMoves, getValidMoves } from './graphBuilder'
import { mulberry32 } from '../../engine/rng'
import { ALL_ELEMENTS } from '../../data/elementTheme'
import { Element } from '../../types'

function tally(dealt: Element[][]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(ALL_ELEMENTS.map((g) => [g, 0]))
  for (const tags of dealt) for (const tag of tags) counts[tag]++
  return counts
}

describe('dealBalancedElementTags', () => {
  it('gives each space exactly the requested number of chips', () => {
    const dealt = dealBalancedElementTags(16, 1, mulberry32(1))
    expect(dealt).toHaveLength(16)
    expect(dealt.every((tags) => tags.length === 1)).toBe(true)

    const three = dealBalancedElementTags(16, 3, mulberry32(1))
    expect(three.every((tags) => tags.length === 3)).toBe(true)
  })

  it('splits the pool evenly across elements when it divides', () => {
    // 16 x 1 = 16 chips → 4 each; 16 x 3 = 48 → 12 each
    expect(tally(dealBalancedElementTags(16, 1, mulberry32(7)))).toEqual({ Ballad: 4, Folk: 4, Hymn: 4, Shanty: 4 })
    expect(tally(dealBalancedElementTags(16, 3, mulberry32(7)))).toEqual({ Ballad: 12, Folk: 12, Hymn: 12, Shanty: 12 })
  })

  it('never puts an element more than one chip ahead when it does not divide', () => {
    // 6 chips over 4 elements → two elements get 2, the rest 1
    const counts = Object.values(tally(dealBalancedElementTags(6, 1, mulberry32(3))))
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
    expect(counts.reduce((a, b) => a + b, 0)).toBe(6)
  })

  it('is deterministic per seed but varies across seeds', () => {
    const flat = (seed: number) => dealBalancedElementTags(16, 1, mulberry32(seed)).flat().join()
    expect(flat(5)).toBe(flat(5))
    expect(flat(5)).not.toBe(flat(6))
  })

  it('covers a real board with no empty space', () => {
    const board = createBoardGraph()
    const dealt = dealBalancedElementTags(board.length, 1, mulberry32(11))
    expect(dealt.every((tags) => tags.length > 0)).toBe(true)
  })
})

describe('scatterChipsRandomly', () => {
  const board = () => createBoardGraph()
  const total = (spaces: ReturnType<typeof createBoardGraph>) =>
    spaces.reduce((n, s) => n + s.elementTags.length, 0)

  it('places every chip, never two on the same space', () => {
    const chips: Element[] = ['Ballad', 'Folk', 'Hymn', 'Shanty', 'Ballad', 'Folk', 'Hymn', 'Shanty']
    for (const seed of [1, 7, 42, 2024]) {
      const out = scatterChipsRandomly(board(), chips, mulberry32(seed))
      expect(total(out)).toBe(chips.length)
      // 8 chips over 16 spaces — each landed somewhere different
      expect(Math.max(...out.map((s) => s.elementTags.length))).toBe(1)
    }
  })

  it('scatters differently per seed, and repeatably for one seed', () => {
    const chips: Element[] = ['Ballad', 'Folk', 'Hymn', 'Shanty']
    const layout = (seed: number) =>
      scatterChipsRandomly(board(), chips, mulberry32(seed)).map((s) => s.elementTags.join()).join('|')
    expect(layout(1)).not.toBe(layout(2))
    expect(layout(1)).toBe(layout(1))
  })

  it('only doubles up once every space has taken one', () => {
    // 20 chips over 16 spaces: every space gets one, four get a second
    const chips: Element[] = Array.from({ length: 20 }, (_, i) => ALL_ELEMENTS[i % 4])
    const out = scatterChipsRandomly(board(), chips, mulberry32(5))
    expect(total(out)).toBe(20)
    expect(out.every((s) => s.elementTags.length >= 1)).toBe(true)
    expect(Math.max(...out.map((s) => s.elementTags.length))).toBe(2)
  })

  it('caps one element per space but leaves other elements free', () => {
    const tiny = [
      { id: 0, name: 'Solo', connections: [], elementTags: [] as Element[], monsters: [], isEdge: false },
    ]
    // Six Ballad chips onto a single space: the per-element cap is 5
    const out = scatterChipsRandomly(tiny, Array<Element>(6).fill('Ballad'), mulberry32(1))
    expect(out[0].elementTags).toHaveLength(5)

    // A different element still fits on that same (Ballad-capped) space —
    // there is no cap on a space's total chips
    const mixed = scatterChipsRandomly(out, ['Folk'], mulberry32(1))
    expect(mixed[0].elementTags).toHaveLength(6)
    expect(mixed[0].elementTags.filter((g) => g === 'Folk')).toHaveLength(1)
  })

  it('leaves the board untouched when there are no chips', () => {
    const before = board()
    expect(scatterChipsRandomly(before, [], mulberry32(1))).toBe(before)
  })
})

describe('capElementTags', () => {
  it('trims each element to its cap, keeping order and other elements', () => {
    const tags: Element[] = ['Ballad', 'Folk', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Folk']
    // 6 Ballad drops to 5; both Folk survive
    expect(capElementTags(tags)).toEqual(['Ballad', 'Folk', 'Ballad', 'Ballad', 'Ballad', 'Ballad', 'Folk'])
  })

  it('does not cap a space total, only per element', () => {
    const tags: Element[] = [...ALL_ELEMENTS, ...ALL_ELEMENTS, ...ALL_ELEMENTS]
    expect(capElementTags(tags)).toHaveLength(12)
  })
})

describe('ensureStarterChips', () => {
  const needs = [
    { spaceId: 0, element: 'Ballad' as const },
    { spaceId: 3, element: 'Folk' as const },
    { spaceId: 12, element: 'Hymn' as const },
    { spaceId: 15, element: 'Shanty' as const },
  ]
  const totals = (tags: string[][]) =>
    tags.flat().reduce<Record<string, number>>((acc, g) => ({ ...acc, [g]: (acc[g] ?? 0) + 1 }), {})

  it('puts each bard\'s element on their start space without changing element totals', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const perSpace of [1, 2, 3]) {
        const dealt = dealBalancedElementTags(16, perSpace, mulberry32(seed))
        const fixed = ensureStarterChips(dealt, needs, mulberry32(seed + 1000))
        for (const { spaceId, element } of needs) expect(fixed[spaceId]).toContain(element)
        expect(totals(fixed)).toEqual(totals(dealt))
        expect(fixed.map((t) => t.length)).toEqual(dealt.map((t) => t.length))
      }
    }
  })

  it('adds a chip when the opening board is empty', () => {
    const empty = Array.from({ length: 16 }, () => [])
    const fixed = ensureStarterChips(empty, needs, mulberry32(1))
    expect(fixed[0]).toEqual(['Ballad'])
    expect(fixed[15]).toEqual(['Shanty'])
  })
})

describe('getReachableMoves', () => {
  const board = createBoardGraph()

  it('with one move left is exactly the neighbours', () => {
    for (const space of board) {
      const reach = getReachableMoves(space.id, board, 1)
      expect(reach.map((r) => r.space.id).sort()).toEqual(getValidMoves(space.id, board).map((s) => s.id).sort())
      expect(reach.every((r) => r.steps === 1 && r.path.length === 1)).toBe(true)
    }
  })

  it('with two moves left adds the spaces two steps away, once each, never the start', () => {
    for (const space of board) {
      const reach = getReachableMoves(space.id, board, 2)
      const ids = reach.map((r) => r.space.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).not.toContain(space.id)
      const near = new Set(getValidMoves(space.id, board).map((s) => s.id))
      for (const r of reach) {
        expect(r.steps).toBe(near.has(r.space.id) ? 1 : 2)
        // The path is a real walk that ends on the space
        let at = space.id
        for (const step of r.path) {
          expect(board.find((s) => s.id === at)!.connections).toContain(step)
          at = step
        }
        expect(at).toBe(r.space.id)
        expect(r.path).toHaveLength(r.steps)
      }
      expect(reach.length).toBeGreaterThan(near.size)
    }
  })

  it('reaches nothing without moves left, and lists nearer spaces first', () => {
    expect(getReachableMoves(0, board, 0)).toEqual([])
    expect(getReachableMoves(999, board, 2)).toEqual([])
    const steps = getReachableMoves(5, board, 3).map((r) => r.steps)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
  })
})
