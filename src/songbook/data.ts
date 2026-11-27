/**
 * Songbook data: everything the /songbook page shows about each style.
 *
 * Names, flavour, rules, prices and the setting values are read live from the
 * game's own style code (src/data/styles.ts and the default tunables), so they
 * cannot drift from the game. Only the facts below are stored here: which group
 * a style belongs to, how it triggers, the price it had before the latest
 * rebalance, which settings shape it, and its simulated win rate.
 *
 * KEEP IN SYNC: songStyles.md (repo root) documents the same win rates and
 * prices. When you re-run the style audit or change a style, update the win
 * rates and `was` prices here and in songStyles.md in the same change.
 */
import type { StyleId } from '../types/index.js'
import { ALL_STYLE_IDS, STYLES, styleCost, styleCostKey, styleRule } from '../data/styles.js'
import { DEFAULT_TUNABLES, TUNABLE_FIELDS, withTunables } from '../data/tunables.js'

export type StyleGroup = 'original' | 'lab' | 'new'
export type StyleTiming = 'always' | 'once-per-turn' | 'button'

export const GROUP_LABEL: Record<StyleGroup, string> = {
  original: 'Original',
  lab: 'From the lab',
  new: 'New',
}

export const TIMING_LABEL: Record<StyleTiming, string> = {
  always: 'Always on',
  'once-per-turn': 'Once per turn',
  button: 'You press it',
}

interface StyleMeta {
  group: StyleGroup
  timing: StyleTiming
  /** Price (EXP) before the latest rebalance. */
  was: number
  /** Simulated win % of a bard who buys this style in round 5 (parity is 33.3%). */
  win: number
  /** Tunable keys that shape the style, shown with their default values. */
  tunables: string[]
  /** Anything the one-line rule leaves out. */
  note?: string
}

/** The no-style baseline in the same simulation (everyone shopping for styles). */
export const BASELINE_WIN = 32.8
/** A third of games, the fair share at a three-bard table. */
export const PARITY = 33.3
/** Games per style in the latest audit. */
export const AUDIT_GAMES = 600

export const STYLE_META: Record<StyleId, StyleMeta> = {
  staccato: {
    group: 'original', timing: 'button', was: 2, win: 27.1, tunables: ['staccatoMaxFaces'],
    note: 'Tick "Call it" before you play a song. If that song wins its monster over, choose a spent song to refresh. The call is used up either way.',
  },
  coda: {
    group: 'original', timing: 'always', was: 1, win: 28.1, tunables: [],
    note: 'Replacing it while the 7th song holds a die means choosing a song to give up: its die is lost, and the 7th song\'s die takes its place.',
  },
  ostinato: {
    group: 'original', timing: 'always', was: 2, win: 34.3,
    tunables: ['ostinatoCritFace', 'ostinatoMaxFaces', 'ostinatoCascadeBonus', 'ostinatoChainFace'],
  },
  rubato: {
    group: 'original', timing: 'button', was: 1, win: 32.9, tunables: ['rubatoMaxFaces', 'rubatoUsesPerTurn'],
    note: 'A free encore button, never costs Inspiration. If the new roll is lower, your first roll stands (the use is still spent).',
  },
  virtuoso: { group: 'original', timing: 'always', was: 2, win: 39.3, tunables: ['virtuosoMinFaces', 'virtuosoMaxFaces'] },
  fortissimo: { group: 'original', timing: 'always', was: 2, win: 28.5, tunables: ['fortissimoBonus', 'fortissimoRaisesFace'] },
  fermata: {
    group: 'original', timing: 'button', was: 3, win: 31.5, tunables: ['fermataMinFaces', 'fermataInspirationCost'],
    note: 'A button on a spent d20 song during a concert. Songs refresh at the start of every concert anyway.',
  },
  counterpoint: { group: 'original', timing: 'once-per-turn', was: 2, win: 31.8, tunables: ['counterpointMultiplier'] },
  tutti: { group: 'original', timing: 'always', was: 2, win: 37.3, tunables: ['tuttiBonus', 'tuttiElements'] },
  overture: { group: 'original', timing: 'once-per-turn', was: 2, win: 32.9, tunables: ['overtureBonus'] },
  bravo: { group: 'original', timing: 'always', was: 3, win: 37.5, tunables: ['bravoFamePerTame', 'bravoMinLevel'] },
  ispirato: {
    group: 'original', timing: 'always', was: 1, win: 32.9, tunables: ['ispiratoPerTurn', 'ispiratoMin'],
    note: 'Arrives as the concert starts, so it can pay for an encore or Soul in that concert. A turn without a concert gives nothing.',
  },
  'hometown-hero': { group: 'lab', timing: 'always', was: 1, win: 33.9, tunables: ['hometownHeroBonus'] },
  'studio-regular': { group: 'lab', timing: 'always', was: 3, win: 30.9, tunables: ['studioRegularDiscount'] },
  'inspired-play': {
    group: 'lab', timing: 'button', was: 3, win: 32.3, tunables: ['inspiredPlayBonus', 'inspiredPlayMin', 'inspiredPlayCost'],
    note: 'Tick it before a song: paying once puts the bonus on every song for the rest of the concert. Checks the Inspiration you had when your turn began.',
  },
  'steady-hands': { group: 'lab', timing: 'always', was: 1, win: 39.0, tunables: ['steadyHandsAtMost', 'steadyHandsBonus'], note: 'Raises the rolled value, so a raised die can crit (a 3 on a d4 counts as a crit).' },
  'street-performer': { group: 'lab', timing: 'always', was: 1, win: 31.6, tunables: ['streetPerformerExp'] },
  'chain-reaction': { group: 'lab', timing: 'always', was: 2, win: 37.1, tunables: ['chainReactionBonus', 'chainReactionCap', 'chainReactionShowdownBonus'] },
  'swarm-singer': { group: 'lab', timing: 'always', was: 2, win: 36.6, tunables: ['swarmSingerBonus', 'swarmSingerMin'], note: 'Counts the monsters still standing, and raises the rolled value, so it can crit.' },
  'jam-session': { group: 'lab', timing: 'always', was: 3, win: 35.3, tunables: ['jamSessionBonus'] },
  punk: { group: 'new', timing: 'always', was: 1, win: 35.2, tunables: ['punkBonus'] },
  'soft-rock': { group: 'new', timing: 'always', was: 2, win: 35.0, tunables: ['softRockBonus'] },
  'prog-rock': { group: 'new', timing: 'always', was: 2, win: 28.1, tunables: ['progRockFrom', 'progRockBonus'] },
  ska: { group: 'new', timing: 'always', was: 4, win: 32.1, tunables: ['skaBonus'], note: 'Reads the face the die lands on, before any bonus.' },
  'k-pop': { group: 'new', timing: 'always', was: 2, win: 32.0, tunables: ['kPopFame3', 'kPopFame4'], note: 'Paid at the end of the concert; guest songs\' wins don\'t count.' },
  emo: { group: 'new', timing: 'always', was: 2, win: 21.8, tunables: ['emoMultiplier', 'emoBonus', 'emoSongsLeft'], note: 'Your last unspent song, counting the one you play.' },
  trance: { group: 'new', timing: 'always', was: 2, win: 26.4, tunables: ['tranceBonus'] },
  grunge: { group: 'new', timing: 'always', was: 2, win: 31.2, tunables: ['grungeBonus'], note: 'Only a song that took some Resolve counts. A guest song counts too.' },
  dubstep: { group: 'new', timing: 'once-per-turn', was: 2, win: 28.8, tunables: ['dubstepAdvantage', 'dubstepBonus', 'dubstepMultiplier', 'dubstepOncePerTurn'], note: 'A guest song\'s win counts too.' },
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
  id: StyleId
  name: string
  flavor: string
  /** The rule as printed on the card, with the live numbers filled in. */
  rule: string
  price: number
  /** Price before the latest rebalance. */
  was: number
  group: StyleGroup
  timing: StyleTiming
  win: number
  settings: SongbookSetting[]
  note?: string
}

/** Every style, with the game's own default values. */
export function songbookEntries(): SongbookEntry[] {
  return withTunables(DEFAULT_TUNABLES, () =>
    ALL_STYLE_IDS.map((id) => {
      const meta = STYLE_META[id]
      const values = DEFAULT_TUNABLES as unknown as Record<string, number>
      const priceKey = styleCostKey(id)
      return {
        id,
        name: STYLES[id].name,
        flavor: STYLES[id].flavor,
        rule: styleRule(id),
        price: styleCost(id),
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
