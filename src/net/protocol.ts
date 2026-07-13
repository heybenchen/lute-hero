import { Genre } from '../types/index.js'
import { EngineState } from '../engine/state.js'
import { EngineEvent } from '../engine/events.js'
import { GameAction } from '../engine/actions.js'

// NOTE: this file is imported by both the browser client and the Vercel
// serverless functions — keep imports relative and side-effect free.

export type GameStatus = 'lobby' | 'active' | 'finished'

/** One seat in a game: a chair a player token is bound to. */
export interface Seat {
  seatId: string
  /** Engine player id once the game starts (player-1..player-4), else null. */
  playerId: string | null
  name: string
  color: string
  starterGenre: Genre
  ready: boolean
  /** sha256 hex of the player's secret token. Never sent to clients. */
  tokenHash: string
}

/** Seat info as exposed to clients (no token hash). */
export type PublicSeat = Omit<Seat, 'tokenHash'>

/** The authoritative per-game document stored in Redis. */
export interface GameDoc {
  id: string
  status: GameStatus
  joinCode: string
  hostSeatId: string
  seats: Seat[]
  engineState: EngineState
  /** Monotonic version; every accepted mutation bumps it by 1. */
  version: number
  /** Ring buffer of recent clientActionIds for idempotent action POSTs. */
  recentClientActionIds: { clientActionId: string; seq: number }[]
  createdAt: number
  updatedAt: number
}

/** One accepted action, appended to the game's event log. */
export interface EventLogEntry {
  seq: number
  actorSeatId: string
  actionType: string
  /** RNG seed used for this action (audit/replay). */
  seed: number
  events: EngineEvent[]
  ts: number
}

export function toPublicSeat(seat: Seat): PublicSeat {
  // Strip the secret token hash before exposing a seat to clients
  const pub: PublicSeat & { tokenHash?: string } = { ...seat }
  delete pub.tokenHash
  return pub
}

// ============================================================
// HTTP payloads
// ============================================================

export interface CreateLobbyRequest {
  name: string
}
export interface CreateLobbyResponse {
  gameId: string
  joinCode: string
  seatId: string
  snapshot: Snapshot
}

export interface JoinLobbyRequest {
  joinCode: string
  name: string
}
export interface JoinLobbyResponse {
  gameId: string
  seatId: string
  /** True when the token matched an existing seat (reconnect). */
  rejoined: boolean
  snapshot: Snapshot
}

export interface LobbyOpRequest {
  op: 'ready' | 'unready' | 'leave' | 'start'
  starterGenre?: Genre
  color?: string
}

export interface ActionRequest {
  /** Client-generated id for idempotent retries. */
  clientActionId: string
  action: GameAction
}
export interface ActionResponse {
  seq: number
  version: number
  events: EngineEvent[]
}

export interface ApiError {
  error: string
  code: 'bad_request' | 'unauthorized' | 'forbidden' | 'illegal' | 'not_found' | 'conflict' | 'server_error'
}

// ============================================================
// SSE messages
// ============================================================

/** Full state, sent on every (re)connect. Client reconciles wholesale. */
export interface SnapshotMessage {
  type: 'snapshot'
  snapshot: Snapshot
}

export interface Snapshot {
  gameId: string
  status: GameStatus
  joinCode: string
  hostSeatId: string
  seats: PublicSeat[]
  presence: Record<string, boolean>
  engineState: EngineState
  version: number
  lastSeq: number
}

/** Incremental update: new engine state plus the action's animation events. */
export interface UpdateMessage {
  type: 'update'
  version: number
  status: GameStatus
  seats: PublicSeat[]
  engineState: EngineState
  entry: EventLogEntry
}

export interface PresenceMessage {
  type: 'presence'
  seatId: string
  online: boolean
}

/** The stream is about to hit its duration cap; reconnect immediately. */
export interface GoodbyeMessage {
  type: 'goodbye'
}

export type StreamMessage = SnapshotMessage | UpdateMessage | PresenceMessage | GoodbyeMessage
