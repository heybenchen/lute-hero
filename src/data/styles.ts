import { StyleId } from '../types/index.js'
import { getTunables } from './tunables.js'

/**
 * Play styles: Studio purchases that change how ALL of a bard's songs play.
 * A bard holds at most `maxStyles` (default 2). Two are on offer at a time,
 * kept between turns with empty slots refilled; Inspiration redraws them on demand.
 *
 * Every rule is one sentence with a single trigger and no running totals —
 * "once per turn" effects fire automatically the first time they apply
 * (except Nimble Fingers, which is a button), so nobody has to remember anything.
 *
 * The ids are the styles' original working names (musical terms) and stay
 * fixed so saved games keep their styles; players only ever see `name`.
 */
export interface StyleDef {
  id: StyleId
  /** Player-facing name. */
  name: string
  /** A line of flavour shown under the name. */
  flavor: string
  /** The rule, as printed on the card. */
  rule: string
}

export const STYLES: Record<StyleId, StyleDef> = {
  staccato: {
    id: 'staccato',
    name: 'Rallying Cry',
    flavor: 'One victory, and a weary song finds its voice again.',
    rule: 'Once per turn, after one of your songs tames a monster, refresh a spent song of your choice.',
  },
  coda: {
    id: 'coda',
    name: 'Extra Verse',
    flavor: 'The crowd demands one more.',
    rule: 'Gain a 7th song slot.',
  },
  ostinato: {
    id: 'ostinato',
    name: 'War Drums',
    flavor: 'Small drums, struck without mercy.',
    rule: 'Your d4s crit on a 3 or 4 (bonus dice still need a 4).',
  },
  rubato: {
    id: 'rubato',
    name: 'Nimble Fingers',
    flavor: 'A slipped note, caught before anyone hears.',
    rule: 'Once per turn, reroll a d4 or d8 song for free.',
  },
  virtuoso: {
    id: 'virtuoso',
    name: "Master's Touch",
    flavor: 'Years of practice, poured into one great chord.',
    rule: 'Once per turn, your first d12 or d20 roll is rolled twice; keep the higher.',
  },
  fortissimo: {
    id: 'fortissimo',
    name: "Dragon's Roar",
    flavor: 'Loud enough to shake the scales off a wyrm.',
    rule: '+2 to every d20 roll. A d20 that reaches 20 this way crits.',
  },
  fermata: {
    id: 'fermata',
    name: 'Lingering Note',
    flavor: 'The last chord hangs in the air, unbroken.',
    rule: "Once per turn, a d12 or d20 song that doesn't tame its target isn't spent.",
  },
  counterpoint: {
    id: 'counterpoint',
    name: 'Dissonance',
    flavor: 'A clashing chord that no ward can fully block.',
    rule: 'Once per turn, a roll against an immune target deals half damage instead of none.',
  },
  tutti: {
    id: 'tutti',
    name: 'Harmony',
    flavor: 'Fire, earth, wind and wave, singing as one.',
    rule: 'If your songs hold all four elements, +4 to your first roll each turn (can\'t crit).',
  },
  overture: {
    id: 'overture',
    name: 'Fanfare',
    flavor: 'Horns announce the hero before the first blow.',
    rule: "+2 to your first roll each turn (can't crit).",
  },
  bravo: {
    id: 'bravo',
    name: 'Crowd Favorite',
    flavor: 'Every beast you tame wins you more admirers.',
    rule: '+1 Fame for every monster you tame.',
  },
  ispirato: {
    id: 'ispirato',
    name: "Muse's Favor",
    flavor: 'Inspiration never leaves you for long.',
    rule: 'Start each turn with at least 1 Inspiration.',
  },
}

export const ALL_STYLE_IDS = Object.keys(STYLES) as StyleId[]

/** EXP price of a style, from the live tunables. */
export function styleCost(id: StyleId): number {
  const t = getTunables()
  switch (id) {
    case 'staccato': return t.styleCostStaccato
    case 'coda': return t.styleCostCoda
    case 'ostinato': return t.styleCostOstinato
    case 'rubato': return t.styleCostRubato
    case 'virtuoso': return t.styleCostVirtuoso
    case 'fortissimo': return t.styleCostFortissimo
    case 'fermata': return t.styleCostFermata
    case 'counterpoint': return t.styleCostCounterpoint
    case 'tutti': return t.styleCostTutti
    case 'overture': return t.styleCostOverture
    case 'bravo': return t.styleCostBravo
    case 'ispirato': return t.styleCostIspirato
  }
}

/** Live rule text with the current tunable numbers filled in. */
export function styleRule(id: StyleId): string {
  const t = getTunables()
  switch (id) {
    case 'fortissimo': return `+${t.fortissimoBonus} to every d20 roll. A d20 that reaches 20 this way crits.`
    case 'overture': return `+${t.overtureBonus} to your first roll each turn (can't crit).`
    case 'tutti': return `If your songs hold all four elements, +${t.tuttiBonus} to your first roll each turn (can't crit).`
    case 'ostinato': return `Your d4s crit on a ${t.ostinatoCritFace} or higher (bonus dice still need a 4).`
    case 'bravo': return `+${t.bravoFamePerTame} Fame for every monster you tame.`
    default: return STYLES[id].rule
  }
}

export const maxStyles = () => getTunables().maxStyles
export const styleOfferCount = () => getTunables().styleOfferCount

/** Draw `count` distinct styles at random, skipping any in `exclude`. */
export function drawStyleOffers(count: number, exclude: StyleId[], rng: () => number): StyleId[] {
  const pool = ALL_STYLE_IDS.filter((id) => !exclude.includes(id))
  const offers: StyleId[] = []
  while (offers.length < count && pool.length > 0) {
    offers.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return offers
}
