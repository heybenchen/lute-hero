import { Element, Monster, Song, DiceRoll } from '../../types/index.js'
import { getFinalBoss } from '../../data/monsters.js'
import { getTunables } from '../../data/tunables.js'

/** The Final Showdown lasts exactly this many verses. */
export function showdownTurns(): number {
  return getTunables().showdownTurns
}

/** One player's performance (a single song) for a single showdown turn. */
export interface ShowdownPerformance {
  playerId: string
  /** Effective damage dealt = fandom earned (element multipliers already applied). */
  fandom: number
  /** Dominant element of the song played — drives the boss's adaptation. */
  element: Element | null
  /** Fame this verse paid, crown bonus included (filled in when the verse is settled). */
  earned?: number
  /** The crown bonus inside `earned`: beat or matched the crown holder's verse. */
  crownBonus?: number
}

/**
 * How the boss adapts between turns: it is unmoved (0×, like a monster's
 * immunity) by one element. It has no weakness — no element is doubled.
 */
export interface BossAdaptation {
  resistElement: Element | null
}

export const NO_ADAPTATION: BossAdaptation = { resistElement: null }

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
    resistance: adaptation.resistElement,
    isBoss: true,
    level: 5,
  }
}

/**
 * The dominant element of a performance: the genre whose dice contributed
 * the most raw roll value (crit cascades included). Ties go to the genre
 * appearing first in slot order.
 */
export function getDominantElement(song: Song, rolls: DiceRoll[]): Element | null {
  const totals = new Map<Element, number>()
  const order: Element[] = []

  song.slots.forEach((slot) => {
    if (!slot.dice) return
    const element = slot.dice.element
    if (!order.includes(element)) order.push(element)
    const contribution = rolls
      .filter((r) => (r.sourceDiceId ?? r.diceId) === slot.dice!.id)
      .reduce((sum, r) => sum + r.value + r.critBonus, 0)
    totals.set(element, (totals.get(element) || 0) + contribution)
  })

  let dominant: Element | null = null
  let best = -1
  for (const element of order) {
    const total = totals.get(element) || 0
    if (total > best) {
      best = total
      dominant = element
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
  const withElement = performances.filter((p) => p.element !== null)
  if (withElement.length < 2) return NO_ADAPTATION

  let strongest = withElement[0]
  for (const perf of withElement) {
    if (perf.fandom > strongest.fandom) strongest = perf
  }
  return { resistElement: strongest.element }
}

/**
 * The crown: whoever has the most Fame (tour Fame plus Showdown Fame so far)
 * when a verse begins. Tied bards share it.
 */
export function crownHolders(players: { id: string; fame: number }[], earned: Record<string, number>): string[] {
  if (players.length === 0) return []
  const total = (p: { id: string; fame: number }) => p.fame + (earned[p.id] ?? 0)
  const top = Math.max(...players.map(total))
  return players.filter((p) => total(p) === top).map((p) => p.id)
}

/**
 * Who performs when in a verse: most Fame first (tour Fame plus Showdown Fame
 * so far), so the crown holder sets the number to beat and the bards furthest
 * behind perform last, knowing every score before they spend Inspiration.
 * Ties keep seat order.
 */
export function performanceOrder(players: { id: string; fame: number }[], earned: Record<string, number>): string[] {
  const total = (p: { id: string; fame: number }) => p.fame + (earned[p.id] ?? 0)
  return players
    .map((p, seat) => ({ p, seat }))
    .sort((a, b) => total(b.p) - total(a.p) || a.seat - b.seat)
    .map(({ p }) => p.id)
}

/** Fame for a verse's fandom: multiplied, then rounded down to whole Fame chips. */
export function verseFame(fandom: number): number {
  const { showdownFandomMultiplier, showdownFameRounding } = getTunables()
  const step = Math.max(1, showdownFameRounding)
  return Math.floor((fandom * showdownFandomMultiplier) / step) * step
}

/**
 * Crown bonus for one performance: beating the crown holder's verse pays the
 * beat bonus, matching it the tie bonus. The crown holders themselves never
 * earn one, and a verse of 0 can't match. With several holders, the best of
 * their verses is the one to beat.
 */
export function crownBonus(perf: ShowdownPerformance, performances: ShowdownPerformance[], crownIds: string[]): number {
  if (crownIds.length === 0 || crownIds.includes(perf.playerId)) return 0
  const crownPerfs = performances.filter((p) => crownIds.includes(p.playerId))
  if (crownPerfs.length === 0) return 0
  const toBeat = Math.max(...crownPerfs.map((p) => p.fandom))
  const { showdownCrownBeatBonus, showdownCrownTieBonus } = getTunables()
  if (perf.fandom > toBeat) return showdownCrownBeatBonus
  if (perf.fandom === toBeat && perf.fandom > 0) return showdownCrownTieBonus
  return 0
}

/** Pay out a finished verse: each performance's Fame (rounded fandom + crown bonus). */
export function settleVerse(performances: ShowdownPerformance[], crownIds: string[]): ShowdownPerformance[] {
  return performances.map((perf) => {
    const bonus = crownBonus(perf, performances, crownIds)
    return { ...perf, crownBonus: bonus, earned: verseFame(perf.fandom) + bonus }
  })
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
  const element = songs.find((s) => s.id === songId)?.slots.find((slot) => slot.dice)?.dice?.element
  if (!element) return []
  return getPlayableSongs(songs).filter((s) => s.slots.some((slot) => slot.dice?.element === element))
}

/** Several songs rolled as one performance: a single virtual song holding all their dice. */
export function mergeSongs(songs: Song[]): Song {
  return {
    id: songs[0]?.id ?? 'performance',
    slots: songs.flatMap((s) => s.slots) as unknown as Song['slots'],
    used: false,
  }
}
