import { StyleId } from '../types/index.js'
import { getTunables } from './tunables.js'

/**
 * Play styles: Studio purchases that change how ALL of a bard's songs play.
 * A bard holds at most `maxStyles` (default 2). Two are on offer at a time,
 * redrawn after every turn; Inspiration redraws them on demand.
 *
 * Every rule is one sentence with a single trigger and no running totals —
 * "once per turn" effects fire automatically the first time they apply
 * (except Rubato, which is a button), so nobody has to remember anything.
 */
export interface StyleDef {
  id: StyleId
  /** Musical term shown as the style's name. */
  name: string
  /** What the term means, for flavour. */
  meaning: string
  /** The rule, as printed on the card. */
  rule: string
}

export const STYLES: Record<StyleId, StyleDef> = {
  staccato: {
    id: 'staccato',
    name: 'Staccato',
    meaning: 'short, detached notes',
    rule: 'Once per turn, when a d4 song tames a monster, refresh all your other d4 songs.',
  },
  coda: {
    id: 'coda',
    name: 'Coda',
    meaning: 'an extra closing section',
    rule: 'Gain a 7th song slot.',
  },
  ostinato: {
    id: 'ostinato',
    name: 'Ostinato',
    meaning: 'a relentlessly repeated rhythm',
    rule: 'Your d4s crit on a 3 or 4 (bonus dice still need a 4).',
  },
  rubato: {
    id: 'rubato',
    name: 'Rubato',
    meaning: '"stolen time"',
    rule: 'Once per turn, reroll a d4 or d8 song for free.',
  },
  virtuoso: {
    id: 'virtuoso',
    name: 'Virtuoso',
    meaning: 'a performer of exceptional skill',
    rule: 'Once per turn, your first d12 or d20 roll is rolled twice; keep the higher.',
  },
  fortissimo: {
    id: 'fortissimo',
    name: 'Fortissimo',
    meaning: 'very loud',
    rule: '+2 to every d20 roll. A d20 that reaches 20 this way crits.',
  },
  fermata: {
    id: 'fermata',
    name: 'Fermata',
    meaning: 'a held note',
    rule: "Once per turn, a d12 or d20 song that doesn't tame its target isn't spent.",
  },
  counterpoint: {
    id: 'counterpoint',
    name: 'Counterpoint',
    meaning: 'independent melodies woven together',
    rule: 'Once per turn, a roll against an immune target deals half damage instead of none.',
  },
  tutti: {
    id: 'tutti',
    name: 'Tutti',
    meaning: '"everyone plays"',
    rule: 'If your songs hold all four elements, +4 to your first roll each turn (can\'t crit).',
  },
  overture: {
    id: 'overture',
    name: 'Overture',
    meaning: 'the opening piece',
    rule: "+2 to your first roll each turn (can't crit).",
  },
  bravo: {
    id: 'bravo',
    name: 'Bravo',
    meaning: 'the crowd\'s cheer',
    rule: '+1 Fame for every monster you tame.',
  },
  ispirato: {
    id: 'ispirato',
    name: 'Ispirato',
    meaning: 'inspired',
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
