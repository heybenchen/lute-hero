import { create } from 'zustand'
import { devtools, persist, PersistOptions } from 'zustand/middleware'
import { createGameSlice, GameSlice } from './slices/gameSlice'
import { createBoardSlice, BoardSlice } from './slices/boardSlice'
import { createPlayersSlice, PlayersSlice } from './slices/playersSlice'
import { createCombatSlice, CombatSlice } from './slices/combatSlice'
import { createShopSlice, ShopSlice } from './slices/shopSlice'

// Combined store type
export type GameStore = GameSlice & BoardSlice & PlayersSlice & CombatSlice & ShopSlice

const STORAGE_KEY = 'lute-hero-save'
const STORAGE_VERSION = 1

// Only persist the durable game state — skip transient combat mid-fight data
const persistOptions: PersistOptions<GameStore, Pick<GameStore, 'phase' | 'currentRound' | 'currentTurnPlayerIndex' | 'spaces' | 'players'>> = {
  name: STORAGE_KEY,
  version: STORAGE_VERSION,
  partialize: (state) => ({
    phase: state.phase,
    currentRound: state.currentRound,
    currentTurnPlayerIndex: state.currentTurnPlayerIndex,
    spaces: state.spaces,
    players: state.players,
  }),
  // Only hydrate if saved game is in a non-setup phase (i.e. a real game was in progress)
  merge: (persisted, current) => {
    const saved = persisted as Partial<GameStore> | undefined
    if (!saved || saved.phase === 'setup' || !saved.players?.length) {
      return current
    }
    return { ...current, ...saved }
  },
}

// Create the store with all slices
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (...args) => ({
        ...createGameSlice(...args),
        ...createBoardSlice(...args),
        ...createPlayersSlice(...args),
        ...createCombatSlice(...args),
        ...createShopSlice(...args),
      }),
      persistOptions,
    ),
    { name: 'LuteHeroStore' }
  )
)

/** Clear saved game from localStorage */
export function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may not be available
  }
}

/** Check if a saved game exists */
export function hasSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    const state = parsed?.state
    return state?.phase && state.phase !== 'setup' && state.players?.length > 0
  } catch {
    return false
  }
}

// Selectors for common queries
export const selectCurrentPlayer = (state: GameStore) => {
  return state.players[state.currentTurnPlayerIndex]
}

export const selectPlayerById = (playerId: string) => (state: GameStore) => {
  return state.players.find((p) => p.id === playerId)
}

export const selectSpaceById = (spaceId: number) => (state: GameStore) => {
  return state.spaces.find((s) => s.id === spaceId)
}

export const selectCollectiveFame = (state: GameStore) => {
  return state.players.reduce((total, p) => total + p.fame, 0)
}

export const selectActivePlayers = (state: GameStore) => {
  return state.players.filter((p) => !p.isEliminated)
}
