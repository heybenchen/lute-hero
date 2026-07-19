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
} from '../types/index.js'
import { ShowdownPerformance } from '../game-logic/showdown/showdown.js'

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
  /**
   * Songs whose dice are spent this combat. A song is spent when it damages a
   * monster without defeating it; defeating the target returns its dice, so the
   * song stays playable. Spent songs can't be played again this combat.
   */
  spentSongIds: string[]
  killCredits: KillCredit[]
  currentSongId: string | null
  /** Monster the last song targeted (single-target combat). */
  lastTargetMonsterId: string | null
  rolls: DiceRoll[]
  totalDamage: number
  lastDamageCalculations: DamageCalculation[]
  /** Pre-play snapshot so the last song can be rerolled (Inspiration). */
  undoSnapshot: {
    monsters: Monster[]
    songsUsed: SongUsage[]
    spentSongIds: string[]
    killCredits: KillCredit[]
    totalDamage: number
  } | null
  lastPlayedSongId: string | null
  lastPlayedOwnerId: string | null
  /** Shared victory choice so spectators see the element being considered. */
  selectedSpreadGenre: Genre | null
}

/**
 * Round-end redistribution: after everyone has taken a turn, each player hands
 * 4 monster chips of their choice to the player behind them in turn order, and
 * that player places the chips on distinct board tiles. Kept in the synced
 * engine state so both the giver and the placer (and any spectators) see it.
 */
export interface RedistributionState {
  active: boolean
  /** Index (into players) of the current giver; the receiver is the next player. */
  giverIdx: number
  /** 'selecting' — the giver is choosing chips; 'placing' — the receiver places them. */
  stage: 'selecting' | 'placing'
  /** Chips the giver has picked so far (up to CHIPS_PER_HANDOFF). */
  selectedChips: Genre[]
  /** Chips handed to the receiver, being placed one at a time. */
  chipsToPlace: Genre[]
  /** Spaces already used in this placement — no two chips on the same tile. */
  placedSpaceIds: number[]
}

/**
 * Live Studio interaction state. Keeping this in the engine makes the shop a
 * shared tabletop surface: every client sees it open, follows selections, and
 * watches rewards get placed while only the active player can interact.
 */
export interface EngineStudioState {
  playerId: string | null
  selectedOfferIdx: number | null
  selectedNameId: string | null
  activeRewardId: string | null
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
  /** Once the threshold is hit, everyone gets one more round before the boss. */
  finalTurnGranted: boolean

  // Board & players
  spaces: BoardSpace[]
  players: Player[]

  // Shop
  namePool: DraftCard[]
  elementBag: Genre[]
  elementDiscard: Genre[]
  elementOffers: Genre[]
  pendingRewards: Record<string, PendingReward[]>
  studio: EngineStudioState

  // Combat (synced, unlike the old client-only slice)
  combat: EngineCombatState

  // Round-end chip redistribution (inactive most of the time)
  redistribution: RedistributionState

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
  /** Pre-play accumulators so the current performance can be rerolled. */
  showdownUndo: ShowdownUndo | null

  /** Monotonic counter backing deterministic id generation. */
  nextIdSeq: number
}

/** Performer accumulators captured before a showdown play, enabling reroll. */
export interface ShowdownUndo {
  songId: string
  performerId: string
  currentFandom: number
  fandomTotal: number
  bestHit: { damage: number; songName: string } | undefined
  crits: number
  songsUsed: string[]
}

export function createInitialCombatState(): EngineCombatState {
  return {
    isActive: false,
    playerId: null,
    spaceId: null,
    monsters: [],
    songsUsed: [],
    spentSongIds: [],
    killCredits: [],
    currentSongId: null,
    lastTargetMonsterId: null,
    rolls: [],
    totalDamage: 0,
    lastDamageCalculations: [],
    undoSnapshot: null,
    lastPlayedSongId: null,
    lastPlayedOwnerId: null,
    selectedSpreadGenre: null,
  }
}

export function createInitialRedistributionState(): RedistributionState {
  return {
    active: false,
    giverIdx: 0,
    stage: 'selecting',
    selectedChips: [],
    chipsToPlace: [],
    placedSpaceIds: [],
  }
}

export function createInitialStudioState(): EngineStudioState {
  return {
    playerId: null,
    selectedOfferIdx: null,
    selectedNameId: null,
    activeRewardId: null,
  }
}

/** Add newly introduced synchronized fields when loading older saved games. */
export function normalizeEngineState(state: EngineState): EngineState {
  return {
    ...state,
    combat: { ...createInitialCombatState(), ...state.combat },
    studio: { ...createInitialStudioState(), ...state.studio },
    redistribution: { ...createInitialRedistributionState(), ...state.redistribution },
  }
}

export function createInitialEngineState(): EngineState {
  return {
    phase: 'setup',
    currentRound: 0,
    currentTurnPlayerIndex: 0,
    pendingPhase: null,
    finalTurnGranted: false,

    spaces: [],
    players: [],

    namePool: [],
    elementBag: [],
    elementDiscard: [],
    elementOffers: [],
    pendingRewards: {},
    studio: createInitialStudioState(),

    combat: createInitialCombatState(),
    redistribution: createInitialRedistributionState(),

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
    showdownUndo: null,

    nextIdSeq: 1,
  }
}
