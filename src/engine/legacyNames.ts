/**
 * Saves, playtest presets and online games written before the rename used the
 * old code names: dice and board chips were "genres" (`die.genre`,
 * `space.genreTags`, `starterGenre`), Studio purchases were "styles"
 * (`player.styles`, `styleOffers`, `BUY_STYLE`) and each genre had an Italian
 * id (`fortissimo` for Opera, `coda` for New Age, ...). `migrateLegacyNames`
 * rewrites such a state to the current names: elements are `element`, Studio
 * purchases are `genres`, and genre ids are the genre's own name.
 *
 * It only runs on a state that still has an old marker, so a current state
 * (where `genres` means Studio genres) is never touched.
 */

/** Old genre ids (keys and values) → current ids. */
export const LEGACY_GENRE_IDS: Record<string, string> = {
  staccato: 'gospel',
  coda: 'new-age',
  ostinato: 'indie',
  rubato: 'bebop',
  virtuoso: 'bluegrass',
  fortissimo: 'opera',
  fermata: 'blues',
  counterpoint: 'crossover',
  tutti: 'barbershop',
  overture: 'screamo',
  bravo: 'disco',
  ispirato: 'pop',
  'hometown-hero': 'country',
  'studio-regular': 'lo-fi',
  'inspired-play': 'soul',
  'steady-hands': 'baroque',
  'street-performer': 'rap',
  'chain-reaction': 'house',
  'swarm-singer': 'orchestra',
  'jam-session': 'mariachi',
}

/** The same ids as they appear inside camelCase field names (`fortissimoBonus`, `styleCostHometownHero`). */
const CAMEL_IDS: [string, string][] = [
  ['staccato', 'gospel'], ['coda', 'newAge'], ['ostinato', 'indie'], ['rubato', 'bebop'],
  ['virtuoso', 'bluegrass'], ['fortissimo', 'opera'], ['fermata', 'blues'], ['counterpoint', 'crossover'],
  ['tutti', 'barbershop'], ['overture', 'screamo'], ['bravo', 'disco'], ['ispirato', 'pop'],
  ['hometownHero', 'country'], ['studioRegular', 'loFi'], ['inspiredPlay', 'soul'], ['steadyHands', 'baroque'],
  ['streetPerformer', 'rap'], ['chainReaction', 'house'], ['swarmSinger', 'orchestra'], ['jamSession', 'mariachi'],
]
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const CAMEL_RULES: [RegExp, string][] = CAMEL_IDS.flatMap(([o, n]) => [
  [new RegExp(`^${o}(?=[A-Z0-9_]|$)`), n] as [RegExp, string],
  [new RegExp(`(?<=[a-z0-9])${cap(o)}(?=[A-Z0-9_]|$)`), cap(n)] as [RegExp, string],
])

/** An old field name → its current name (`genreTags` → `elementTags`, `styleOffers` → `genreOffers`, `fortissimoBonus` → `operaBonus`). */
export function legacyFieldName(name: string): string {
  if (/genre/i.test(name)) {
    return name.replace(/GENRE/g, 'ELEMENT').replace(/Genre/g, 'Element').replace(/genre/g, 'element')
  }
  let n = name.replace(/Styled/g, 'Genre').replace(/STYLE/g, 'GENRE').replace(/Style/g, 'Genre').replace(/style/g, 'genre')
  for (const [re, to] of CAMEL_RULES) n = n.replace(re, to)
  return n
}

const LEGACY_VALUES: Record<string, string> = {
  ...LEGACY_GENRE_IDS,
  BUY_STYLE: 'BUY_GENRE',
  REFRESH_STYLE_OFFERS: 'REFRESH_GENRE_OFFERS',
}

function migrateValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (Object.prototype.hasOwnProperty.call(LEGACY_VALUES, value)) return LEGACY_VALUES[value]
    // New Age's extra song is `<playerId>-coda` in old saves
    if (value.endsWith('-coda')) return `${value.slice(0, -'-coda'.length)}-new-age`
    return value
  }
  if (Array.isArray(value)) return value.map(migrateValue)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const newKey = Object.prototype.hasOwnProperty.call(LEGACY_GENRE_IDS, key) ? LEGACY_GENRE_IDS[key] : legacyFieldName(key)
      out[newKey] = migrateValue(v)
    }
    return out
  }
  return value
}

/** Whether this state was saved before the rename. */
export function hasLegacyNames(state: unknown): boolean {
  if (!state || typeof state !== 'object') return false
  const s = state as Record<string, unknown>
  if ('styleOffers' in s) return true
  const players = Array.isArray(s.players) ? (s.players as Record<string, unknown>[]) : []
  return players.some((p) => p && typeof p === 'object' && ('styles' in p || 'starterGenre' in p))
}

/** Rewrite a pre-rename state to the current names (a no-op for a current state). */
export function migrateLegacyNames<T>(state: T): T {
  return hasLegacyNames(state) ? (migrateValue(state) as T) : state
}
