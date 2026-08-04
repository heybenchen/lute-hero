import {
  GamePhase,
  BoardSpace,
  Player,
  Genre,
  PendingReward,
  Monster,
  SongUsage,
  KillCredit,
  Song,
  DiceRoll,
  DiceType,
  DamageCalculation,
} from '../types/index.js'
import { ShowdownPerformance } from '../game-logic/showdown/showdown.js'
import { Tunables, DEFAULT_TUNABLES, normalizeTunables } from '../data/tunables.js'

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
 * Round-end reinforcements: after everyone has taken a turn, each bard is
 * dealt one monster chip of every element and places them on the board
 * wherever they like — one chip per tile — before the next round begins.
 * Kept in the synced engine state so the placer and spectators both see it.
 */
export interface RedistributionState {
  active: boolean
  /** Index (into players) of the bard currently placing their chips. */
  placerIdx: number
  /** Chips this bard has left to place, one at a time. */
  chipsToPlace: Genre[]
  /** Tiles this bard already used — no two of their chips share a tile. */
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
  elementBag: Genre[]
  elementDiscard: Genre[]
  elementOffers: Genre[]
  pendingRewards: Record<string, PendingReward[]>
  studio: EngineStudioState

  // Combat (synced, unlike the old client-only slice)
  combat: EngineCombatState

  // Round-end chip redistribution (inactive most of the time)
  redistribution: RedistributionState

  /**
   * Balance numbers the engine reads. Part of the state so playtest tweaks
   * persist in saves and sync to every online client. Edited via DEBUG_PATCH.
   */
  tunables: Tunables

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
  showdownBestHit: Record<string, { damage: number }>
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
  bestHit: { damage: number } | undefined
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
    placerIdx: 0,
    chipsToPlace: [],
    placedSpaceIds: [],
  }
}

export function createInitialStudioState(): EngineStudioState {
  return {
    playerId: null,
    selectedOfferIdx: null,
    activeRewardId: null,
  }
}

/**
 * The d6 was replaced by the d8. A die still carrying the retired type would
 * roll `undefined` faces and poison every damage number, so states saved before
 * the swap (local saves, playtest presets, live Redis games) are migrated here.
 */
const RETIRED_DICE_TYPES: Record<string, DiceType> = { d6: 'd8' }

function migrateDice<T extends { type: DiceType }>(dice: T): T {
  const replacement = RETIRED_DICE_TYPES[dice.type]
  return replacement ? { ...dice, type: replacement } : dice
}

function migratePlayerDice(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    songs: player.songs.map((song) => ({
      ...song,
      slots: song.slots.map((slot) =>
        slot.dice ? { ...slot, dice: migrateDice(slot.dice) } : slot
      ) as Song['slots'],
    })),
  }))
}

function migrateRewardDice(rewards: Record<string, PendingReward[]>): Record<string, PendingReward[]> {
  return Object.fromEntries(
    Object.entries(rewards).map(([playerId, list]) => [
      playerId,
      list.map((reward) => (reward.kind === 'die' ? { ...reward, dice: migrateDice(reward.dice) } : reward)),
    ])
  )
}

/**
 * Add newly introduced synchronized fields — and migrate retired ones — when
 * loading a game saved by an older version.
 */
export function normalizeEngineState(state: EngineState): EngineState {
  return {
    ...state,
    players: migratePlayerDice(state.players ?? []),
    pendingRewards: migrateRewardDice(state.pendingRewards ?? {}),
    combat: { ...createInitialCombatState(), ...state.combat },
    studio: { ...createInitialStudioState(), ...state.studio },
    redistribution: { ...createInitialRedistributionState(), ...state.redistribution },
    // Fills in defaults and clamps every value, so a stale save or a
    // hand-edited preset can never leave the engine with a broken number.
    tunables: normalizeTunables(state.tunables),
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

    elementBag: [],
    elementDiscard: [],
    elementOffers: [],
    pendingRewards: {},
    studio: createInitialStudioState(),

    combat: createInitialCombatState(),
    redistribution: createInitialRedistributionState(),
    tunables: DEFAULT_TUNABLES,

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
