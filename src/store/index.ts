import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createGameSlice, GameSlice } from './slices/gameSlice'
import { createBoardSlice, BoardSlice } from './slices/boardSlice'
import { createPlayersSlice, PlayersSlice } from './slices/playersSlice'
import { createCombatSlice, CombatSlice } from './slices/combatSlice'
import { createShopSlice, ShopSlice } from './slices/shopSlice'

// Combined store type
export type GameStore = GameSlice & BoardSlice & PlayersSlice & CombatSlice & ShopSlice

// Create the store with all slices
export const useGameStore = create<GameStore>()(
  devtools(
    (...args) => ({
      ...createGameSlice(...args),
      ...createBoardSlice(...args),
      ...createPlayersSlice(...args),
      ...createCombatSlice(...args),
      ...createShopSlice(...args),
    }),
    { name: 'LuteHeroStore' }
  )
)

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
