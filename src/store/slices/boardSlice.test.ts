import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store'
import { Genre } from '@/types'

describe('boardSlice spawning integration', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState({
      spaces: [],
    })
  })

  describe('initializeBoard + spawnInitialMonstersOnBoard', () => {
    it('should create 14 spaces with no monsters initially', () => {
      useGameStore.getState().initializeBoard()
      const { spaces } = useGameStore.getState()

      expect(spaces).toHaveLength(14)
      spaces.forEach((space) => {
        expect(space.monsters).toEqual([])
        expect(space.genreTags).toEqual([])
      })
    })

    it('should spawn one dominant-genre monster per space after adding tags', () => {
      useGameStore.getState().initializeBoard()
      useGameStore.getState().addGenreTags()
      useGameStore.getState().spawnInitialMonstersOnBoard()

      const { spaces } = useGameStore.getState()

      spaces.forEach((space) => {
        if (space.genreTags.length > 0) {
          // Initial spawn creates exactly 1 monster per space (dominant genre)
          expect(space.monsters).toHaveLength(1)
          expect(space.monsters[0].level).toBe(1)
        }
      })
    })
  })

  describe('spawnMonstersAtSpace', () => {
    it('should spawn one monster per unique genre in tags', () => {
      useGameStore.getState().initializeBoard()

      // Manually set tags on space 0 to control the test
      const spaces = useGameStore.getState().spaces
      const updatedSpaces = spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: ['Ballad', 'Folk'] as Genre[] } : s
      )
      useGameStore.setState({ spaces: updatedSpaces })

      useGameStore.getState().spawnMonstersAtSpace(0)

      const space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters).toHaveLength(2)
      expect(space.monsters[0].level).toBe(1)
      expect(space.monsters[1].level).toBe(1)
    })

    it('should level up monsters when duplicate genre tags exist', () => {
      useGameStore.getState().initializeBoard()

      const spaces = useGameStore.getState().spaces
      const updatedSpaces = spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: ['Ballad', 'Ballad', 'Folk'] as Genre[] } : s
      )
      useGameStore.setState({ spaces: updatedSpaces })

      useGameStore.getState().spawnMonstersAtSpace(0)

      const space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters).toHaveLength(2) // 1 Ballad + 1 Folk

      const leveled = space.monsters.find((m) => m.level === 2)
      const basic = space.monsters.find((m) => m.level === 1)
      expect(leveled).toBeDefined()
      expect(basic).toBeDefined()
    })

    it('should handle empty genre tags', () => {
      useGameStore.getState().initializeBoard()

      useGameStore.getState().spawnMonstersAtSpace(0)

      const space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters).toHaveLength(0)
    })

    it('should not affect other spaces', () => {
      useGameStore.getState().initializeBoard()

      const spaces = useGameStore.getState().spaces
      const updatedSpaces = spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: ['Ballad'] as Genre[] } : s
      )
      useGameStore.setState({ spaces: updatedSpaces })

      useGameStore.getState().spawnMonstersAtSpace(0)

      const otherSpaces = useGameStore.getState().spaces.filter((s) => s.id !== 0)
      otherSpaces.forEach((space) => {
        expect(space.monsters).toHaveLength(0)
      })
    })
  })

  describe('clearSpaceAfterCombat', () => {
    it('should clear monsters and genre tags from a space', () => {
      useGameStore.getState().initializeBoard()

      // Set up a space with tags and monsters
      const spaces = useGameStore.getState().spaces
      const updatedSpaces = spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: ['Ballad', 'Folk'] as Genre[] } : s
      )
      useGameStore.setState({ spaces: updatedSpaces })
      useGameStore.getState().spawnMonstersAtSpace(0)

      // Verify space has monsters
      let space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters.length).toBeGreaterThan(0)
      expect(space.genreTags.length).toBeGreaterThan(0)

      // Clear it
      useGameStore.getState().clearSpaceAfterCombat(0)

      space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters).toEqual([])
      expect(space.genreTags).toEqual([])
    })

    it('should spread 1 tag to each adjacent space after clearing', () => {
      useGameStore.getState().initializeBoard()

      // Space 0 connects to spaces 1, 3, 13
      const spaces = useGameStore.getState().spaces
      const updatedSpaces = spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: ['Ballad'] as Genre[] } : s
      )
      useGameStore.setState({ spaces: updatedSpaces })
      useGameStore.getState().spawnMonstersAtSpace(0)

      const neighborIds = spaces.find((s) => s.id === 0)!.connections
      const tagsBefore = neighborIds.map((id) =>
        useGameStore.getState().spaces.find((s) => s.id === id)!.genreTags.length
      )

      useGameStore.getState().clearSpaceAfterCombat(0)

      neighborIds.forEach((id, idx) => {
        const neighbor = useGameStore.getState().spaces.find((s) => s.id === id)!
        expect(neighbor.genreTags.length).toBe(tagsBefore[idx] + 1)
      })
    })
  })

  describe('addGenreTags', () => {
    it('should add exactly one tag per space each call', () => {
      useGameStore.getState().initializeBoard()
      useGameStore.getState().addGenreTags()

      const { spaces } = useGameStore.getState()
      spaces.forEach((space) => {
        expect(space.genreTags).toHaveLength(1)
      })

      // Second round of tags
      useGameStore.getState().addGenreTags()
      const spaces2 = useGameStore.getState().spaces
      spaces2.forEach((space) => {
        expect(space.genreTags).toHaveLength(2)
      })
    })
  })

  describe('full round flow: addGenreTags -> spawnMonstersAtSpace -> clearSpaceAfterCombat', () => {
    it('should support the complete gameplay loop', () => {
      useGameStore.getState().initializeBoard()

      // Round 1: add tags
      useGameStore.getState().addGenreTags()

      // Spawn monsters at space 0
      useGameStore.getState().spawnMonstersAtSpace(0)
      let space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters.length).toBeGreaterThanOrEqual(1)

      // Combat: clear the space (space 0 gets cleared; its neighbors 1, 3, 13 each get +1 tag)
      useGameStore.getState().clearSpaceAfterCombat(0)
      space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.monsters).toEqual([])
      expect(space.genreTags).toEqual([])

      // Space 1 (a neighbor of 0) should have gained a spread tag
      const neighborAfterClear = useGameStore.getState().spaces.find((s) => s.id === 1)!
      expect(neighborAfterClear.genreTags).toHaveLength(2) // 1 from addGenreTags + 1 spread

      // Round 2: add tags again — cleared space gets new tag, other spaces accumulate
      useGameStore.getState().addGenreTags()
      space = useGameStore.getState().spaces.find((s) => s.id === 0)!
      expect(space.genreTags).toHaveLength(1) // Fresh after clear

      const otherSpace = useGameStore.getState().spaces.find((s) => s.id === 1)!
      expect(otherSpace.genreTags).toHaveLength(3) // 1 from round 1 + 1 spread + 1 from round 2
    })
  })
})
