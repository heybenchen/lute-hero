import {
  GamePhase,
  BoardSpace,
  Player,
  DraftCard,
  Genre,
  PendingReward,
  Monster,
  SongUsage,
  KillCredit,
  DiceRoll,
  DamageCalculation,
} from '../types'
import { ShowdownPerformance } from '../game-logic/showdown/showdown'

/**
 * Live combat state — part of the synced engine state so spectators watch
 * combat as it happens and a mid-combat refresh resumes cleanly.
 */
export interface EngineCombatState {
  isActive: boolean
  playerId: string | null
  spaceId: number | null
  monsters: Monster[]
  songsUsed: SongUsage[]
  killCredits: KillCredit[]
  currentSongId: string | null
  rolls: DiceRoll[]
  totalDamage: number
  lastDamageCalculations: DamageCalculation[]
  /** Pre-play snapshot so the last song can be rerolled (Inspiration). */
  undoSnapshot: {
    monsters: Monster[]
    songsUsed: SongUsage[]
    killCredits: KillCredit[]
    totalDamage: number
  } | null
  lastPlayedSongId: string | null
  lastPlayedOwnerId: string | null
}

/**
 * The complete, serializable, authoritative game state. The server stores
 * exactly this document; the hotseat driver persists it to localStorage.
 * Seat/lobby metadata deliberately lives OUTSIDE this object.
 */
export interface EngineState {
  // Game flow
  phase: GamePhase
  currentRound: number
  currentTurnPlayerIndex: number
  pendingPhase: GamePhase | null

  // Board & players
  spaces: BoardSpace[]
  players: Player[]

  // Shop
  namePool: DraftCard[]
  elementBag: Genre[]
  elementDiscard: Genre[]
  elementOffers: Genre[]
  pendingRewards: Record<string, PendingReward[]>

  // Combat (synced, unlike the old client-only slice)
  combat: EngineCombatState

  // Final showdown
  showdownActive: boolean
  showdownComplete: boolean
  showdownTurn: number
  showdownOrder: string[]
  showdownPerformerIdx: number
  showdownResistGenre: Genre | null
  showdownWeakGenre: Genre | null
  showdownSongsUsed: string[]
  showdownCurrentFandom: number
  showdownCurrentGenre: Genre | null
  showdownTurnPerformances: ShowdownPerformance[]
  showdownHistory: ShowdownPerformance[][]
  showdownFandom: Record<string, number>
  showdownBestHit: Record<string, { damage: number; songName: string }>
  showdownCrits: Record<string, number>

  /** Monotonic counter backing deterministic id generation. */
  nextIdSeq: number
}

export function createInitialCombatState(): EngineCombatState {
  return {
    isActive: false,
    playerId: null,
    spaceId: null,
    monsters: [],
    songsUsed: [],
    killCredits: [],
    currentSongId: null,
    rolls: [],
    totalDamage: 0,
    lastDamageCalculations: [],
    undoSnapshot: null,
    lastPlayedSongId: null,
    lastPlayedOwnerId: null,
  }
}

export function createInitialEngineState(): EngineState {
  return {
    phase: 'setup',
    currentRound: 0,
    currentTurnPlayerIndex: 0,
    pendingPhase: null,

    spaces: [],
    players: [],

    namePool: [],
    elementBag: [],
    elementDiscard: [],
    elementOffers: [],
    pendingRewards: {},

    combat: createInitialCombatState(),

    showdownActive: false,
    showdownComplete: false,
    showdownTurn: 1,
    showdownOrder: [],
    showdownPerformerIdx: 0,
    showdownResistGenre: null,
    showdownWeakGenre: null,
    showdownSongsUsed: [],
    showdownCurrentFandom: 0,
    showdownCurrentGenre: null,
    showdownTurnPerformances: [],
    showdownHistory: [],
    showdownFandom: {},
    showdownBestHit: {},
    showdownCrits: {},

    nextIdSeq: 1,
  }
}
