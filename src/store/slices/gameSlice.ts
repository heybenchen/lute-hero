import { StateCreator } from 'zustand'
import { GamePhase } from '@/types'

export interface GameSlice {
  // State
  phase: GamePhase
  currentRound: number
  currentTurnPlayerIndex: number

  // Actions
  setPhase: (phase: GamePhase) => void
  nextRound: () => void
  nextTurn: () => void
  startGame: () => void
  resetGame: () => void
}

export const createGameSlice: StateCreator<GameSlice> = (set) => ({
  // Initial state
  phase: 'setup',
  currentRound: 0,
  currentTurnPlayerIndex: 0,

  // Actions
  setPhase: (phase) => set({ phase }),

  nextRound: () =>
    set((state) => ({
      currentRound: state.currentRound + 1,
      currentTurnPlayerIndex: 0,
    })),

  nextTurn: () =>
    set((state) => ({
      currentTurnPlayerIndex: state.currentTurnPlayerIndex + 1,
    })),

  startGame: () =>
    set({
      phase: 'main',
      currentRound: 1,
      currentTurnPlayerIndex: 0,
    }),

  resetGame: () =>
    set({
      phase: 'setup',
      currentRound: 0,
      currentTurnPlayerIndex: 0,
    }),
})
