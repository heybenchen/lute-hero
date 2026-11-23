// KEEP IN SYNC: songStyles.md (repo root) documents every style's rule, price, tunables and simulated strength. When you change style logic, rule text, a price or a style tunable's default, or add or remove a style, update songStyles.md in the same change.
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
    rule: 'Once per turn, after a song wins over a monster, refresh any spent song.',
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
    rule: 'Once per turn, re-roll the die you just rolled and keep the higher result.',
  },
  virtuoso: {
    id: 'virtuoso',
    name: "Master's Touch",
    flavor: 'Years of practice, poured into one great chord.',
    rule: 'Once per turn, roll your first d12 or smaller die twice and keep the higher.',
  },
  fortissimo: {
    id: 'fortissimo',
    name: "Dragon's Roar",
    flavor: 'Loud enough to shake the scales off a wyrm.',
    rule: 'Increases the face value of every d20 by 2. Reaching 20 crits.',
  },
  fermata: {
    id: 'fermata',
    name: 'Lingering Note',
    flavor: 'The last chord hangs in the air, unbroken.',
    rule: "Once per turn, a d12 or d20 song that doesn't win over its monster isn't spent.",
  },
  counterpoint: {
    id: 'counterpoint',
    name: 'Dissonance',
    flavor: 'A clashing chord that no ward can fully block.',
    rule: 'Once per turn, a song counts in full against an immune monster.',
  },
  tutti: {
    id: 'tutti',
    name: 'Harmony',
    flavor: 'Fire, earth, wind and wave, singing as one.',
    rule: "With all four elements in your setlist, adds +1 to the value of the song per die. Can't crit.",
  },
  overture: {
    id: 'overture',
    name: 'Fanfare',
    flavor: 'Horns announce the hero before the first blow.',
    rule: "Adds +3 to the value of your first song each turn. Can't crit.",
  },
  bravo: {
    id: 'bravo',
    name: 'Crowd Favorite',
    flavor: 'Every monster you win over becomes another admirer.',
    rule: '+1 Fame for every monster you win over.',
  },
  ispirato: {
    id: 'ispirato',
    name: "Muse's Favor",
    flavor: 'Inspiration never leaves you for long.',
    rule: 'Start each turn with at least 1 Inspiration.',
  },
  'hometown-hero': {
    id: 'hometown-hero',
    name: 'Hometown Hero',
    flavor: 'The songs of home never miss a beat.',
    rule: "Increases the face value of your starting element's dice by 1. Reaching the crit face crits.",
  },
  'studio-regular': {
    id: 'studio-regular',
    name: 'Studio Regular',
    flavor: 'The luthier knows your name, and your tab.',
    rule: 'Upgrades cost 1 less EXP.',
  },
  'inspired-play': {
    id: 'inspired-play',
    name: 'Inspired Play',
    flavor: 'A head full of ideas makes every note ring truer.',
    rule: "With 3+ Inspiration, adds +2 to the value of the song per die. Can't crit.",
  },
  'steady-hands': {
    id: 'steady-hands',
    name: 'Steady Hands',
    flavor: 'No nerves, no fumbled notes.',
    rule: 'Increases the face value of any die below 3 to 3. The raised face can crit.',
  },
  'street-performer': {
    id: 'street-performer',
    name: 'Street Performer',
    flavor: 'Passing the hat between songs.',
    rule: 'Gain 1 EXP at the start of each of your turns.',
  },
  'chain-reaction': {
    id: 'chain-reaction',
    name: 'Chain Reaction',
    flavor: 'One verse sparks the next, and the next.',
    rule: '+2 per same-element song played in a row before this one (max +6).',
  },
  'swarm-singer': {
    id: 'swarm-singer',
    name: 'Swarm Singer',
    flavor: 'The bigger the crowd, the louder the song.',
    rule: '+2 to every die in concerts with 3+ monsters.',
  },
  'jam-session': {
    id: 'jam-session',
    name: 'Jam Session',
    flavor: 'Music is better with friends.',
    rule: '+2 to every die while you share a space with another bard.',
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
    case 'hometown-hero': return t.styleCostHometownHero
    case 'studio-regular': return t.styleCostStudioRegular
    case 'inspired-play': return t.styleCostInspiredPlay
    case 'steady-hands': return t.styleCostSteadyHands
    case 'street-performer': return t.styleCostStreetPerformer
    case 'chain-reaction': return t.styleCostChainReaction
    case 'swarm-singer': return t.styleCostSwarmSinger
    case 'jam-session': return t.styleCostJamSession
  }
}

/** The tunable key holding a style's price ('styleCostHometownHero', …). */
export function styleCostKey(id: StyleId): string {
  return 'styleCost' + id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
}

/** "d12 or d20", "d4 or d8", "any", … for a die-size range given in faces. */
function dieRange(minFaces: number, maxFaces: number): string {
  const dice = (['d4', 'd8', 'd12', 'd20'] as const).filter((d) => {
    const f = Number(d.slice(1))
    return f >= minFaces && f <= maxFaces
  })
  if (dice.length === 4) return 'any'
  if (dice.length === 0) return 'no'
  return dice.length === 1 ? dice[0] : `${dice.slice(0, -1).join(', ')} or ${dice[dice.length - 1]}`
}

/** Live rule text with the current tunable numbers filled in. */
/**
 * Rule wording. Two kinds of bonus, always worded the same way:
 *  - "adds +N to the value of the song": a flat bonus on top of the dice. It never
 *    changes a die's face, so it can't crit or chain with other styles.
 *  - "increases the face value of a die": changes the face itself, so the die can crit
 *    (and combine with other styles that act on the face).
 */
const NO_CRIT = "Can't crit."

export function styleRule(id: StyleId): string {
  const t = getTunables()
  switch (id) {
    case 'fortissimo': return `Increases the face value of every d20 by ${t.fortissimoBonus}. Reaching 20 crits.`
    case 'overture': return `Adds +${t.overtureBonus} to the value of your first song each turn. ${NO_CRIT}`
    case 'tutti': return t.tuttiElements >= 4
      ? `With all four elements in your setlist, adds +${t.tuttiBonus} to the value of the song per die. ${NO_CRIT}`
      : `With ${t.tuttiElements}+ elements in your setlist, adds +${t.tuttiBonus} to the value of the song per die. ${NO_CRIT}`
    case 'ostinato': {
      const lower = 4 - t.ostinatoCritFace
      const by = lower === 1 ? 'one number' : `${lower} numbers`
      const which = t.ostinatoMaxFaces >= 20 ? 'All your dice' : `Your ${dieRange(4, t.ostinatoMaxFaces)} dice`
      const chain = t.ostinatoChainFace < 4
        ? ` Bonus dice keep chaining${t.ostinatoChainFace === 3 ? ' one number lower' : ' on lower numbers'}.`
        : ' Bonus dice still need the top face.'
      const extra = t.ostinatoCascadeBonus ? `. Bonus dice add +${t.ostinatoCascadeBonus}.` : chain
      return `${which} crit ${by} lower.${extra}`
    }
    case 'bravo': return t.bravoMinLevel > 1
      ? `+${t.bravoFamePerTame} Fame for every Lv${t.bravoMinLevel}+ monster you win over.`
      : `+${t.bravoFamePerTame} Fame for every monster you win over.`
    case 'fermata': {
      const pay = t.fermataInspirationCost > 0 ? ` Costs ${t.fermataInspirationCost} Inspiration.` : ''
      return `Once per turn, a ${dieRange(t.fermataMinFaces, 20)} song that doesn't win over its monster isn't spent.${pay}`
    }
    case 'staccato': return t.staccatoMaxFaces >= 20
      ? 'Once per turn, after a song wins over a monster, refresh any spent song.'
      : `Once per turn, after a song wins over a monster, refresh any spent ${dieRange(4, t.staccatoMaxFaces)} song.`
    case 'rubato': {
      const times = t.rubatoUsesPerTurn === 1 ? 'Once' : t.rubatoUsesPerTurn === 2 ? 'Twice' : `${t.rubatoUsesPerTurn} times`
      const which = t.rubatoMaxFaces >= 20 ? 'the die' : `a ${dieRange(4, t.rubatoMaxFaces)} die`
      return `${times} per turn, re-roll ${which} you just rolled and keep the higher result.`
    }
    case 'virtuoso': return `Once per turn, roll your first ${dieRange(t.virtuosoMinFaces, t.virtuosoMaxFaces)} die twice and keep the higher.`
    case 'counterpoint': {
      const m = t.counterpointMultiplier
      const share = m >= 1 ? 'full' : m === 0.75 ? '¾' : m === 0.5 ? 'half' : m === 0.25 ? '¼' : `${Math.round(m * 100)}%`
      return m >= 1
        ? 'Once per turn, a song counts in full against an immune monster.'
        : `Once per turn, a song counts for ${share} against an immune monster instead of nothing.`
    }
    case 'ispirato': {
      if (t.ispiratoPerTurn <= 0) return `Start each turn with at least ${t.ispiratoMin} Inspiration.`
      const gain = `Gain ${t.ispiratoPerTurn} Inspiration at the start of each turn`
      return t.ispiratoMin > t.ispiratoPerTurn ? `${gain} (and start it with at least ${t.ispiratoMin}).` : `${gain}.`
    }
    case 'hometown-hero': return `Increases the face value of your starting element's dice by ${t.hometownHeroBonus}. Reaching the crit face crits.`
    case 'steady-hands': return `Increases the face value of any die below ${t.steadyHandsFloor} to ${t.steadyHandsFloor}. The raised face can crit.`
    case 'street-performer': return `Gain ${t.streetPerformerExp} EXP at the start of each turn.`
    case 'studio-regular': return `Upgrades cost ${t.studioRegularDiscount} less EXP.`
    case 'inspired-play': return `With ${t.inspiredPlayMin}+ Inspiration, adds +${t.inspiredPlayBonus} to the value of the song per die. ${NO_CRIT}`
    case 'chain-reaction': return `Adds +${t.chainReactionBonus} to the value of the song per die, for each same-element song played just before it (max +${t.chainReactionCap}). ${NO_CRIT}`
    case 'swarm-singer': return `In concerts with ${t.swarmSingerMin}+ monsters, adds +${t.swarmSingerBonus} to the value of the song per die. ${NO_CRIT}`
    case 'jam-session': return `While sharing a space with another bard, adds +${t.jamSessionBonus} to the value of the song per die. ${NO_CRIT}`
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
