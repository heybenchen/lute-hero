import { Genre, Monster, Song, DiceRoll } from '../../types/index.js'
import { getFinalBoss } from '../../data/monsters.js'
import { getTunables } from '../../data/tunables.js'

/** The Final Showdown lasts exactly this many verses. */
export function showdownTurns(): number {
  return getTunables().showdownTurns
}

/** One player's performance (a single song) for a single showdown turn. */
export interface ShowdownPerformance {
  playerId: string
  /** Effective damage dealt = fandom earned (genre multipliers already applied). */
  fandom: number
  /** Dominant element of the song played — drives the boss's adaptation. */
  genre: Genre | null
}

/**
 * How the boss adapts between turns: it is unmoved (0×, like a monster's
 * immunity) by one element. It has no weakness — no element is doubled.
 */
export interface BossAdaptation {
  resistGenre: Genre | null
}

export const NO_ADAPTATION: BossAdaptation = { resistGenre: null }

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
    // HP is unused in the Final Showdown — the outcome is decided by total
    // fandom, never by depleting the boss — so it carries no meaningful value.
    currentHP: 0,
    maxHP: 0,
    vulnerability: null,
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
 * After a verse, the boss grows unmoved by the element of the most powerful
 * performance (ties go to earlier performers). It needs at least two
 * performances with an element to compare, so a solo showdown never adapts.
 */
export function computeBossAdaptation(performances: ShowdownPerformance[]): BossAdaptation {
  const withGenre = performances.filter((p) => p.genre !== null)
  if (withGenre.length < 2) return NO_ADAPTATION

  let strongest = withGenre[0]
  for (const perf of withGenre) {
    if (perf.fandom > strongest.fandom) strongest = perf
  }
  return { resistGenre: strongest.genre }
}

/** Songs a player can actually perform (at least one die slotted). */
export function getPlayableSongs(songs: Song[]): Song[] {
  return songs.filter((s) => s.slots.some((slot) => slot.dice))
}

/**
 * A showdown performance plays every die of one element at once: the tapped
 * song plus every other playable song whose die shares its element.
 */
export function showdownElementSongs(songs: Song[], songId: string): Song[] {
  const genre = songs.find((s) => s.id === songId)?.slots.find((slot) => slot.dice)?.dice?.genre
  if (!genre) return []
  return getPlayableSongs(songs).filter((s) => s.slots.some((slot) => slot.dice?.genre === genre))
}

/** Several songs rolled as one performance: a single virtual song holding all their dice. */
export function mergeSongs(songs: Song[]): Song {
  return {
    id: songs[0]?.id ?? 'performance',
    slots: songs.flatMap((s) => s.slots) as unknown as Song['slots'],
    used: false,
  }
}
