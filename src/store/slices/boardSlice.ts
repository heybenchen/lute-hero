import { StateCreator } from 'zustand'
import { BoardSpace } from '@/types'
import {
  createBoardGraph,
  addGenreTagsToBoard,
  addGenreTagsToNeighbors,
} from '@/game-logic/board/graphBuilder'
import { spawnMonstersFromTags, spawnInitialMonsters, clearSpace } from '@/game-logic/combat/monsterSpawner'

export interface BoardSlice {
  // State
  spaces: BoardSpace[]

  // Actions
  initializeBoard: () => void
  addGenreTags: () => void
  addGenreTagsAroundPlayer: (spaceId: number) => void
  spawnMonstersAtSpace: (spaceId: number) => void
  spawnInitialMonstersOnBoard: () => void
  clearSpaceAfterCombat: (spaceId: number) => void
  updateSpace: (spaceId: number, updates: Partial<BoardSpace>) => void
}

// Helper to read currentRound from the combined store (all slices share one object)
function getRound(get: () => BoardSlice): number {
  return (get() as BoardSlice & { currentRound?: number }).currentRound || 1
}

export const createBoardSlice: StateCreator<BoardSlice> = (set, get) => ({
  // Initial state
  spaces: [],

  // Actions
  initializeBoard: () => {
    const board = createBoardGraph()
    set({ spaces: board })
  },

  addGenreTags: () => {
    const updatedSpaces = addGenreTagsToBoard(get().spaces)
    set({ spaces: updatedSpaces })
  },

  addGenreTagsAroundPlayer: (spaceId) => {
    const updatedSpaces = addGenreTagsToNeighbors(get().spaces, spaceId)
    set({ spaces: updatedSpaces })
  },

  spawnMonstersAtSpace: (spaceId) => {
    const round = getRound(get)
    const space = get().spaces.find((s) => s.id === spaceId)
    if (!space) return

    const monsters = spawnMonstersFromTags(space.genreTags, spaceId, round)

    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, monsters } : s
      ),
    })
  },

  spawnInitialMonstersOnBoard: () => {
    const round = getRound(get)
    const updatedSpaces = get().spaces.map((space) => {
      if (space.genreTags.length === 0) return space

      const monsters = spawnInitialMonsters(space.genreTags, space.id, round)
      return { ...space, monsters }
    })

    set({ spaces: updatedSpaces })
  },

  clearSpaceAfterCombat: (spaceId) => {
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? clearSpace(s) : s
      ),
    })
  },

  updateSpace: (spaceId, updates) => {
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, ...updates } : s
      ),
    })
  },
})
