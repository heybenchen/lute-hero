// KEEP IN SYNC: songStyles.md (repo root) documents every style's rule, price, tunables and simulated strength. When you change style logic, rule text, a price or a style tunable's default, or add or remove a style, update songStyles.md in the same change.
import { Dice, DiceRoll, Genre, Rng, Song, StyleId } from '../../types/index.js'
import { getMaxValue } from '../dice/roller.js'
import { GenericRollOptions, PlayContext, StyleSpec, applySpecRollModifiers, effectiveCritFace, rollWithOptions } from './specs.js'
import { getTunables } from '../../data/tunables.js'
import { ALL_GENRES } from '../../data/genreTheme.js'

/**
 * How a bard's styles shape one play. Built once per play by the reducer;
 * every field is plain data so combat and the showdown share these rules.
 */
export interface StyleContext {
  /** Styles the performing bard owns. */
  styles: StyleId[]
  /** "Once per turn" styles already spent this turn. */
  used: StyleId[]
  /** This is the bard's first roll of the turn (Overture / Tutti). */
  firstRoll: boolean
  /** The performer's own songs hold all four elements (Tutti). */
  allElements: boolean
  /** Distinct elements among the performer's dice (Harmony's threshold is a tunable). */
  elementCount: number
  /** Inspiration the performer holds (Lingering Note may cost some). */
  inspiration?: number
  /** Data-defined styles the performer holds, and the play they apply to. */
  specs?: StyleSpec[]
  play?: PlayContext
}

export interface StyledRolls {
  rolls: DiceRoll[]
  /** Styles that changed this roll (once-per-turn ones get marked used). */
  triggered: StyleId[]
  /** Once-per-turn data-defined styles that fired. */
  specFired: string[]
  /** Data-defined styles that changed at least one die of this roll. */
  specApplied: string[]
}

const has = (ctx: StyleContext, id: StyleId) => ctx.styles.includes(id)
const available = (ctx: StyleContext, id: StyleId) => has(ctx, id) && !ctx.used.includes(id)

/** Do these songs hold every element at least once? */
export function holdsAllElements(songs: Song[]): boolean {
  const genres = new Set<Genre>()
  for (const song of songs) for (const slot of song.slots) if (slot.dice) genres.add(slot.dice.genre)
  return ALL_GENRES.every((g) => genres.has(g))
}

/**
 * Roll one die under the bard's styles.
 * - Virtuoso: the first roll of a d12-or-smaller die each turn rolls twice and keeps the higher.
 * - Fortissimo: +N to a d20, and reaching its top face this way crits.
 * - Ostinato: a d4 crits from a lower face (cascade dice still need a 4).
 * - Overture: a flat bonus on the turn's first roll that never crits; Tutti: a flat bonus on every die.
 * Crits cascade exactly as before: each bonus die is a plain roll of the same die.
 */
/**
 * The built-in styles' effect on one die, as generic roll options (shared with
 * data-defined styles and with the simulation odds).
 */
export function builtinRollOptions(dice: Dice, ctx: StyleContext, isFirstDie: boolean, triggered: StyleId[]): GenericRollOptions {
  const t = getTunables()
  const max = getMaxValue(dice.type)
  const opts: GenericRollOptions = { maxCascades: t.maxCritCascades }
  if (max >= t.virtuosoMinFaces && max <= t.virtuosoMaxFaces && available(ctx, 'virtuoso') && !triggered.includes('virtuoso')) {
    opts.advantage = true
    triggered.push('virtuoso')
  }
  // Bonuses that can push a die to its top face (and so crit)
  if (dice.type === 'd20' && has(ctx, 'fortissimo') && t.fortissimoBonus > 0) {
    opts.critBonus = t.fortissimoBonus
    triggered.push('fortissimo')
  }
  // Flat bonuses that never crit
  let flat = 0
  if (isFirstDie && ctx.firstRoll && has(ctx, 'overture') && t.overtureBonus > 0) {
    flat += t.overtureBonus
    triggered.push('overture')
  }
  // Harmony adds to every die, not just the turn's first roll
  if (has(ctx, 'tutti') && ctx.elementCount >= t.tuttiElements && t.tuttiBonus > 0) {
    flat += t.tuttiBonus
    triggered.push('tutti')
  }
  if (flat) opts.flat = flat
  if (has(ctx, 'ostinato') && max <= t.ostinatoMaxFaces) {
    opts.critFace = ostinatoCritFace(max)
    if (t.ostinatoCascadeBonus) opts.cascadeBonus = t.ostinatoCascadeBonus
    // Like the crit face, the chain face sits (4 - ostinatoChainFace) numbers below the top
    if (t.ostinatoChainFace < 4) opts.cascadeFace = Math.max(2, max - (4 - t.ostinatoChainFace))
  }
  return opts
}

function rollStyledDie(dice: Dice, ctx: StyleContext, isFirstDie: boolean, dieIndex: number, triggered: StyleId[], specFired: string[], specApplied: string[], rng: Rng): DiceRoll {
  const max = getMaxValue(dice.type)
  let opts = builtinRollOptions(dice, ctx, isFirstDie, triggered)
  // Data-defined styles stack their modifiers on top
  if (ctx.specs?.length && ctx.play) {
    const play = { ...ctx.play, playIndex: ctx.play.playIndex + dieIndex, used: [...ctx.play.used, ...specFired] }
    const applied = applySpecRollModifiers(ctx.specs, dice, play, opts)
    opts = applied.opts
    specFired.push(...applied.fired)
    specApplied.push(...applied.applied)
  }
  const roll = rollWithOptions(dice, opts, rng)
  const critFace = effectiveCritFace(dice.type, opts)
  if (roll.isCrit && has(ctx, 'ostinato') && critFace < max && roll.value < max) triggered.push('ostinato')
  return roll
}

/** Roll every die in a song with the performer's styles applied. */
export function rollSongWithStyles(song: Song, ctx: StyleContext, rng: Rng): StyledRolls {
  const triggered: StyleId[] = []
  const specFired: string[] = []
  const specApplied: string[] = []
  const rolls: DiceRoll[] = []
  let first = true
  let index = 0
  for (const slot of song.slots) {
    if (!slot.dice) continue
    rolls.push(rollStyledDie(slot.dice, ctx, first, index, triggered, specFired, specApplied, rng))
    first = false
    index++
  }
  return { rolls, triggered: [...new Set(triggered)], specFired: [...new Set(specFired)], specApplied: [...new Set(specApplied)] }
}

/** Counterpoint softens the first immune hit each turn; returns the multiplier to use, if any. */
export function counterpointMultiplier(ctx: StyleContext): number | undefined {
  return available(ctx, 'counterpoint') ? getTunables().counterpointMultiplier : undefined
}

/** Fermata: a d12/d20 song that fails to tame stays unspent, once per turn. */
export function fermataHolds(song: Song, ctx: StyleContext): boolean {
  const t = getTunables()
  if ((ctx.inspiration ?? 0) < t.fermataInspirationCost) return false
  return available(ctx, 'fermata') && song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) >= t.fermataMinFaces)
}

/** War Drums: the crit face for a die with this many faces (a d4 crits from `ostinatoCritFace`). */
export function ostinatoCritFace(faces: number): number {
  return Math.max(2, faces - (4 - getTunables().ostinatoCritFace))
}

/** Crowd Favorite's Fame for taming a monster of this level (0 below its level gate). */
export function bravoFameFor(level: number): number {
  const t = getTunables()
  return level >= t.bravoMinLevel ? t.bravoFamePerTame : 0
}

/** Free Nimble Fingers rerolls still available this turn. */
export function rubatoUsesLeft(used: StyleId[]): number {
  return getTunables().rubatoUsesPerTurn - used.filter((id) => id === 'rubato').length
}

/** Staccato (Rallying Cry): a tame lets the bard refresh one spent song of their choice, once per turn. */
export function staccatoArms(ctx: StyleContext): boolean {
  return available(ctx, 'staccato')
}

/** Rubato's free reroll works on d4 and d8 songs. */
export function rubatoCanReroll(song: Song): boolean {
  const max = getTunables().rubatoMaxFaces
  return song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) <= max)
}

/** Rallying Cry can refresh this song (its die is within the size limit). */
export function staccatoCanRefresh(song: Song): boolean {
  const max = getTunables().staccatoMaxFaces
  return song.slots.some((s) => !!s.dice && getMaxValue(s.dice.type) <= max)
}

/** Distinct elements among a setlist's dice. */
export function elementCount(songs: Song[]): number {
  const genres = new Set<Genre>()
  for (const song of songs) for (const slot of song.slots) if (slot.dice) genres.add(slot.dice.genre)
  return genres.size
}

/** Once-per-turn styles (marked used when they fire). */
export const ONCE_PER_TURN: StyleId[] = ['staccato', 'rubato', 'virtuoso', 'fermata', 'counterpoint']
