// KEEP IN SYNC: songStyles.md (repo root) documents every genre's rule, price, tunables and simulated strength. When you change genre logic, rule text, a price or a genre tunable's default, or add or remove a genre, update songStyles.md in the same change.
import { StyleId } from '../types/index.js'
import { getTunables } from './tunables.js'

/**
 * Genres (called "styles" in code): Studio purchases that change how ALL of a
 * bard's songs play. A bard holds at most `maxStyles` (default 2). Two are on
 * offer at a time, kept between turns with empty slots refilled; Inspiration
 * redraws them on demand.
 *
 * Every rule is one sentence with a single trigger and no running totals.
 * "Once per turn" effects fire automatically the first time they apply, except
 * the ones the bard chooses: Bebop (a free encore), Blues (refresh a d20),
 * Gospel (call a win), Soul (pay for a bonus) and Trip-Hop (move anywhere).
 *
 * The ids are the original working names (musical terms, then kebab-case lab
 * names) and stay fixed so saved games keep their genres; players only ever
 * see `name`.
 */
export interface StyleDef {
  id: StyleId
  /** Player-facing genre name. */
  name: string
  /** A line of flavour shown under the name, about the bard. */
  flavor: string
  /** The rule, as printed on the card (with default numbers; `styleRule` gives the live text). */
  rule: string
}

export const STYLES: Record<StyleId, StyleDef> = {
  staccato: {
    id: 'staccato',
    name: 'Gospel',
    flavor: 'Believe it, sing it, and it comes to pass.',
    rule: "Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh any spent song.",
  },
  coda: {
    id: 'coda',
    name: 'New Age',
    flavor: 'There\'s always room for one more sound.',
    rule: 'Gain a 7th song slot. If you replace this genre, you must pick a song to give up.',
  },
  ostinato: {
    id: 'ostinato',
    name: 'Indie',
    flavor: 'Rough edges, big moments.',
    rule: 'All your dice crit one number lower. Does not affect bonus dice.',
  },
  rubato: {
    id: 'rubato',
    name: 'Bebop',
    flavor: 'There are no wrong notes, only the next one.',
    rule: 'Once per turn, re-roll the die you just rolled and keep the higher result.',
  },
  virtuoso: {
    id: 'virtuoso',
    name: 'Bluegrass',
    flavor: 'Faster than the eye, sharper than the ear.',
    rule: 'You may roll your d8 dice twice and keep the higher roll. Does not affect bonus dice.',
  },
  fortissimo: {
    id: 'fortissimo',
    name: 'Opera',
    flavor: 'It isn\'t over until you sing.',
    rule: 'Add +2 to every d20 song.',
  },
  fermata: {
    id: 'fermata',
    name: 'Blues',
    flavor: 'You\'ve lost before. You play on anyway.',
    rule: 'Once per turn, you may refresh a spent d20 song for 1 Inspiration.',
  },
  counterpoint: {
    id: 'counterpoint',
    name: 'Crossover',
    flavor: 'Even the deaf-eared ones tap along.',
    rule: 'Once per turn, a song ignores immunity.',
  },
  tutti: {
    id: 'tutti',
    name: 'Barbershop',
    flavor: 'Fire, earth, wind and wave, in four-part harmony.',
    rule: 'When you have all four elements in your setlist, add +1 to each song.',
  },
  overture: {
    id: 'overture',
    name: 'Screamo',
    flavor: 'Open with a scream; they\'ll remember it.',
    rule: 'Add +3 to your first song each turn.',
  },
  bravo: {
    id: 'bravo',
    name: 'Disco',
    flavor: 'The bigger the beast, the brighter the mirror ball.',
    rule: 'Gain +10 Fame for every Lv3+ monster you win over.',
  },
  ispirato: {
    id: 'ispirato',
    name: 'Pop',
    flavor: 'That hook won\'t leave your head.',
    rule: "Gain 2 Inspiration before each concert.",
  },
  'hometown-hero': {
    id: 'hometown-hero',
    name: 'Country',
    flavor: 'The songs of home never miss a beat.',
    rule: 'Increase the rolled value of all dice matching your starting element by 1.',
  },
  'studio-regular': {
    id: 'studio-regular',
    name: 'Lo-fi',
    flavor: 'Borrowed gear, cheap strings, still sounds great.',
    rule: 'Upgrades cost 1 less EXP.',
  },
  'inspired-play': {
    id: 'inspired-play',
    name: 'Soul',
    flavor: 'Play it like you mean it.',
    rule: "If you started this turn with 2+ Inspiration, spend 1 Inspiration to add +2 to every song.",
  },
  'steady-hands': {
    id: 'steady-hands',
    name: 'Baroque',
    flavor: 'Practised until it can\'t go wrong.',
    rule: 'Whenever a die roll is 3 or less, increase its rolled value by 1. Does not affect bonus dice.',
  },
  'street-performer': {
    id: 'street-performer',
    name: 'Rap',
    flavor: 'Every bar pays its keep.',
    rule: 'Gain 2 EXP at the start of each turn.',
  },
  'chain-reaction': {
    id: 'chain-reaction',
    name: 'House',
    flavor: 'The beat drops, and drops again.',
    rule: 'Add +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown.',
  },
  'swarm-singer': {
    id: 'swarm-singer',
    name: 'Orchestra',
    flavor: 'The bigger the hall, the fuller the sound.',
    rule: 'While there are 3+ monsters remaining, increase the rolled value of all dice by 1.',
  },
  'jam-session': {
    id: 'jam-session',
    name: 'Mariachi',
    flavor: 'Nobody plays mariachi alone.',
    rule: 'While sharing a space with another bard, add +2 to each song.',
  },
  punk: {
    id: 'punk',
    name: 'Punk',
    flavor: 'Three chords and no apologies.',
    rule: 'Whenever you crit, add +4 to the song.',
  },
  'soft-rock': {
    id: 'soft-rock',
    name: 'Soft Rock',
    flavor: 'Middle of the road, right where most songs live.',
    rule: 'Increase the rolled value of your d8s and d12s by 1.',
  },
  'prog-rock': {
    id: 'prog-rock',
    name: 'Prog Rock',
    flavor: 'Side two is one song. So is side three.',
    rule: 'Your 4th and later songs in a concert add +2.',
  },
  ska: {
    id: 'ska',
    name: 'Ska',
    flavor: 'Every other beat is the one that counts.',
    rule: 'Whenever you roll an odd number, add +1 to the song.',
  },
  'k-pop': {
    id: 'k-pop',
    name: 'K-Pop',
    flavor: 'Every fan counts, even the ones still deciding.',
    rule: "Gain +15 Fame for winning over 3 monsters or +25 Fame for winning 4 monsters in one concert.",
  },
  emo: {
    id: 'emo',
    name: 'Emo',
    flavor: 'Every song you lose makes the next one hurt more.',
    rule: "When you're down to your last song, double its value.",
  },
  trance: {
    id: 'trance',
    name: 'Trance',
    flavor: 'Nothing left in the tank, nothing held back.',
    rule: "While you have 0 Inspiration, add +3 to each song.",
  },
  grunge: {
    id: 'grunge',
    name: 'Grunge',
    flavor: 'Ugly, loud, and better after a stumble.',
    rule: 'Every time a song moves a monster without winning it over, add +1 to your next song.',
  },
  dubstep: {
    id: 'dubstep',
    name: 'Dubstep',
    flavor: 'Wait for it. Wait for it.',
    rule: "Once per turn, after winning over a monster, your next song rolls twice and keeps the higher, then adds +3.",
  },
  'trip-hop': {
    id: 'trip-hop',
    name: 'Trip-Hop',
    flavor: 'Close your eyes on one stage, open them on another.',
    rule: 'Once per turn, move to any space on the board.',
  },
}

export const ALL_STYLE_IDS = Object.keys(STYLES) as StyleId[]

/** EXP price of a genre, from the live tunables. */
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
    case 'punk': return t.styleCostPunk
    case 'soft-rock': return t.styleCostSoftRock
    case 'prog-rock': return t.styleCostProgRock
    case 'ska': return t.styleCostSka
    case 'k-pop': return t.styleCostKPop
    case 'emo': return t.styleCostEmo
    case 'trance': return t.styleCostTrance
    case 'grunge': return t.styleCostGrunge
    case 'dubstep': return t.styleCostDubstep
    case 'trip-hop': return t.styleCostTripHop
  }
}

/** The tunable key holding a genre's price ('styleCostHometownHero', …). */
export function styleCostKey(id: StyleId): string {
  return 'styleCost' + id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
}

/** The dice in a size range given in faces: ['d4', 'd8'], … */
function diceIn(minFaces: number, maxFaces: number): string[] {
  return ['d4', 'd8', 'd12', 'd20'].filter((d) => {
    const f = Number(d.slice(1))
    return f >= minFaces && f <= maxFaces
  })
}

/** "d12 or d20", "d4 or d8", "any", … for a die-size range given in faces. */
function dieRange(minFaces: number, maxFaces: number): string {
  const dice = diceIn(minFaces, maxFaces)
  if (dice.length === 4) return 'any'
  if (dice.length === 0) return 'no'
  return dice.length === 1 ? dice[0] : `${dice.slice(0, -1).join(', ')} or ${dice[dice.length - 1]}`
}

/** "d4 and d8", "d4, d8 and d12", … */
function diceAnd(minFaces: number, maxFaces: number): string {
  const dice = diceIn(minFaces, maxFaces)
  return dice.length <= 1 ? dice.join('') : `${dice.slice(0, -1).join(', ')} and ${dice[dice.length - 1]}`
}

/** "4th", "2nd", … */
function ordinal(n: number): string {
  const tens = n % 100
  if (tens >= 11 && tens <= 13) return `${n}th`
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`
}

/**
 * Live rule text with the current tunable numbers filled in. Two kinds of bonus,
 * always worded the same way:
 *  - "add +N to the song" (or "to each song"): a flat bonus on top of the roll.
 *    It never changes a die's face, so it can't crit or chain with other genres.
 *  - "increase the rolled value": changes the face itself, so the die can crit
 *    (and combine with other genres that act on the face).
 */
export function styleRule(id: StyleId): string {
  const t = getTunables()
  switch (id) {
    case 'fortissimo': return `Add +${t.fortissimoBonus} to every d20 song.`
    case 'overture': return `Add +${t.overtureBonus} to your first song each turn.`
    case 'tutti': return t.tuttiElements >= 4
      ? `When you have all four elements in your setlist, add +${t.tuttiBonus} to each song.`
      : `When you have ${t.tuttiElements}+ elements in your setlist, add +${t.tuttiBonus} to each song.`
    case 'ostinato': {
      const lower = 4 - t.ostinatoCritFace
      const by = lower === 1 ? 'one number' : `${lower} numbers`
      const which = t.ostinatoMaxFaces >= 20 ? 'All your dice' : `Your ${dieRange(4, t.ostinatoMaxFaces)} dice`
      const chain = t.ostinatoChainFace < 4
        ? ` Bonus dice keep chaining${t.ostinatoChainFace === 3 ? ' one number lower' : ' on lower numbers'}.`
        : ' Does not affect bonus dice.'
      const extra = t.ostinatoCascadeBonus ? `. Bonus dice add +${t.ostinatoCascadeBonus}.` : chain
      return `${which} crit ${by} lower.${extra}`
    }
    case 'bravo': return t.bravoMinLevel > 1
      ? `Gain +${t.bravoFamePerTame} Fame for every Lv${t.bravoMinLevel}+ monster you win over.`
      : `Gain +${t.bravoFamePerTame} Fame for every monster you win over.`
    case 'fermata': {
      const pay = t.fermataInspirationCost > 0 ? ` for ${t.fermataInspirationCost} Inspiration` : ''
      return `Once per turn, you may refresh a spent ${dieRange(t.fermataMinFaces, 20)} song${pay}.`
    }
    case 'staccato': {
      const which = t.staccatoMaxFaces >= 20 ? 'any spent song' : `a spent ${diceIn(4, t.staccatoMaxFaces).join('/')}`
      return `Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh ${which}.`
    }
    case 'rubato': {
      const times = t.rubatoUsesPerTurn === 1 ? 'Once' : t.rubatoUsesPerTurn === 2 ? 'Twice' : `${t.rubatoUsesPerTurn} times`
      const which = t.rubatoMaxFaces >= 20 ? 'the die' : `a ${dieRange(4, t.rubatoMaxFaces)} die`
      return `${times} per turn, re-roll ${which} you just rolled and keep the higher result.`
    }
    case 'virtuoso': return `You may roll your ${diceAnd(t.virtuosoMinFaces, t.virtuosoMaxFaces)} dice twice and keep the higher roll. Does not affect bonus dice.`
    case 'counterpoint': {
      const m = t.counterpointMultiplier
      const share = m === 0.75 ? '¾' : m === 0.5 ? 'half' : m === 0.25 ? '¼' : `${Math.round(m * 100)}%`
      return m >= 1
        ? 'Once per turn, a song ignores immunity.'
        : `Once per turn, a song counts for ${share} against an immune monster instead of nothing.`
    }
    case 'ispirato': {
      const gain = `Gain ${t.ispiratoPerTurn} Inspiration before each concert`
      return t.ispiratoMin > t.ispiratoPerTurn ? `${gain} (and start it with at least ${t.ispiratoMin}).` : `${gain}.`
    }
    case 'hometown-hero': return `Increase the rolled value of all dice matching your starting element by ${t.hometownHeroBonus}.`
    case 'steady-hands': return `Whenever a die roll is ${t.steadyHandsAtMost} or less, increase its rolled value by ${t.steadyHandsBonus}. Does not affect bonus dice.`
    case 'street-performer': return `Gain ${t.streetPerformerExp} EXP at the start of each turn.`
    case 'studio-regular': return `Upgrades cost ${t.studioRegularDiscount} less EXP.`
    case 'inspired-play': return `If you started this turn with ${t.inspiredPlayMin}+ Inspiration, spend ${t.inspiredPlayCost} Inspiration to add +${t.inspiredPlayBonus} to every song.`
    case 'chain-reaction': {
      const cap = t.chainReactionCap > 0 ? ` (max +${t.chainReactionCap})` : ''
      const showdown = t.chainReactionShowdownBonus !== t.chainReactionBonus
        ? ` Reduced to +${t.chainReactionShowdownBonus} in the Final Showdown.`
        : ''
      return `Add +${t.chainReactionBonus} to each song for each same-element song played just before it${cap}.${showdown}`
    }
    case 'swarm-singer': return `While there are ${t.swarmSingerMin}+ monsters remaining, increase the rolled value of all dice by ${t.swarmSingerBonus}.`
    case 'jam-session': return `While sharing a space with another bard, add +${t.jamSessionBonus} to each song.`
    case 'punk': return `Whenever you crit, add +${t.punkBonus} to the song.`
    case 'soft-rock': return `Increase the rolled value of your d8s and d12s by ${t.softRockBonus}.`
    case 'prog-rock': return `Your ${ordinal(t.progRockFrom)} and later songs in a concert add +${t.progRockBonus}.`
    case 'ska': return `Whenever you roll an odd number, add +${t.skaBonus} to the song.`
    case 'k-pop': return `Gain +${t.kPopFame3} Fame for winning over 3 monsters or +${t.kPopFame4} Fame for winning 4 monsters in one concert.`
    case 'emo': {
      const what = [
        t.emoMultiplier === 2 ? 'double its value' : t.emoMultiplier !== 1 ? `multiply its value by ${t.emoMultiplier}` : '',
        t.emoBonus ? `add +${t.emoBonus}` : '',
      ].filter(Boolean).join(' and ')
      return t.emoSongsLeft <= 1
        ? `When you're down to your last song, ${what}.`
        : `When you're down to your last ${t.emoSongsLeft} songs, ${what.replace('its value', 'their value')} for each.`
    }
    case 'trance': return `While you have 0 Inspiration, add +${t.tranceBonus} to each song.`
    case 'grunge': return `Every time a song moves a monster without winning it over, add +${t.grungeBonus} to your next song.`
    case 'dubstep': {
      const parts = [
        t.dubstepAdvantage ? 'rolls twice and keeps the higher' : '',
        t.dubstepBonus ? `adds +${t.dubstepBonus}` : '',
        t.dubstepMultiplier === 2 ? 'counts double' : t.dubstepMultiplier !== 1 ? `counts ×${t.dubstepMultiplier}` : '',
      ].filter(Boolean)
      const what = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, then ${parts[parts.length - 1]}` : parts[0] ?? 'is unchanged'
      return `${t.dubstepOncePerTurn ? 'Once per turn, after' : 'After'} winning over a monster, your next song ${what}.`
    }
    case 'trip-hop': return 'Once per turn, move to any space on the board.'
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
