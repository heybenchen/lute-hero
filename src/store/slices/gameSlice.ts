import { StateCreator } from 'zustand'
import { GamePhase } from '@/types'
import { getNextPhase } from '@/game-logic/fame/calculator'

export interface GameSlice {
  // State
  phase: GamePhase
  currentRound: number
  currentTurnPlayerIndex: number
  pendingPhase: GamePhase | null
  finalTurnGranted: boolean

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
  finalTurnGranted: false,

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
      finalTurnGranted: false,
    }),

  resetGame: () =>
    set({
      phase: 'setup',
      currentRound: 0,
      currentTurnPlayerIndex: 0,
      pendingPhase: null,
      finalTurnGranted: false,
    }),

  checkPhaseTransition: () => {
    const phase = get().phase
    // `players` lives on a sibling slice; reach it through the combined store at runtime.
    const players = (get() as unknown as { players?: { fame: number }[] }).players
    if (!players) return

    const playerFames = players.map(p => p.fame)
    const nextPhase = getNextPhase(phase, playerFames)
    if (nextPhase && !get().pendingPhase) {
      set({ pendingPhase: nextPhase })
    }
  },

  applyPendingPhase: () => {
    const pending = get().pendingPhase
    if (!pending) return
    if (!get().finalTurnGranted) {
      set({ finalTurnGranted: true })
    } else {
      set({ phase: pending, pendingPhase: null, finalTurnGranted: false })
    }
  },
})
