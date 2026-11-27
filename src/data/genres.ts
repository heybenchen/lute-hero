// KEEP IN SYNC: genres.md (repo root) documents every genre's rule, price, tunables and simulated strength. When you change genre logic, rule text, a price or a genre tunable's default, or add or remove a genre, update genres.md in the same change.
import { GenreId } from '../types/index.js'
import { getTunables } from './tunables.js'

/**
 * Genres (called "genres" in code): Studio purchases that change how ALL of a
 * bard's songs play. A bard holds at most `maxGenres` (default 2). Two are on
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
export interface GenreDef {
  id: GenreId
  /** Player-facing genre name. */
  name: string
  /** A line of flavour shown under the name, about the bard. */
  flavor: string
  /** The rule, as printed on the card (with default numbers; `genreRule` gives the live text). */
  rule: string
}

export const GENRES: Record<GenreId, GenreDef> = {
  gospel: {
    id: 'gospel',
    name: 'Gospel',
    flavor: 'Believe it, sing it, and it comes to pass.',
    rule: "Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh any spent song.",
  },
  'new-age': {
    id: 'new-age',
    name: 'New Age',
    flavor: 'There\'s always room for one more sound.',
    rule: 'Gain a 7th song slot. If you replace this genre, you must pick a song to give up.',
  },
  indie: {
    id: 'indie',
    name: 'Indie',
    flavor: 'Rough edges, big moments.',
    rule: 'All your dice crit one number lower. Does not affect bonus dice.',
  },
  bebop: {
    id: 'bebop',
    name: 'Bebop',
    flavor: 'There are no wrong notes, only the next one.',
    rule: 'Once per turn, re-roll the die you just rolled and keep the higher result.',
  },
  bluegrass: {
    id: 'bluegrass',
    name: 'Bluegrass',
    flavor: 'Faster than the eye, sharper than the ear.',
    rule: 'You may roll your d8 dice twice and keep the higher roll. Does not affect bonus dice.',
  },
  opera: {
    id: 'opera',
    name: 'Opera',
    flavor: 'It isn\'t over until you sing.',
    rule: 'Increase the rolled value of your d20s by 2.',
  },
  blues: {
    id: 'blues',
    name: 'Blues',
    flavor: 'You\'ve lost before. You play on anyway.',
    rule: 'Once per turn, you may refresh a spent d20 song for 1 Inspiration.',
  },
  crossover: {
    id: 'crossover',
    name: 'Crossover',
    flavor: 'Even the deaf-eared ones tap along.',
    rule: 'Once per turn, a song ignores immunity.',
  },
  barbershop: {
    id: 'barbershop',
    name: 'Barbershop',
    flavor: 'Fire, earth, wind and wave, in four-part harmony.',
    rule: 'When you have all four elements in your setlist, add +1 to each song.',
  },
  screamo: {
    id: 'screamo',
    name: 'Screamo',
    flavor: 'Open with a scream; they\'ll remember it.',
    rule: 'Add +3 to your first song each turn.',
  },
  disco: {
    id: 'disco',
    name: 'Disco',
    flavor: 'The bigger the beast, the brighter the mirror ball.',
    rule: 'Gain +10 Fame for every Lv3+ monster you win over.',
  },
  pop: {
    id: 'pop',
    name: 'Pop',
    flavor: 'That hook won\'t leave your head.',
    rule: "Gain 2 Inspiration before each concert.",
  },
  'country': {
    id: 'country',
    name: 'Country',
    flavor: 'The songs of home never miss a beat.',
    rule: 'Increase the rolled value of all dice matching your starting element by 1.',
  },
  'lo-fi': {
    id: 'lo-fi',
    name: 'Lo-fi',
    flavor: 'Borrowed gear, cheap strings, still sounds great.',
    rule: 'Upgrades cost 1 less EXP.',
  },
  'soul': {
    id: 'soul',
    name: 'Soul',
    flavor: 'Play it like you mean it.',
    rule: "If you started this turn with 2+ Inspiration, spend 1 Inspiration to add +2 to every song.",
  },
  'baroque': {
    id: 'baroque',
    name: 'Baroque',
    flavor: 'Practised until it can\'t go wrong.',
    rule: 'Whenever a die roll is less than 3, change its rolled value to 3.',
  },
  'rap': {
    id: 'rap',
    name: 'Rap',
    flavor: 'Every bar pays its keep.',
    rule: 'Gain 2 EXP at the start of each turn.',
  },
  'house': {
    id: 'house',
    name: 'House',
    flavor: 'The beat drops, and drops again.',
    rule: 'Add +2 to each song for each same-element song played just before it. Reduced to +1 in the Final Showdown.',
  },
  'orchestra': {
    id: 'orchestra',
    name: 'Orchestra',
    flavor: 'The bigger the hall, the fuller the sound.',
    rule: 'While there are 3+ monsters remaining, increase the rolled value of all dice by 1.',
  },
  'mariachi': {
    id: 'mariachi',
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
    rule: 'Your 3rd and later songs in a concert add +2.',
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
    flavor: 'Pour everything into one last song, then walk off the stage.',
    rule: 'Declare that this is your last song of the concert: add +8 to it. The concert ends after this song.',
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
    flavor: 'Trade precision for a wall of sound.',
    rule: 'You may roll two d12s in place of your d20s.',
  },
  dubstep: {
    id: 'dubstep',
    name: 'Dubstep',
    flavor: 'The drop hits harder after a stumble.',
    rule: 'Every time a song moves a monster without winning it over, add +1 to your next song.',
  },
  'trip-hop': {
    id: 'trip-hop',
    name: 'Trip-Hop',
    flavor: 'Close your eyes on one stage, open them on another.',
    rule: 'Once per turn, move to any space on the board.',
  },
}

export const ALL_GENRE_IDS = Object.keys(GENRES) as GenreId[]

/** EXP price of a genre, from the live tunables. */
export function genreCost(id: GenreId): number {
  const t = getTunables()
  switch (id) {
    case 'gospel': return t.genreCostGospel
    case 'new-age': return t.genreCostNewAge
    case 'indie': return t.genreCostIndie
    case 'bebop': return t.genreCostBebop
    case 'bluegrass': return t.genreCostBluegrass
    case 'opera': return t.genreCostOpera
    case 'blues': return t.genreCostBlues
    case 'crossover': return t.genreCostCrossover
    case 'barbershop': return t.genreCostBarbershop
    case 'screamo': return t.genreCostScreamo
    case 'disco': return t.genreCostDisco
    case 'pop': return t.genreCostPop
    case 'country': return t.genreCostCountry
    case 'lo-fi': return t.genreCostLoFi
    case 'soul': return t.genreCostSoul
    case 'baroque': return t.genreCostBaroque
    case 'rap': return t.genreCostRap
    case 'house': return t.genreCostHouse
    case 'orchestra': return t.genreCostOrchestra
    case 'mariachi': return t.genreCostMariachi
    case 'punk': return t.genreCostPunk
    case 'soft-rock': return t.genreCostSoftRock
    case 'prog-rock': return t.genreCostProgRock
    case 'ska': return t.genreCostSka
    case 'k-pop': return t.genreCostKPop
    case 'emo': return t.genreCostEmo
    case 'trance': return t.genreCostTrance
    case 'grunge': return t.genreCostGrunge
    case 'dubstep': return t.genreCostDubstep
    case 'trip-hop': return t.genreCostTripHop
  }
}

/** The tunable key holding a genre's price ('genreCostCountry', …). */
export function genreCostKey(id: GenreId): string {
  return 'genreCost' + id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
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
export function genreRule(id: GenreId): string {
  const t = getTunables()
  switch (id) {
    case 'opera': return t.operaRaisesFace
      ? `Increase the rolled value of your d20s by ${t.operaBonus}.`
      : `Add +${t.operaBonus} to every d20 song.`
    case 'screamo': return `Add +${t.screamoBonus} to your first song each turn.`
    case 'barbershop': return t.barbershopElements >= 4
      ? `When you have all four elements in your setlist, add +${t.barbershopBonus} to each song.`
      : `When you have ${t.barbershopElements}+ elements in your setlist, add +${t.barbershopBonus} to each song.`
    case 'indie': {
      const lower = 4 - t.indieCritFace
      const by = lower === 1 ? 'one number' : `${lower} numbers`
      const which = t.indieMaxFaces >= 20 ? 'All your dice' : `Your ${dieRange(4, t.indieMaxFaces)} dice`
      const chain = t.indieChainFace < 4
        ? ` Bonus dice keep chaining${t.indieChainFace === 3 ? ' one number lower' : ' on lower numbers'}.`
        : ' Does not affect bonus dice.'
      const extra = t.indieCascadeBonus ? `. Bonus dice add +${t.indieCascadeBonus}.` : chain
      return `${which} crit ${by} lower.${extra}`
    }
    case 'disco': return t.discoMinLevel > 1
      ? `Gain +${t.discoFamePerTame} Fame for every Lv${t.discoMinLevel}+ monster you win over.`
      : `Gain +${t.discoFamePerTame} Fame for every monster you win over.`
    case 'blues': {
      const pay = t.bluesInspirationCost > 0 ? ` for ${t.bluesInspirationCost} Inspiration` : ''
      return `Once per turn, you may refresh a spent ${dieRange(t.bluesMinFaces, 20)} song${pay}.`
    }
    case 'gospel': {
      const which = t.gospelMaxFaces >= 20 ? 'any spent song' : `a spent ${diceIn(4, t.gospelMaxFaces).join('/')}`
      return `Once per turn before rolling, declare that the next roll will win over a monster. If you're right, refresh ${which}.`
    }
    case 'bebop': {
      const times = t.bebopUsesPerTurn === 1 ? 'Once' : t.bebopUsesPerTurn === 2 ? 'Twice' : `${t.bebopUsesPerTurn} times`
      const which = t.bebopMaxFaces >= 20 ? 'the die' : `a ${dieRange(4, t.bebopMaxFaces)} die`
      return `${times} per turn, re-roll ${which} you just rolled and keep the higher result.`
    }
    case 'bluegrass': return `You may roll your ${diceAnd(t.bluegrassMinFaces, t.bluegrassMaxFaces)} dice twice and keep the higher roll. Does not affect bonus dice.`
    case 'crossover': {
      const m = t.crossoverMultiplier
      const share = m === 0.75 ? '¾' : m === 0.5 ? 'half' : m === 0.25 ? '¼' : `${Math.round(m * 100)}%`
      return m >= 1
        ? 'Once per turn, a song ignores immunity.'
        : `Once per turn, a song counts for ${share} against an immune monster instead of nothing.`
    }
    case 'pop': {
      const gain = `Gain ${t.popPerTurn} Inspiration before each concert`
      return t.popMin > t.popPerTurn ? `${gain} (and start it with at least ${t.popMin}).` : `${gain}.`
    }
    case 'country': return `Increase the rolled value of all dice matching your starting element by ${t.countryBonus}.`
    case 'baroque': return `Whenever a die roll is less than ${t.baroqueFloor}, change its rolled value to ${t.baroqueFloor}.`
    case 'rap': return `Gain ${t.rapExp} EXP at the start of each turn.`
    case 'lo-fi': return `Upgrades cost ${t.loFiDiscount} less EXP.`
    case 'soul': return `If you started this turn with ${t.soulMin}+ Inspiration, spend ${t.soulCost} Inspiration to add +${t.soulBonus} to every song.`
    case 'house': {
      const cap = t.houseCap > 0 ? ` (max +${t.houseCap})` : ''
      const showdown = t.houseShowdownBonus !== t.houseBonus
        ? ` Reduced to +${t.houseShowdownBonus} in the Final Showdown.`
        : ''
      return `Add +${t.houseBonus} to each song for each same-element song played just before it${cap}.${showdown}`
    }
    case 'orchestra': return `While there are ${t.orchestraMin}+ monsters remaining, increase the rolled value of all dice by ${t.orchestraBonus}.`
    case 'mariachi': return `While sharing a space with another bard, add +${t.mariachiBonus} to each song.`
    case 'punk': return `Whenever you crit, add +${t.punkBonus} to the song.`
    case 'soft-rock': return `Increase the rolled value of your d8s and d12s by ${t.softRockBonus}.`
    case 'prog-rock': return `Your ${ordinal(t.progRockFrom)} and later songs in a concert add +${t.progRockBonus}.`
    case 'ska': return `Whenever you roll an odd number, add +${t.skaBonus} to the song.`
    case 'k-pop': return `Gain +${t.kPopFame3} Fame for winning over 3 monsters or +${t.kPopFame4} Fame for winning 4 monsters in one concert.`
    case 'emo': return `Declare that this is your last song of the concert: add +${t.emoBonus} to it. The concert ends after this song.`
    case 'trance': return `While you have 0 Inspiration, add +${t.tranceBonus} to each song.`
    case 'grunge': return 'You may roll two d12s in place of your d20s.'
    case 'dubstep': return `Every time a song moves a monster without winning it over, add +${t.dubstepBonus} to your next song.`
    case 'trip-hop': return 'Once per turn, move to any space on the board.'
    default: return GENRES[id].rule
  }
}

export const maxGenres = () => getTunables().maxGenres
export const genreOfferCount = () => getTunables().genreOfferCount

/** Draw `count` distinct genres at random, skipping any in `exclude`. */
export function drawGenreOffers(count: number, exclude: GenreId[], rng: () => number): GenreId[] {
  const pool = ALL_GENRE_IDS.filter((id) => !exclude.includes(id))
  const offers: GenreId[] = []
  while (offers.length < count && pool.length > 0) {
    offers.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return offers
}
