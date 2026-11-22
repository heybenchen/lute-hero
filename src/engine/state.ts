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
  StyleId,
} from '../types/index.js'
import { ShowdownPerformance } from '../game-logic/showdown/showdown.js'
import type { SpecReward } from '../game-logic/styles/specs.js'
import { SONGS_PER_BARD } from '../data/startingData.js'
import { playerColorFor } from '../data/genreTheme.js'
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
    stylesUsed: StyleId[]
    rallyReady: boolean
    specFired?: string[]
    playLog?: Genre[]
    specRewards?: SpecReward
  } | null
  /**
   * "Once per turn" styles already spent this turn. A bard fights at most once
   * a turn, so this lives with the combat and is part of the reroll snapshot:
   * rerolling a play replays its style triggers rather than burning them.
   */
  stylesUsed: StyleId[]
  /** Names of the styles that shaped the last play, for the damage report. */
  styleNotes: string[]
  /**
   * Rallying Cry (`staccato`) is armed: a song tamed a monster this turn, so
   * the bard may refresh one spent song of their choice (RALLY_SONG).
   */
  rallyReady: boolean
  lastPlayedSongId: string | null
  /** Shared victory choice so spectators see the element being considered. */
  selectedSpreadGenre: Genre | null
  /** Data-defined styles: once-per-turn ones that fired this turn. */
  specFired: string[]
  /** Elements of the songs played this fight, in order (combo conditions). */
  playLog: Genre[]
  /** Fame/EXP/Inspiration data-defined styles earned this fight, paid at its end. */
  specRewards: SpecReward
  /** Inspiration rerolls taken for free this turn (data-defined styles). */
  freeRerollsUsed: number
  /** Bards on the space whose featured song has been played this fight (one each). */
  featuredPlayerIds: string[]
  /** Online: the fighter's pending ask to feature another bard's song. */
  featureRequest: FeatureRequest | null
}

/** A fighter's ask to play one of a guest bard's songs; the guest must agree. */
export interface FeatureRequest {
  guestPlayerId: string
  songId: string
  targetMonsterId: string
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
 * One step of the active bard's movement this turn, kept so the move can be
 * taken back (position restored, move and Inspiration refunded). The trail is
 * cleared when combat starts and at the end of every turn.
 */
export interface MoveStep {
  playerId: string
  fromSpaceId: number
  /** Inspiration refunded on undo — only set by saves from before travel was removed. */
  inspirationSpent?: number
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
  /** Styles on offer in the Studio; persistent, with empty slots refilled after a turn. */
  styleOffers: StyleId[]
  studio: EngineStudioState

  /** This turn's moves, newest last, for UNDO_MOVE (see `MoveStep`). */
  moveTrail: MoveStep[]

  // Combat (synced, unlike the old client-only slice)
  combat: EngineCombatState

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
  /** Every song in the performance (all the performer's dice of one element). */
  songIds: string[]
  performerId: string
  currentFandom: number
  fandomTotal: number
  bestHit: { damage: number } | undefined
  crits: number
  songsUsed: string[]
  /** Rubato's free reroll has been used on this performance. */
  rubatoUsed?: boolean
  /** Style-lab free Inspiration rerolls used on this performance. */
  freeRerollsUsed?: number
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
    selectedSpreadGenre: null,
    stylesUsed: [],
    styleNotes: [],
    rallyReady: false,
    featuredPlayerIds: [],
    featureRequest: null,
    specFired: [],
    playLog: [],
    specRewards: {},
    freeRerollsUsed: 0,
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

/**
 * Split legacy multi-slot songs without losing dice or original song ids,
 * then pad the hand to six songs.
 */
function migrateSongShape(player: Player): Player {
  const fits = player.songs.length >= SONGS_PER_BARD
    && player.songs.every((song) => song.slots.length === 1)
  if (fits) return player
  // Keep original song ids attached to their first die: live combat, rerolls,
  // and showdown history refer to these ids. Additional dice get new songs.
  const songs: Song[] = player.songs.map((song) => ({
    ...song,
    slots: [{ dice: song.slots[0]?.dice ?? null }],
  }))
  for (const song of player.songs) {
    song.slots.slice(1).forEach((slot, index) => {
      if (slot.dice) songs.push({
        id: `${song.id}-slot-${index + 2}`,
        slots: [{ dice: slot.dice }],
        used: song.used,
      })
    })
  }
  while (songs.length < SONGS_PER_BARD) {
    let suffix = songs.length + 1
    while (songs.some((song) => song.id === `${player.id}-song-${suffix}`)) suffix++
    songs.push({ id: `${player.id}-song-${suffix}`, slots: [{ dice: null }], used: false })
  }
  return { ...player, songs }
}

function migratePlayerDice(players: Player[]): Player[] {
  return players.map((player) => {
    const migrated = migrateSongShape(player)
    return {
      ...migrated,
      songs: migrated.songs.map((song): Song => ({
        ...song,
        slots: [{ dice: song.slots[0].dice ? migrateDice(song.slots[0].dice) : null }],
      })),
    }
  })
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
  // Colors used to follow seat order; they now always match the starter element
  const players = migratePlayerDice(state.players ?? []).map((p) => ({
    ...p,
    color: playerColorFor(p.starterGenre),
    styles: p.styles ?? [],
  }))
  // Only legacy slots create aliases. Do not infer relationships from ids in
  // already-migrated games: each song can be spent independently after reload.
  const splitSongIds = new Map<string, string[]>()
  for (const player of state.players ?? []) {
    for (const song of player.songs) {
      splitSongIds.set(song.id, song.slots.slice(1).flatMap((slot, index) =>
        slot.dice ? [`${song.id}-slot-${index + 2}`] : []
      ))
    }
  }
  const migrateSongIds = (ids: string[] = []): string[] =>
    [...new Set(ids.flatMap((id) => [id, ...splitSongIds.get(id) ?? []]))]
  return {
    ...state,
    players,
    pendingRewards: migrateRewardDice(state.pendingRewards ?? {}),
    styleOffers: state.styleOffers ?? [],
    combat: {
      ...createInitialCombatState(),
      ...state.combat,
      spentSongIds: migrateSongIds(state.combat?.spentSongIds),
      undoSnapshot: state.combat?.undoSnapshot ? {
        ...state.combat.undoSnapshot,
        stylesUsed: state.combat.undoSnapshot.stylesUsed ?? [],
        rallyReady: state.combat.undoSnapshot.rallyReady ?? false,
        spentSongIds: migrateSongIds(state.combat.undoSnapshot.spentSongIds),
      } : null,
    },
    showdownSongsUsed: migrateSongIds(state.showdownSongsUsed),
    showdownUndo: state.showdownUndo ? {
      ...state.showdownUndo,
      songIds: state.showdownUndo.songIds ?? [state.showdownUndo.songId],
      songsUsed: migrateSongIds(state.showdownUndo.songsUsed),
    } : null,
    studio: { ...createInitialStudioState(), ...state.studio },
    moveTrail: state.moveTrail ?? [],
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
    styleOffers: [],
    studio: createInitialStudioState(),
    moveTrail: [],

    combat: createInitialCombatState(),
    tunables: DEFAULT_TUNABLES,

    showdownActive: false,
    showdownComplete: false,
    showdownTurn: 1,
    showdownOrder: [],
    showdownPerformerIdx: 0,
    showdownResistGenre: null,
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
