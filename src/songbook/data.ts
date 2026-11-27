/**
 * Songbook data: everything the /songbook page shows about each genre.
 *
 * Names, flavour, rules, prices and the setting values are read live from the
 * game's own genre code (src/data/genres.ts and the default tunables), so they
 * cannot drift from the game. Only the facts below are stored here: which group
 * a genre belongs to, how it triggers, the price it had before the latest
 * rebalance, which settings shape it, and its simulated win rate.
 *
 * KEEP IN SYNC: genres.md (repo root) documents the same win rates and
 * prices. When you re-run the genre audit or change a genre, update the win
 * rates and `was` prices here and in genres.md in the same change.
 */
import type { GenreId } from '../types/index.js'
import { ALL_GENRE_IDS, GENRES, genreCost, genreCostKey, genreRule } from '../data/genres.js'
import { DEFAULT_TUNABLES, TUNABLE_FIELDS, withTunables } from '../data/tunables.js'

export type GenreGroup = 'original' | 'lab' | 'new'
export type GenreTiming = 'always' | 'once-per-turn' | 'button'

export const GROUP_LABEL: Record<GenreGroup, string> = {
  original: 'Original',
  lab: 'From the lab',
  new: 'New',
}

export const TIMING_LABEL: Record<GenreTiming, string> = {
  always: 'Always on',
  'once-per-turn': 'Once per turn',
  button: 'You press it',
}

interface GenreMeta {
  group: GenreGroup
  timing: GenreTiming
  /** Price (EXP) before the latest rebalance. */
  was: number
  /** Simulated win % of a bard who buys this genre in round 5 (parity is 33.3%). */
  win: number
  /** Tunable keys that shape the genre, shown with their default values. */
  tunables: string[]
  /** Anything the one-line rule leaves out. */
  note?: string
}

/** The no-genre baseline in the same simulation (everyone shopping for genres). */
export const BASELINE_WIN = 32.8
/** A third of games, the fair share at a three-bard table. */
export const PARITY = 33.3
/** Games per genre in the latest audit. */
export const AUDIT_GAMES = 600

export const GENRE_META: Record<GenreId, GenreMeta> = {
  gospel: {
    group: 'original', timing: 'button', was: 2, win: 27.1, tunables: ['gospelMaxFaces'],
    note: 'Tick "Call it" before you play a song. If that song wins its monster over, choose a spent song to refresh. The call is used up either way.',
  },
  'new-age': {
    group: 'original', timing: 'always', was: 1, win: 28.1, tunables: [],
    note: 'Replacing it while the 7th song holds a die means choosing a song to give up: its die is lost, and the 7th song\'s die takes its place.',
  },
  indie: {
    group: 'original', timing: 'always', was: 2, win: 34.3,
    tunables: ['indieCritFace', 'indieMaxFaces', 'indieCascadeBonus', 'indieChainFace'],
  },
  bebop: {
    group: 'original', timing: 'button', was: 1, win: 32.9, tunables: ['bebopMaxFaces', 'bebopUsesPerTurn'],
    note: 'A free encore button, never costs Inspiration. If the new roll is lower, your first roll stands (the use is still spent).',
  },
  bluegrass: { group: 'original', timing: 'always', was: 2, win: 39.3, tunables: ['bluegrassMinFaces', 'bluegrassMaxFaces'] },
  opera: { group: 'original', timing: 'always', was: 2, win: 30.4, tunables: ['operaBonus', 'operaRaisesFace'] },
  blues: {
    group: 'original', timing: 'button', was: 3, win: 31.5, tunables: ['bluesMinFaces', 'bluesInspirationCost'],
    note: 'A button on a spent d20 song during a concert. Songs refresh at the start of every concert anyway.',
  },
  crossover: { group: 'original', timing: 'once-per-turn', was: 2, win: 31.8, tunables: ['crossoverMultiplier'] },
  barbershop: { group: 'original', timing: 'always', was: 2, win: 37.3, tunables: ['barbershopBonus', 'barbershopElements'] },
  screamo: { group: 'original', timing: 'once-per-turn', was: 2, win: 32.9, tunables: ['screamoBonus'] },
  disco: { group: 'original', timing: 'always', was: 3, win: 37.5, tunables: ['discoFamePerTame', 'discoMinLevel'] },
  pop: {
    group: 'original', timing: 'always', was: 1, win: 32.9, tunables: ['popPerTurn', 'popMin'],
    note: 'Arrives as the concert starts, so it can pay for an encore or Soul in that concert. A turn without a concert gives nothing.',
  },
  'country': { group: 'lab', timing: 'always', was: 1, win: 33.9, tunables: ['countryBonus'] },
  'lo-fi': { group: 'lab', timing: 'always', was: 3, win: 30.9, tunables: ['loFiDiscount'] },
  'soul': {
    group: 'lab', timing: 'button', was: 3, win: 32.3, tunables: ['soulBonus', 'soulMin', 'soulCost'],
    note: 'Tick it before a song: paying once puts the bonus on every song for the rest of the concert. Checks the Inspiration you had when your turn began.',
  },
  'baroque': { group: 'lab', timing: 'always', was: 1, win: 39.0, tunables: ['baroqueFloor'], note: 'Changes the rolled value before checking for a crit.' },
  'rap': { group: 'lab', timing: 'always', was: 1, win: 31.6, tunables: ['rapExp'] },
  'house': { group: 'lab', timing: 'always', was: 2, win: 37.1, tunables: ['houseBonus', 'houseCap', 'houseShowdownBonus'] },
  'orchestra': { group: 'lab', timing: 'always', was: 2, win: 36.6, tunables: ['orchestraBonus', 'orchestraMin'], note: 'Counts the monsters still standing, and raises the rolled value, so it can crit.' },
  'mariachi': { group: 'lab', timing: 'always', was: 3, win: 35.3, tunables: ['mariachiBonus'] },
  punk: { group: 'new', timing: 'always', was: 1, win: 35.2, tunables: ['punkBonus'] },
  'soft-rock': { group: 'new', timing: 'always', was: 2, win: 35.0, tunables: ['softRockBonus'] },
  'prog-rock': { group: 'new', timing: 'always', was: 2, win: 28.1, tunables: ['progRockFrom', 'progRockBonus'] },
  ska: { group: 'new', timing: 'always', was: 4, win: 32.1, tunables: ['skaBonus'], note: 'Reads the face the die lands on, before any bonus.' },
  'k-pop': { group: 'new', timing: 'always', was: 2, win: 32.0, tunables: ['kPopFame3', 'kPopFame4'], note: 'Paid at the end of the concert; guest songs\' wins don\'t count.' },
  emo: { group: 'new', timing: 'button', was: 2, win: 24.8, tunables: ['emoBonus'], note: 'Tick it before a song: that song gets the bonus, and the concert ends after it (monsters you moved but didn\'t win over level up, as when you end early). An encore keeps the bonus.' },
  trance: { group: 'new', timing: 'always', was: 2, win: 35.0, tunables: ['tranceBonus'] },
  grunge: { group: 'new', timing: 'always', was: 2, win: 35.8, tunables: [], note: 'Each d20 becomes two independently rolled d12s, including in the Final Showdown.' },
  dubstep: { group: 'new', timing: 'always', was: 2, win: 28.8, tunables: ['dubstepBonus'], note: 'Only a song that took some Resolve counts.' },
  'trip-hop': {
    group: 'new', timing: 'button', was: 2, win: 29.0, tunables: [],
    note: 'Every space beyond your normal reach lights up while it is unused. It costs none of your regular moves, and "Undo move" gives it back.',
  },
}

export interface SongbookSetting {
  key: string
  label: string
  value: number
}

export interface SongbookEntry {
  id: GenreId
  name: string
  flavor: string
  /** The rule as printed on the card, with the live numbers filled in. */
  rule: string
  price: number
  /** Price before the latest rebalance. */
  was: number
  group: GenreGroup
  timing: GenreTiming
  win: number
  settings: SongbookSetting[]
  note?: string
}

/** Every genre, with the game's own default values. */
export function songbookEntries(): SongbookEntry[] {
  return withTunables(DEFAULT_TUNABLES, () =>
    ALL_GENRE_IDS.map((id) => {
      const meta = GENRE_META[id]
      const values = DEFAULT_TUNABLES as unknown as Record<string, number>
      const priceKey = genreCostKey(id)
      return {
        id,
        name: GENRES[id].name,
        flavor: GENRES[id].flavor,
        rule: genreRule(id),
        price: genreCost(id),
        was: meta.was,
        group: meta.group,
        timing: meta.timing,
        win: meta.win,
        note: meta.note,
        settings: [priceKey, ...meta.tunables].map((key) => ({
          key,
          label: TUNABLE_FIELDS.find((f) => f.path === key)?.label ?? key,
          value: values[key],
        })),
      }
    })
  )
}
