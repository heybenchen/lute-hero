import { Genre, GamePhase, DiceType } from '../types/index.js'
import type { Tunables } from '../data/tunables.js'
import type { EngineState } from './state.js'

/**
 * Playtest patch: every field is optional, and only the ones present are
 * applied. Numeric player fields are absolute values, not deltas.
 */
export interface DebugPatch {
  tunables?: Partial<Tunables>
  /** Per player id: fame / exp / inspiration / position / per-turn counters. */
  players?: Record<string, Partial<DebugPlayerFields>>
  /** Retype, re-element, add or clear individual dice in a player's songs. */
  dice?: DebugDiceEdit[]
  flow?: Partial<{
    phase: GamePhase
    currentRound: number
    currentTurnPlayerIndex: number
    pendingPhase: GamePhase | null
    finalTurnGranted: boolean
  }>
  /** Per space id: the exact chip list that space should hold. */
  spaceTags?: Record<number, Genre[]>
  /** Per monster id (in the active combat): current HP. */
  combatMonsterHp?: Record<string, number>
  /** Re-derive every space's monsters from its chips after applying the patch. */
  respawnMonsters?: boolean
}

export interface DebugPlayerFields {
  fame: number
  exp: number
  inspiration: number
  position: number
  movesThisTurn: number
  fightsThisTurn: number
  monstersDefeated: number
}

/** One dice-slot edit: set the slot's die, or clear it with `dice: null`. */
export interface DebugDiceEdit {
  playerId: string
  songId: string
  slotIndex: number
  dice: { type: DiceType; genre: Genre } | null
}

/** One player's setup choices, supplied when the game starts. */
export interface PlayerConfig {
  name: string
  starterGenre: Genre
  color: string
}

/**
 * Every game-state mutation is one of these atomic actions. Each replaces a
 * multi-call sequence the components used to orchestrate; the reducer applies
 * it transactionally so hotseat and server behave identically.
 */
export type GameAction =
  | { type: 'START_GAME'; playerConfigs: PlayerConfig[] }
  | { type: 'MOVE'; playerId: string; toSpaceId: number; inspirationTravel: boolean }
  | { type: 'START_COMBAT'; playerId: string }
  | { type: 'PLAY_SONG'; songId: string; ownerId: string; targetMonsterId: string }
  | { type: 'REROLL_SONG' }
  | { type: 'SELECT_COMBAT_SPREAD'; genre: Genre | null }
  | { type: 'END_COMBAT'; spreadGenre?: Genre }
  | { type: 'END_TURN' }
  | { type: 'OPEN_STUDIO'; playerId: string }
  | { type: 'CLOSE_STUDIO' }
  | { type: 'SELECT_STUDIO_OFFER'; offerIndex: number | null }
  | { type: 'SELECT_STUDIO_REWARD'; rewardId: string | null }
  | { type: 'BUY_DIE'; offerIndex: number }
  | { type: 'UPGRADE_DIE'; offerIndex: number; diceId: string }
  | { type: 'REFRESH_ELEMENT_OFFERS' }
  | { type: 'SLOT_DIE_REWARD'; rewardId: string; songId: string; slotIndex: number }
  | { type: 'BUY_INSPIRATION' }
  | { type: 'PLAY_SHOWDOWN_SONG'; songId: string }
  | { type: 'REROLL_SHOWDOWN_SONG' }
  | { type: 'FINISH_SHOWDOWN_PERFORMANCE' }
  | { type: 'ADVANCE_TO_SUMMARY' }
  | { type: 'RESET_GAME' }
  | { type: 'HOST_SKIP_TURN'; targetPlayerId: string }
  // Round-end redistribution: the giver picks 4 chips, the receiver places them
  | { type: 'ADD_REDISTRIBUTION_CHIP'; genre: Genre }
  | { type: 'REMOVE_REDISTRIBUTION_CHIP'; index: number }
  | { type: 'CONFIRM_REDISTRIBUTION_GIFT' }
  | { type: 'PLACE_REDISTRIBUTION_CHIP'; spaceId: number }
  // Playtest debug mode (host-only): tweak values, or restore a saved preset
  | { type: 'DEBUG_PATCH'; patch: DebugPatch }
  | { type: 'DEBUG_LOAD_STATE'; engineState: EngineState }

export type GameActionType = GameAction['type']

/** Who is performing an action. Seat checks apply only to online actors. */
export type ActorSeat =
  | { kind: 'hotseat' }
  | { kind: 'seat'; playerId: string; isHost: boolean }
