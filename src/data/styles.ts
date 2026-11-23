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
    rule: 'Once per turn, you may re-roll the die you just rolled and keep the higher value.',
  },
  virtuoso: {
    id: 'virtuoso',
    name: "Master's Touch",
    flavor: 'Years of practice, poured into one great chord.',
    rule: 'Once per turn, your first roll of a d12 or smaller die is rolled twice; keep the higher.',
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
    rule: 'Once per turn, a roll against an immune target deals full damage.',
  },
  tutti: {
    id: 'tutti',
    name: 'Harmony',
    flavor: 'Fire, earth, wind and wave, singing as one.',
    rule: 'If your setlist holds all four elements, +4 to your first roll each turn (can\'t crit).',
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
  'hometown-hero': {
    id: 'hometown-hero',
    name: 'Hometown Hero',
    flavor: 'The songs of home never miss a beat.',
    rule: 'Dice of your starting element get +1 (can crit).',
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
    rule: '+2 to every die while you hold 3+ Inspiration.',
  },
  'steady-hands': {
    id: 'steady-hands',
    name: 'Steady Hands',
    flavor: 'No nerves, no fumbled notes.',
    rule: 'A die that lands below 3 counts as showing 3.',
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
    rule: '+2 to every die in fights with 3+ monsters.',
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
/** Why a flat bonus can't crit: it changes the roll's value, not the die's face. */
const NO_CRIT = "It changes the roll, not the die's face, so it can't crit."

export function styleRule(id: StyleId): string {
  const t = getTunables()
  switch (id) {
    case 'fortissimo': return `Adds +${t.fortissimoBonus} to the value of every d20 roll; a roll that reaches 20 this way crits.`
    case 'overture': return `Adds +${t.overtureBonus} to the value of your first roll each turn. ${NO_CRIT}`
    case 'tutti': return t.tuttiElements >= 4
      ? `If your setlist holds all four elements, adds +${t.tuttiBonus} to the value of every die you roll. ${NO_CRIT}`
      : `If your setlist holds at least ${t.tuttiElements} elements, adds +${t.tuttiBonus} to the value of every die you roll. ${NO_CRIT}`
    case 'ostinato': {
      const lower = 4 - t.ostinatoCritFace
      const by = lower === 1 ? 'one number' : `${lower} numbers`
      const which = t.ostinatoMaxFaces >= 20 ? 'All your dice' : `Your ${dieRange(4, t.ostinatoMaxFaces)} dice`
      const chain = t.ostinatoChainFace < 4
        ? ` (bonus dice keep chaining${t.ostinatoChainFace === 3 ? ' one number lower' : ' on lower numbers'})`
        : ' (bonus dice still need the top face)'
      const extra = t.ostinatoCascadeBonus ? `; their bonus dice add +${t.ostinatoCascadeBonus}` : chain
      return `${which} crit ${by} lower${extra}.`
    }
    case 'bravo': return t.bravoMinLevel > 1
      ? `+${t.bravoFamePerTame} Fame for every Lv${t.bravoMinLevel}+ monster you tame.`
      : `+${t.bravoFamePerTame} Fame for every monster you tame.`
    case 'fermata': {
      const pay = t.fermataInspirationCost > 0 ? `, for ${t.fermataInspirationCost} Inspiration` : ''
      return `Once per turn, a ${dieRange(t.fermataMinFaces, 20)} song that doesn't tame its target isn't spent${pay}.`
    }
    case 'staccato': return t.staccatoMaxFaces >= 20
      ? 'Once per turn, after one of your songs tames a monster, refresh a spent song of your choice.'
      : `Once per turn, after one of your songs tames a monster, refresh a spent ${dieRange(4, t.staccatoMaxFaces)} song of your choice.`
    case 'rubato': {
      const times = t.rubatoUsesPerTurn === 1 ? 'Once' : t.rubatoUsesPerTurn === 2 ? 'Twice' : `${t.rubatoUsesPerTurn} times`
      const which = t.rubatoMaxFaces >= 20 ? 'the die' : `a ${dieRange(4, t.rubatoMaxFaces)} die`
      return `${times} per turn, you may re-roll ${which} you just rolled and keep the higher value.`
    }
    case 'virtuoso': return `Once per turn, your first roll of a ${dieRange(t.virtuosoMinFaces, t.virtuosoMaxFaces)} die is rolled twice; keep the higher.`
    case 'counterpoint': {
      const m = t.counterpointMultiplier
      const share = m >= 1 ? 'full' : m === 0.75 ? '¾' : m === 0.5 ? 'half' : m === 0.25 ? '¼' : `${Math.round(m * 100)}%`
      return m >= 1
        ? 'Once per turn, a roll against an immune target deals full damage.'
        : `Once per turn, a roll against an immune target deals ${share} damage instead of none.`
    }
    case 'ispirato': {
      if (t.ispiratoPerTurn <= 0) return `Start each turn with at least ${t.ispiratoMin} Inspiration.`
      const gain = `Gain ${t.ispiratoPerTurn} Inspiration at the start of each turn`
      return t.ispiratoMin > t.ispiratoPerTurn ? `${gain} (and start it with at least ${t.ispiratoMin}).` : `${gain}.`
    }
    case 'hometown-hero': return `Adds +${t.hometownHeroBonus} to the value of dice of your starting element; a roll boosted to its crit face crits.`
    case 'steady-hands': return `A die that lands below ${t.steadyHandsFloor} counts as showing ${t.steadyHandsFloor}.`
    case 'street-performer': return `Gain ${t.streetPerformerExp} EXP at the start of each of your turns.`
    case 'studio-regular': return `Upgrades cost ${t.studioRegularDiscount} less EXP.`
    case 'inspired-play': return `While you hold ${t.inspiredPlayMin}+ Inspiration, adds +${t.inspiredPlayBonus} to the value of every roll. ${NO_CRIT}`
    case 'chain-reaction': return `Adds +${t.chainReactionBonus} to a roll's value for each same-element song played in a row before it (max +${t.chainReactionCap}). ${NO_CRIT}`
    case 'swarm-singer': return `In fights with ${t.swarmSingerMin}+ monsters, adds +${t.swarmSingerBonus} to the value of every roll. ${NO_CRIT}`
    case 'jam-session': return `While you share a space with another bard, adds +${t.jamSessionBonus} to the value of every roll. ${NO_CRIT}`
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
