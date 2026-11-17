import { Dice, DiceRoll, Genre, Rng, Song, StyleId } from '../../types/index.js'
import { getMaxValue, rollCascadeDice, rollDie } from '../dice/roller.js'
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
}

export interface StyledRolls {
  rolls: DiceRoll[]
  /** Styles that changed this roll (once-per-turn ones get marked used). */
  triggered: StyleId[]
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
 * - Virtuoso: the first d12/d20 each turn rolls twice and keeps the higher.
 * - Fortissimo: +N to a d20, and reaching its top face this way crits.
 * - Ostinato: a d4 crits from a lower face (cascade dice still need a 4).
 * - Overture / Tutti: a flat bonus on the turn's first roll that never crits.
 * Crits cascade exactly as before: each bonus die is a plain roll of the same die.
 */
function rollStyledDie(dice: Dice, ctx: StyleContext, isFirstDie: boolean, triggered: StyleId[], rng: Rng): DiceRoll {
  const t = getTunables()
  const max = getMaxValue(dice.type)
  const big = dice.type === 'd12' || dice.type === 'd20'

  let value = rollDie(dice.type, rng)
  if (big && available(ctx, 'virtuoso') && !triggered.includes('virtuoso')) {
    value = Math.max(value, rollDie(dice.type, rng))
    triggered.push('virtuoso')
  }

  // Bonuses that can push a die to its top face (and so crit)
  let critBonus = 0
  if (dice.type === 'd20' && has(ctx, 'fortissimo') && t.fortissimoBonus > 0) {
    critBonus += t.fortissimoBonus
    triggered.push('fortissimo')
  }
  // Flat bonuses that never crit
  let flatBonus = 0
  if (isFirstDie && ctx.firstRoll) {
    if (has(ctx, 'overture') && t.overtureBonus > 0) {
      flatBonus += t.overtureBonus
      triggered.push('overture')
    }
    if (has(ctx, 'tutti') && ctx.allElements && t.tuttiBonus > 0) {
      flatBonus += t.tuttiBonus
      triggered.push('tutti')
    }
  }

  const critFace = dice.type === 'd4' && has(ctx, 'ostinato') ? Math.min(max, t.ostinatoCritFace) : max
  const isCrit = value + critBonus >= critFace
  if (isCrit && dice.type === 'd4' && critFace < max && value < max) triggered.push('ostinato')

  const cascadeRolls = isCrit ? rollCascadeDice(dice.type, t.maxCritCascades, rng) : []
  const bonus = critBonus + flatBonus
  return {
    diceId: dice.id,
    value,
    isCrit,
    critBonus: cascadeRolls.reduce((sum, v) => sum + v, 0),
    cascadeRolls,
    ...(bonus > 0 ? { bonus } : {}),
  }
}

/** Roll every die in a song with the performer's styles applied. */
export function rollSongWithStyles(song: Song, ctx: StyleContext, rng: Rng): StyledRolls {
  const triggered: StyleId[] = []
  const rolls: DiceRoll[] = []
  let first = true
  for (const slot of song.slots) {
    if (!slot.dice) continue
    rolls.push(rollStyledDie(slot.dice, ctx, first, triggered, rng))
    first = false
  }
  return { rolls, triggered: [...new Set(triggered)] }
}

/** Counterpoint softens the first immune hit each turn; returns the multiplier to use, if any. */
export function counterpointMultiplier(ctx: StyleContext): number | undefined {
  return available(ctx, 'counterpoint') ? getTunables().counterpointMultiplier : undefined
}

/** Fermata: a d12/d20 song that fails to tame stays unspent, once per turn. */
export function fermataHolds(song: Song, ctx: StyleContext): boolean {
  return available(ctx, 'fermata') && song.slots.some((s) => s.dice?.type === 'd12' || s.dice?.type === 'd20')
}

/** Staccato (Rallying Cry): any song that tames refreshes your d4 songs, once per turn. */
export function staccatoRefreshes(ctx: StyleContext): boolean {
  return available(ctx, 'staccato')
}

/** Rubato's free reroll works on d4 and d8 songs. */
export function rubatoCanReroll(song: Song): boolean {
  return song.slots.some((s) => s.dice?.type === 'd4' || s.dice?.type === 'd8')
}

/** Once-per-turn styles (marked used when they fire). */
export const ONCE_PER_TURN: StyleId[] = ['staccato', 'rubato', 'virtuoso', 'fermata', 'counterpoint']
