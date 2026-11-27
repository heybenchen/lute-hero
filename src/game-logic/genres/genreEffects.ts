// KEEP IN SYNC: genres.md (repo root) documents every genre's rule, price, tunables and simulated strength. When you change genre logic, rule text, a price or a genre tunable's default, or add or remove a genre, update genres.md in the same change.
import { Dice, DiceRoll, Element, Rng, Song, GenreId } from '../../types/index.js'
import { getMaxValue } from '../dice/roller.js'
import { GenericRollOptions, PlayContext, GenreSpec, applySpecRollModifiers, effectiveCritFace, rollWithOptions } from './specs.js'
import { getTunables } from '../../data/tunables.js'
import { ALL_ELEMENTS } from '../../data/elementTheme.js'

/**
 * How a bard's genres shape one play. Built once per play by the reducer;
 * every field is plain data so combat and the showdown share these rules.
 */
export interface GenreContext {
  /** Genres the performing bard owns. */
  genres: GenreId[]
  /** "Once per turn" genres already spent this turn. */
  used: GenreId[]
  /** This is the bard's first roll of the turn (Screamo / Barbershop). */
  firstRoll: boolean
  /** The performer's own songs hold all four elements (Barbershop). */
  allElements: boolean
  /** Distinct elements among the performer's dice (Harmony's threshold is a tunable). */
  elementCount: number
  /** Inspiration the performer holds (Lingering Note may cost some). */
  inspiration?: number
  /** Data-defined genres the performer holds, and the play they apply to. */
  specs?: GenreSpec[]
  play?: PlayContext
}

export interface GenreRolls {
  rolls: DiceRoll[]
  /** Genres that changed this roll (once-per-turn ones get marked used). */
  triggered: GenreId[]
  /** Once-per-turn data-defined genres that fired. */
  specFired: string[]
  /** Data-defined genres that changed at least one die of this roll. */
  specApplied: string[]
}

const has = (ctx: GenreContext, id: GenreId) => ctx.genres.includes(id)
const available = (ctx: GenreContext, id: GenreId) => has(ctx, id) && !ctx.used.includes(id)

/** Do these songs hold every element at least once? */
export function holdsAllElements(songs: Song[]): boolean {
  const elements = new Set<Element>()
  for (const song of songs) for (const slot of song.slots) if (slot.dice) elements.add(slot.dice.element)
  return ALL_ELEMENTS.every((g) => elements.has(g))
}

/**
 * Roll one die under the bard's genres.
 * - Bluegrass: the first roll of a d12-or-smaller die each turn rolls twice and keeps the higher.
 * - Opera: +N to a d20, and reaching its top face this way crits.
 * - Indie: a d4 crits from a lower face (cascade dice still need a 4).
 * - Screamo: a flat bonus on the turn's first roll that never crits; Barbershop: a flat bonus on every die.
 * Crits cascade exactly as before: each bonus die is a plain roll of the same die.
 */
/**
 * The built-in genres' effect on one die, as generic roll options (shared with
 * data-defined genres and with the simulation odds).
 */
export function builtinRollOptions(dice: Dice, ctx: GenreContext, isFirstDie: boolean, triggered: GenreId[]): GenericRollOptions {
  const t = getTunables()
  const max = getMaxValue(dice.type)
  const opts: GenericRollOptions = { maxCascades: t.maxCritCascades }
  // Bluegrass: every die in its range rolls twice and keeps the higher (bonus dice roll once)
  if (max >= t.bluegrassMinFaces && max <= t.bluegrassMaxFaces && has(ctx, 'bluegrass')) {
    opts.advantage = true
    triggered.push('bluegrass')
  }
  // Flat bonuses that never crit
  let flat = 0
  // Opera: a bonus on every d20 song, flat or on the rolled value (which can crit)
  if (dice.type === 'd20' && has(ctx, 'opera') && t.operaBonus > 0) {
    if (t.operaRaisesFace) opts.critBonus = (opts.critBonus ?? 0) + t.operaBonus
    else flat += t.operaBonus
    triggered.push('opera')
  }
  if (isFirstDie && ctx.firstRoll && has(ctx, 'screamo') && t.screamoBonus > 0) {
    flat += t.screamoBonus
    triggered.push('screamo')
  }
  // Harmony adds to every die, not just the turn's first roll
  if (has(ctx, 'barbershop') && ctx.elementCount >= t.barbershopElements && t.barbershopBonus > 0) {
    flat += t.barbershopBonus
    triggered.push('barbershop')
  }
  if (flat) opts.flat = flat
  if (has(ctx, 'indie') && max <= t.indieMaxFaces) {
    opts.critFace = indieCritFace(max)
    if (t.indieCascadeBonus) opts.cascadeBonus = t.indieCascadeBonus
    // Like the crit face, the chain face sits (4 - indieChainFace) numbers below the top
    if (t.indieChainFace < 4) opts.cascadeFace = Math.max(2, max - (4 - t.indieChainFace))
  }
  return opts
}

function rollGenreDie(dice: Dice, ctx: GenreContext, isFirstDie: boolean, dieIndex: number, verseCombo: number, triggered: GenreId[], specFired: string[], specApplied: string[], rng: Rng): DiceRoll {
  const max = getMaxValue(dice.type)
  let opts = builtinRollOptions(dice, ctx, isFirstDie, triggered)
  // Data-defined genres stack their modifiers on top
  if (ctx.specs?.length && ctx.play) {
    // A showdown verse rolls many dice at once: each counts the same-element dice rolled just before it
    const comboCount = ctx.play.showdown ? verseCombo : ctx.play.comboCount
    const play = { ...ctx.play, playIndex: ctx.play.playIndex + dieIndex, comboCount, used: [...ctx.play.used, ...specFired] }
    const applied = applySpecRollModifiers(ctx.specs, dice, play, opts)
    opts = applied.opts
    specFired.push(...applied.fired)
    specApplied.push(...applied.applied)
  }
  const roll = rollWithOptions(dice, opts, rng)
  const critFace = effectiveCritFace(dice.type, opts)
  if (roll.isCrit && has(ctx, 'indie') && critFace < max && roll.value < max) triggered.push('indie')
  return roll
}

/** Roll every die in a song with the performer's genres applied. */
export function rollSongWithGenres(song: Song, ctx: GenreContext, rng: Rng): GenreRolls {
  const triggered: GenreId[] = []
  const specFired: string[] = []
  const specApplied: string[] = []
  const rolls: DiceRoll[] = []
  let first = true
  let index = 0
  let combo = 0
  let lastElement: Dice['element'] | null = null
  for (const slot of song.slots) {
    if (!slot.dice) continue
    combo = slot.dice.element === lastElement ? combo + 1 : 0
    lastElement = slot.dice.element
    rolls.push(rollGenreDie(slot.dice, ctx, first, index, combo, triggered, specFired, specApplied, rng))
    first = false
    index++
  }
  return { rolls, triggered: [...new Set(triggered)], specFired: [...new Set(specFired)], specApplied: [...new Set(specApplied)] }
}

/** Crossover softens the first immune hit each turn; returns the multiplier to use, if any. */
export function crossoverMultiplier(ctx: GenreContext): number | undefined {
  return available(ctx, 'crossover') ? getTunables().crossoverMultiplier : undefined
}

/** Blues can refresh this spent song: its die is at least `bluesMinFaces` (a d20 by default). */
export function bluesCanRefresh(song: Song): boolean {
  const min = getTunables().bluesMinFaces
  return song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) >= min)
}

/** War Drums: the crit face for a die with this many faces (a d4 crits from `indieCritFace`). */
export function indieCritFace(faces: number): number {
  return Math.max(2, faces - (4 - getTunables().indieCritFace))
}

/** Crowd Favorite's Fame for taming a monster of this level (0 below its level gate). */
export function discoFameFor(level: number): number {
  const t = getTunables()
  return level >= t.discoMinLevel ? t.discoFamePerTame : 0
}

/** Free Nimble Fingers rerolls still available this turn. */
export function bebopUsesLeft(used: GenreId[]): number {
  return getTunables().bebopUsesPerTurn - used.filter((id) => id === 'bebop').length
}

/** Bebop's free reroll works on d4 and d8 songs. */
export function bebopCanReroll(song: Song): boolean {
  const max = getTunables().bebopMaxFaces
  return song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) <= max)
}

/** Rallying Cry can refresh this song (its die is within the size limit). */
export function gospelCanRefresh(song: Song): boolean {
  const max = getTunables().gospelMaxFaces
  return song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) <= max)
}

/** Distinct elements among a setlist's dice. */
export function elementCount(songs: Song[]): number {
  const elements = new Set<Element>()
  for (const song of songs) for (const slot of song.slots) if (slot.dice) elements.add(slot.dice.element)
  return elements.size
}

/** Once-per-turn genres (marked used when they fire). */
export const ONCE_PER_TURN: GenreId[] = ['gospel', 'bebop', 'blues', 'crossover']
