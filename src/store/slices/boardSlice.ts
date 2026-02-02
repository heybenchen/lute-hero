import { StateCreator } from 'zustand'
import { BoardSpace } from '@/types'
import {
  createBoardGraph,
  addGenreTagsToBoard,
} from '@/game-logic/board/graphBuilder'
import { spawnMonstersFromTags, clearSpace } from '@/game-logic/combat/monsterSpawner'

export interface BoardSlice {
  // State
  spaces: BoardSpace[]

  // Actions
  initializeBoard: () => void
  addGenreTags: () => void
  spawnMonstersAtSpace: (spaceId: number) => void
  clearSpaceAfterCombat: (spaceId: number) => void
  updateSpace: (spaceId: number, updates: Partial<BoardSpace>) => void
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

  spawnMonstersAtSpace: (spaceId) => {
    const space = get().spaces.find((s) => s.id === spaceId)
    if (!space) return

    const monsters = spawnMonstersFromTags(space.genreTags, spaceId)

    set({
      spaces: get().spaces.map((s) =>
        s.id === spaceId ? { ...s, monsters } : s
      ),
    })
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
