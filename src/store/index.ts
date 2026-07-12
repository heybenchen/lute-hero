import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Genre } from '@/types'
import { EngineState, EngineCombatState, createInitialEngineState } from '@/engine/state'
import { GameAction } from '@/engine/actions'
import { Driver, DispatchResult } from '@/drivers/types'
import { LocalDriver, loadSavedGame } from '@/drivers/localDriver'
import { RemoteDriver } from '@/drivers/remoteDriver'
import { Snapshot, PublicSeat, EventLogEntry } from '@/net/protocol'
import * as api from '@/net/api'
import { ApiRequestError } from '@/net/api'
import {
  getIdentity,
  saveIdentityName,
  getOnlineSession,
  saveOnlineSession,
  clearOnlineSession,
} from '@/net/identity'

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

export interface LobbyState {
  gameId: string
  joinCode: string
  status: 'lobby' | 'active' | 'finished'
  hostSeatId: string
  seats: PublicSeat[]
  mySeatId: string
  presence: Record<string, boolean>
}

export interface UiState {
  mode: PlayMode
  connection: ConnectionStatus
  lobby: LobbyState | null
  lastError: string | null
  /** Animation events from OTHER players' actions (spectator dice/popups). */
  remoteEntry: EventLogEntry | null
}

export type GameStore = GameMirror &
  UiState & {
    /** Route an action to the active driver (local hotseat or remote server). */
    dispatch: (action: GameAction) => Promise<DispatchResult>
    /** Begin (or resume) a hotseat game with the LocalDriver. */
    startHotseat: () => void
    /** Create an online lobby (also saves the session for auto-rejoin). */
    createOnlineLobby: (name: string) => Promise<boolean>
    /** Join (or rejoin) an online lobby by code. */
    joinOnlineLobby: (joinCode: string, name: string) => Promise<boolean>
    /** Try to resume the online game saved in this browser. */
    resumeOnlineSession: () => Promise<boolean>
    /** Lobby operations: ready/unready/leave/start. */
    sendLobbyOp: (op: 'ready' | 'unready' | 'leave' | 'start', extras?: { starterGenre?: Genre; color?: string }) => Promise<boolean>
    /** Disconnect from the online game and return to mode select. */
    leaveOnline: () => void
    /** Back to the mode-select screen (stops any driver). */
    goToModeSelect: () => void
    /** Drivers push authoritative engine state here. */
    _applyEngineState: (engineState: EngineState) => void
    _setUi: (updates: Partial<UiState>) => void
  }

// ============================================================
// Engine-state flattening
// ============================================================

function flatten(engineState: EngineState): GameMirror {
  const { combat, ...rest } = engineState
  return { ...rest, ...combat }
}

// The active driver lives outside the store: it owns dispatch and pushes
// authoritative state in via _applyEngineState.
let activeDriver: Driver | null = null

function swapDriver(driver: Driver | null): void {
  activeDriver?.stop()
  activeDriver = driver
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => {
      /** Wire a RemoteDriver for a joined game and apply its first snapshot. */
      const connectRemote = (gameId: string, joinCode: string, seatId: string, snapshot: Snapshot) => {
        const { token } = getIdentity()
        const applySnapshot = (snap: Snapshot) => {
          set({
            ...flatten(snap.engineState),
            lobby: {
              gameId: snap.gameId,
              joinCode: snap.joinCode,
              status: snap.status,
              hostSeatId: snap.hostSeatId,
              seats: snap.seats,
              mySeatId: seatId,
              presence: snap.presence,
            },
          })
        }

        const driver = new RemoteDriver(token, gameId, {
          onSnapshot: (snap) => {
            applySnapshot(snap)
            set({ connection: 'connected' })
          },
          onUpdate: (msg) => {
            const lobby = get().lobby
            set({
              ...flatten(msg.engineState),
              lobby: lobby ? { ...lobby, status: msg.status, seats: msg.seats } : lobby,
            })
          },
          onRemoteEntry: (entry) => set({ remoteEntry: entry }),
          onPresence: (msg) => {
            const lobby = get().lobby
            if (!lobby) return
            set({ lobby: { ...lobby, presence: { ...lobby.presence, [msg.seatId]: msg.online } } })
          },
          onConnectionChange: (connected) =>
            set({ connection: connected ? 'connected' : 'reconnecting' }),
        })

        swapDriver(driver)
        saveOnlineSession({ gameId, joinCode })
        set({ mode: 'online', connection: 'connecting', lastError: null, remoteEntry: null })
        applySnapshot(snapshot)
        driver.start()
      }

      return {
        ...flatten(createInitialEngineState()),

        mode: null,
        connection: 'idle',
        lobby: null,
        lastError: null,
        remoteEntry: null,

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
          swapDriver(
            new LocalDriver(loadSavedGame(), (engineState) => get()._applyEngineState(engineState))
          )
          set({ mode: 'hotseat', connection: 'idle', lobby: null, lastError: null, remoteEntry: null })
        },

        createOnlineLobby: async (name) => {
          try {
            saveIdentityName(name)
            const { token } = getIdentity()
            const res = await api.createLobby(token, name)
            connectRemote(res.gameId, res.joinCode, res.seatId, res.snapshot)
            return true
          } catch (err) {
            set({ lastError: err instanceof Error ? err.message : 'Could not create lobby' })
            return false
          }
        },

        joinOnlineLobby: async (joinCode, name) => {
          try {
            saveIdentityName(name)
            const { token } = getIdentity()
            const res = await api.joinLobby(token, joinCode, name)
            connectRemote(res.gameId, res.snapshot.joinCode, res.seatId, res.snapshot)
            return true
          } catch (err) {
            set({ lastError: err instanceof Error ? err.message : 'Could not join lobby' })
            return false
          }
        },

        resumeOnlineSession: async () => {
          const session = getOnlineSession()
          const identity = getIdentity()
          if (!session || !identity.name) return false
          try {
            const res = await api.joinLobby(identity.token, session.joinCode, identity.name)
            connectRemote(res.gameId, session.joinCode, res.seatId, res.snapshot)
            return true
          } catch (err) {
            // Game expired or gone — clear the stale pointer
            if (err instanceof ApiRequestError && (err.status === 404 || err.status === 403)) {
              clearOnlineSession()
            }
            return false
          }
        },

        sendLobbyOp: async (op, extras) => {
          const lobby = get().lobby
          if (!lobby) return false
          try {
            const { token } = getIdentity()
            const res = await api.lobbyOp(token, lobby.gameId, { op, ...extras })
            const snap = res.snapshot
            set({
              ...flatten(snap.engineState),
              lobby: op === 'leave' ? null : { ...lobby, status: snap.status, seats: snap.seats, presence: snap.presence },
            })
            if (op === 'leave') {
              swapDriver(null)
              clearOnlineSession()
              set({ mode: null, connection: 'idle' })
            }
            return true
          } catch (err) {
            set({ lastError: err instanceof Error ? err.message : 'Lobby request failed' })
            return false
          }
        },

        leaveOnline: () => {
          swapDriver(null)
          clearOnlineSession()
          set({
            ...flatten(createInitialEngineState()),
            mode: null,
            connection: 'idle',
            lobby: null,
            remoteEntry: null,
          })
        },

        goToModeSelect: () => {
          swapDriver(null)
          set({
            ...flatten(createInitialEngineState()),
            mode: null,
            connection: 'idle',
            lobby: null,
            lastError: null,
            remoteEntry: null,
          })
        },

        _applyEngineState: (engineState) => {
          set(flatten(engineState))
        },

        _setUi: (updates) => set(updates),
      }
    },
    { name: 'LuteHeroStore' }
  )
)

// ============================================================
// Selectors
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

export const selectActivePlayers = (state: GameStore) => {
  return state.players.filter((p) => !p.isEliminated)
}

export const selectPlayersAtSpace =
  (spaceId: number, excludePlayerId?: string) => (state: GameStore) => {
    return state.players.filter(
      (p) => p.position === spaceId && p.id !== excludePlayerId && !p.isEliminated
    )
  }

/** The engine player bound to MY seat (null in hotseat / not seated). */
export const selectMyPlayerId = (state: GameStore): string | null => {
  if (state.mode !== 'online' || !state.lobby) return null
  return state.lobby.seats.find((s) => s.seatId === state.lobby!.mySeatId)?.playerId ?? null
}

/** Hotseat: always true. Online: only when my seat's player has the turn. */
export const selectCanAct = (state: GameStore): boolean => {
  if (state.mode !== 'online') return true
  const myId = selectMyPlayerId(state)
  return myId !== null && state.players[state.currentTurnPlayerIndex]?.id === myId
}

/** Whether I'm the current showdown performer (always true in hotseat). */
export const selectCanPerform = (state: GameStore): boolean => {
  if (state.mode !== 'online') return true
  const myId = selectMyPlayerId(state)
  return myId !== null && state.showdownOrder[state.showdownPerformerIdx] === myId
}

/** Am I the host seat? (Hotseat mode: yes.) */
export const selectIsHost = (state: GameStore): boolean => {
  if (state.mode !== 'online') return true
  return state.lobby?.mySeatId === state.lobby?.hostSeatId
}
