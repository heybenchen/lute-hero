import { Monster, Song } from '@/types'
import { getFinalBoss } from '@/data/monsters'

/** The Final Showdown always lasts exactly this many turns. */
export const SHOWDOWN_TURNS = 3

/** Fandom multiplier when the boss has built resistance to a player. */
export const SHOWDOWN_RESIST_MULTIPLIER = 0.5

/** Fandom multiplier when the boss has an exposed weakness to a player. */
export const SHOWDOWN_WEAKNESS_MULTIPLIER = 2

/** One player's complete performance for a single showdown turn. */
export interface ShowdownPerformance {
  playerId: string
  /** Raw damage rolled before the boss's resistance/weakness multiplier. */
  rawDamage: number
  /** Multiplier applied to this player's damage this turn (0.5 / 1 / 2). */
  multiplier: number
  /** Effective damage dealt = fandom earned (rawDamage × multiplier, floored). */
  fandom: number
}

/** How the boss adapts between turns: who it resists, whose attacks it's weak to. */
export interface BossAdaptation {
  resistedPlayerId: string | null
  weakenedPlayerId: string | null
}

/** Build the showdown boss from the final-boss template. */
export function createShowdownBoss(): Monster {
  const template = getFinalBoss()
  return {
    id: 'showdown-boss',
    templateId: template.id,
    name: template.name,
    currentHP: template.baseHP,
    maxHP: template.baseHP,
    vulnerability: null,
    resistance: null,
    isBoss: true,
    level: 5,
  }
}

/**
 * Fandom multiplier for a player given the boss's current adaptation.
 * Resistance halves fandom earned; an exposed weakness doubles it.
 */
export function getShowdownMultiplier(
  playerId: string,
  adaptation: BossAdaptation
): number {
  if (adaptation.resistedPlayerId === playerId) return SHOWDOWN_RESIST_MULTIPLIER
  if (adaptation.weakenedPlayerId === playerId) return SHOWDOWN_WEAKNESS_MULTIPLIER
  return 1
}

/**
 * After a turn, the boss builds resistance to the most powerful attack among
 * all players and a weakness to the weakest. Power is measured by effective
 * damage dealt (fandom) that turn. If the strongest and weakest attacker are
 * the same player (e.g. a solo showdown), the boss cannot adapt.
 * Ties go to whoever performed earlier in the turn.
 */
export function computeBossAdaptation(performances: ShowdownPerformance[]): BossAdaptation {
  if (performances.length < 2) {
    return { resistedPlayerId: null, weakenedPlayerId: null }
  }

  let strongest = performances[0]
  let weakest = performances[0]
  for (const perf of performances) {
    if (perf.fandom > strongest.fandom) strongest = perf
    if (perf.fandom < weakest.fandom) weakest = perf
  }

  if (strongest.playerId === weakest.playerId) {
    return { resistedPlayerId: null, weakenedPlayerId: null }
  }

  return {
    resistedPlayerId: strongest.playerId,
    weakenedPlayerId: weakest.playerId,
  }
}

/** Fandom earned from a song's raw damage under the current multiplier. */
export function calculateShowdownFandom(rawDamage: number, multiplier: number): number {
  return Math.floor(rawDamage * multiplier)
}

/** Songs a player can actually perform (at least one die slotted). */
export function getPlayableSongs(songs: Song[]): Song[] {
  return songs.filter((s) => s.slots.some((slot) => slot.dice))
}
