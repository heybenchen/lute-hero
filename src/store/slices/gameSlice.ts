import { StateCreator } from 'zustand'
import { GamePhase } from '@/types'
import { getNextPhase } from '@/game-logic/fame/calculator'

export interface GameSlice {
  // State
  phase: GamePhase
  currentRound: number
  currentTurnPlayerIndex: number
  pendingPhase: GamePhase | null

  // Actions
  setPhase: (phase: GamePhase) => void
  nextRound: () => void
  nextTurn: () => void
  startGame: () => void
  resetGame: () => void
  checkPhaseTransition: () => void
  applyPendingPhase: () => void
}

export const createGameSlice: StateCreator<GameSlice> = (set, get) => ({
  // Initial state
  phase: 'setup',
  currentRound: 0,
  currentTurnPlayerIndex: 0,
  pendingPhase: null,

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
      pendingPhase: null,
    }),

  resetGame: () =>
    set({
      phase: 'setup',
      currentRound: 0,
      currentTurnPlayerIndex: 0,
      pendingPhase: null,
    }),

  checkPhaseTransition: () => {
    const phase = get().phase
    // Access players from the combined store (available at runtime via Zustand slices pattern)
    const players = (get() as any).players as { fame: number }[]
    if (!players) return

    const collectiveFame = players.reduce((total: number, p: { fame: number }) => total + p.fame, 0)
    const nextPhase = getNextPhase(phase, collectiveFame, players.length)
    if (nextPhase) {
      set({ pendingPhase: nextPhase })
    }
  },

  applyPendingPhase: () => {
    const pending = get().pendingPhase
    if (pending) {
      set({ phase: pending, pendingPhase: null })
    }
  },
})
