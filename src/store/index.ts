import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Genre } from '@/types'
import { EngineState, EngineCombatState, createInitialEngineState } from '@/engine/state'
import { GameAction } from '@/engine/actions'
import { Driver, DispatchResult } from '@/drivers/types'
import { LocalDriver, loadSavedGame } from '@/drivers/localDriver'

export { hasSavedGame, clearSavedGame } from '@/drivers/localDriver'

// ============================================================
// Store shape
// ============================================================

/**
 * The engine state is mirrored into the store with combat FLATTENED to the
 * top level, preserving the field names of the old combat slice so existing
 * component reads and selectors keep working unchanged.
 */
export type GameMirror = Omit<EngineState, 'combat'> & EngineCombatState

export type PlayMode = 'hotseat' | 'online' | null
export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

export interface LobbySeat {
  seatId: string
  playerId: string | null
  name: string
  color: string
  starterGenre: Genre
  ready: boolean
  isHost: boolean
}

export interface LobbyState {
  gameId: string
  joinCode: string
  status: 'lobby' | 'active' | 'finished'
  seats: LobbySeat[]
  mySeatId: string
  presence: Record<string, boolean>
}

export interface UiState {
  mode: PlayMode
  connection: ConnectionStatus
  lobby: LobbyState | null
  lastError: string | null
}

export type GameStore = GameMirror &
  UiState & {
    /** Route an action to the active driver (local hotseat or remote server). */
    dispatch: (action: GameAction) => Promise<DispatchResult>
    /** Begin (or resume) a hotseat game with the LocalDriver. */
    startHotseat: () => void
    /** Drivers push authoritative engine state here. */
    _applyEngineState: (engineState: EngineState) => void
    _setUi: (updates: Partial<UiState>) => void
    /** Swap the active driver (used by online mode). */
    _setDriver: (driver: Driver | null) => void
  }

// ============================================================
// Engine-state flattening
// ============================================================

function flatten(engineState: EngineState): GameMirror {
  const { combat, ...rest } = engineState
  return { ...rest, ...combat }
}

// The active driver lives outside the store: it owns the authoritative
// EngineState and pushes snapshots in via _applyEngineState.
let activeDriver: Driver | null = null

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => ({
      ...flatten(createInitialEngineState()),

      mode: null,
      connection: 'idle',
      lobby: null,
      lastError: null,

      dispatch: async (action) => {
        if (!activeDriver) {
          return { ok: false, events: [], error: 'No active game driver' }
        }
        const result = await activeDriver.dispatch(action)
        if (!result.ok && result.error) {
          set({ lastError: result.error })
        }
        return result
      },

      startHotseat: () => {
        activeDriver?.stop()
        activeDriver = new LocalDriver(loadSavedGame(), (engineState) =>
          get()._applyEngineState(engineState)
        )
        set({ mode: 'hotseat', connection: 'idle', lobby: null, lastError: null })
      },

      _applyEngineState: (engineState) => {
        set(flatten(engineState))
      },

      _setUi: (updates) => set(updates),

      _setDriver: (driver) => {
        activeDriver?.stop()
        activeDriver = driver
      },
    }),
    { name: 'LuteHeroStore' }
  )
)

// ============================================================
// Selectors (unchanged API)
// ============================================================

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

export const selectPlayersAtSpace =
  (spaceId: number, excludePlayerId?: string) => (state: GameStore) => {
    return state.players.filter(
      (p) => p.position === spaceId && p.id !== excludePlayerId && !p.isEliminated
    )
  }
