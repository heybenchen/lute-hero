import { Genre, Monster, Song, DiceRoll } from '../../types/index.js'
import { getFinalBoss } from '../../data/monsters.js'

/** The Final Showdown always lasts exactly this many turns. */
export const SHOWDOWN_TURNS = 3

/** One player's performance (a single song) for a single showdown turn. */
export interface ShowdownPerformance {
  playerId: string
  /** Effective damage dealt = fandom earned (genre multipliers already applied). */
  fandom: number
  /** Dominant element of the song played — drives the boss's adaptation. */
  genre: Genre | null
}

/**
 * How the boss adapts between turns. Works exactly like monster
 * strengths/weaknesses: the resisted element deals 0× damage (immune),
 * the weak element deals 2× damage.
 */
export interface BossAdaptation {
  resistGenre: Genre | null
  weakGenre: Genre | null
}

export const NO_ADAPTATION: BossAdaptation = { resistGenre: null, weakGenre: null }

/**
 * Build the showdown boss with its current elemental adaptation. Genre
 * multipliers are then applied by the normal monster damage pipeline.
 */
export function createShowdownBoss(adaptation: BossAdaptation = NO_ADAPTATION): Monster {
  const template = getFinalBoss()
  return {
    id: 'showdown-boss',
    templateId: template.id,
    name: template.name,
    currentHP: template.baseHP,
    maxHP: template.baseHP,
    vulnerability: adaptation.weakGenre,
    resistance: adaptation.resistGenre,
    isBoss: true,
    level: 5,
  }
}

/**
 * The dominant element of a performance: the genre whose dice contributed
 * the most raw roll value (crit cascades included). Ties go to the genre
 * appearing first in slot order.
 */
export function getDominantGenre(song: Song, rolls: DiceRoll[]): Genre | null {
  const totals = new Map<Genre, number>()
  const order: Genre[] = []

  song.slots.forEach((slot) => {
    if (!slot.dice) return
    const genre = slot.dice.genre
    if (!order.includes(genre)) order.push(genre)
    const contribution = rolls
      .filter((r) => r.diceId === slot.dice!.id)
      .reduce((sum, r) => sum + r.value + r.critBonus, 0)
    totals.set(genre, (totals.get(genre) || 0) + contribution)
  })

  let dominant: Genre | null = null
  let best = -1
  for (const genre of order) {
    const total = totals.get(genre) || 0
    if (total > best) {
      best = total
      dominant = genre
    }
  }
  return dominant
}

/**
 * After a turn, the boss builds resistance to the element of the most
 * powerful attack among all players and a weakness to the element of the
 * weakest. If both point at the same element (or there are fewer than two
 * performances), the boss cannot adapt. Ties go to earlier performers.
 */
export function computeBossAdaptation(performances: ShowdownPerformance[]): BossAdaptation {
  const withGenre = performances.filter((p) => p.genre !== null)
  if (withGenre.length < 2) return NO_ADAPTATION

  let strongest = withGenre[0]
  let weakest = withGenre[0]
  for (const perf of withGenre) {
    if (perf.fandom > strongest.fandom) strongest = perf
    if (perf.fandom < weakest.fandom) weakest = perf
  }

  if (strongest.genre === weakest.genre) return NO_ADAPTATION

  return { resistGenre: strongest.genre, weakGenre: weakest.genre }
}

/** Songs a player can actually perform (at least one die slotted). */
export function getPlayableSongs(songs: Song[]): Song[] {
  return songs.filter((s) => s.slots.some((slot) => slot.dice))
}
