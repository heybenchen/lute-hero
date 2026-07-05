import { StateCreator } from 'zustand'
import { BoardSpace, Genre } from '@/types'
import {
  createBoardGraph,
  addGenreTagsToBoard,
  addGenreTagsToNeighbors,
  addGenreTagToNeighbors,
} from '@/game-logic/board/graphBuilder'
import { spawnMonstersFromTags, spawnInitialMonsters, clearSpace } from '@/game-logic/combat/monsterSpawner'

export interface BoardSlice {
  // State
  spaces: BoardSpace[]

  // Actions
  initializeBoard: () => void
  addGenreTags: () => void
  addGenreTagsAroundPlayer: (spaceId: number) => void
  limitSpaceTags: (max: number) => void
  spawnMonstersAtSpace: (spaceId: number) => void
  spawnInitialMonstersOnBoard: () => void
  clearSpaceAfterCombat: (spaceId: number) => void
  spreadElementToNeighbors: (spaceId: number, genre: Genre) => void
  addGenreTagsForMonsters: (spaceId: number, genres: Genre[]) => void
  removeGenreTagsForDefeatedMonsters: (spaceId: number, genres: Genre[]) => void
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

  limitSpaceTags: (max) => {
    set({
      spaces: get().spaces.map((s) => ({
        ...s,
        genreTags: s.genreTags.slice(0, max),
      })),
    })
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

  addGenreTagsForMonsters: (spaceId, genres) => {
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, genreTags: [...s.genreTags, ...genres] } : s
      ),
    })
  },

  removeGenreTagsForDefeatedMonsters: (spaceId, genres) => {
    set({
      spaces: get().spaces.map((s) => {
        if (s.id !== spaceId) return s
        const remaining = [...s.genreTags]
        for (const genre of genres) {
          const idx = remaining.indexOf(genre)
          if (idx !== -1) remaining.splice(idx, 1)
        }
        return { ...s, genreTags: remaining }
      }),
    })
  },

  clearSpaceAfterCombat: (spaceId) => {
    // Clear the fought space. The neighbor spread is now player-driven via
    // spreadElementToNeighbors (the victor picks which element radiates out).
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? clearSpace(s) : s
      ),
    })
  },

  spreadElementToNeighbors: (spaceId, genre) => {
    set({ spaces: addGenreTagToNeighbors(get().spaces, spaceId, genre) })
  },

  updateSpace: (spaceId, updates) => {
    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, ...updates } : s
      ),
    })
  },
})
