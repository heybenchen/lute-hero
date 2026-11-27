import { Genre, GamePhase, DiceType, StyleId } from '../types/index.js'
import { SimulationPace } from '../data/simulationPaces.js'
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
  /** Replace the player's styles (unknown ids dropped, Coda's song kept in sync). */
  styles: StyleId[]
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
  /** Each bard needs a different element; it also sets their color. */
  starterGenre: Genre
  /** Ignored: kept so older clients' payloads still validate. */
  color?: string
}

/**
 * Every game-state mutation is one of these atomic actions. Each replaces a
 * multi-call sequence the components used to orchestrate; the reducer applies
 * it transactionally so hotseat and server behave identically.
 */
export type GameAction =
  | { type: 'START_GAME'; playerConfigs: PlayerConfig[] }
  /** One step to a connected space. `anywhere`: Trip-Hop's once-per-turn move to any space (costs no regular move). */
  | { type: 'MOVE'; playerId: string; toSpaceId: number; anywhere?: boolean }
  /** Take back the last move this turn (only before any combat since). */
  | { type: 'UNDO_MOVE'; playerId: string }
  | { type: 'START_COMBAT'; playerId: string }
  /**
   * Play a song at one monster. `inspiredPlay`: Soul pays Inspiration once for a bonus on every
   * song this concert. `staccatoCall`: Gospel declares this roll will win its monster over (once per turn).
   */
  | { type: 'PLAY_SONG'; songId: string; targetMonsterId: string; inspiredPlay?: boolean; staccatoCall?: boolean }
  /** Spend Inspiration to reroll the last song; `rubato` makes it free (once per turn, d4/d8). */
  | { type: 'REROLL_SONG'; rubato?: boolean }
  /** Rallying Cry: after a tame this turn, refresh one of your spent songs. */
  | { type: 'RALLY_SONG'; songId: string }
  /** Blues (Lingering Note): pay Inspiration to refresh one spent d20 song, once per turn. */
  | { type: 'LINGER_SONG'; songId: string }
  /**
   * Play a featured song: one song from another bard sharing the space, once
   * per bard per fight. Hotseat only — online the fighter asks first
   * (REQUEST_FEATURE) and the guest's agreement plays it (ANSWER_FEATURE).
   */
  | { type: 'PLAY_FEATURED_SONG'; guestPlayerId: string; songId: string; targetMonsterId: string }
  | { type: 'REQUEST_FEATURE'; guestPlayerId: string; songId: string; targetMonsterId: string }
  /** The guest agrees (the song plays) or declines; the fighter may withdraw with `accept: false`. */
  | { type: 'ANSWER_FEATURE'; accept: boolean }
  | { type: 'SELECT_COMBAT_SPREAD'; genre: Genre | null }
  | { type: 'END_COMBAT'; spreadGenre?: Genre }
  | { type: 'END_TURN' }
  | { type: 'OPEN_STUDIO'; playerId: string }
  | { type: 'CLOSE_STUDIO' }
  | { type: 'SELECT_STUDIO_OFFER'; offerIndex: number | null }
  | { type: 'SELECT_STUDIO_REWARD'; rewardId: string | null }
  | { type: 'BUY_DIE'; offerIndex: number; destination?: { songId: string; previousDieId: string | null; genre: Genre } }
  | { type: 'UPGRADE_DIE'; offerIndex: number; diceId: string }
  | { type: 'REFRESH_ELEMENT_OFFERS' }
  | { type: 'SLOT_DIE_REWARD'; rewardId: string; songId: string; slotIndex: number }
  | { type: 'BUY_INSPIRATION' }
  /** Buy an offered style; at the cap, `replaceStyleId` names the one to give up. */
  /** `giveUpSongId`: replacing New Age with a 7th song in use names the song to give up. */
  | { type: 'BUY_STYLE'; offerIndex: number; expectedStyleId?: StyleId; replaceStyleId?: StyleId; giveUpSongId?: string }
  | { type: 'REFRESH_STYLE_OFFERS' }
  | { type: 'PLAY_SHOWDOWN_SONG'; songId: string }
  | { type: 'REROLL_SHOWDOWN_SONG'; rubato?: boolean }
  | { type: 'FINISH_SHOWDOWN_PERFORMANCE' }
  | { type: 'ADVANCE_TO_SUMMARY' }
  | { type: 'RESET_GAME' }
  | { type: 'HOST_SKIP_TURN'; targetPlayerId: string }
  // Playtest debug mode (host-only): tweak values, or restore a saved preset
  | { type: 'DEBUG_PATCH'; patch: DebugPatch }
  | { type: 'DEBUG_LOAD_STATE'; engineState: EngineState }
  /**
   * Bots replay this table from a fresh deal until `round` rounds are done,
   * then play continues from there — or, with `showdown`, the Final Showdown
   * starts from that state. `pace` sets how well the bots play (missing:
   * expert).
   */
  | { type: 'DEBUG_SIMULATE'; round: number; showdown: boolean; pace?: SimulationPace }

export type GameActionType = GameAction['type']

/** Who is performing an action. Seat checks apply only to online actors. */
export type ActorSeat =
  | { kind: 'hotseat' }
  | { kind: 'seat'; playerId: string; isHost: boolean }
