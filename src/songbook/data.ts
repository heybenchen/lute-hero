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
export const BASELINE_WIN = 34.6
/** A third of games, the fair share at a three-bard table. */
export const PARITY = 33.3
/** Games per style in the latest audit. */
export const AUDIT_GAMES = 600

export const STYLE_META: Record<StyleId, StyleMeta> = {
  staccato: {
    group: 'original', timing: 'button', was: 2, win: 26.4, tunables: ['staccatoMaxFaces'],
    note: 'Tick "Call it" before you play a song. If that song wins its monster over, choose a spent song to refresh. The call is used up either way.',
  },
  coda: {
    group: 'original', timing: 'always', was: 1, win: 32.8, tunables: [],
    note: "Losing the genre returns that song's die as an unclaimed reward.",
  },
  ostinato: {
    group: 'original', timing: 'always', was: 2, win: 33.3,
    tunables: ['ostinatoCritFace', 'ostinatoMaxFaces', 'ostinatoCascadeBonus', 'ostinatoChainFace'],
  },
  rubato: {
    group: 'original', timing: 'button', was: 1, win: 36.5, tunables: ['rubatoMaxFaces', 'rubatoUsesPerTurn'],
    note: 'A free encore button, never costs Inspiration. If the new roll is lower, your first roll stands (the use is still spent).',
  },
  virtuoso: { group: 'original', timing: 'once-per-turn', was: 2, win: 27.7, tunables: ['virtuosoMinFaces', 'virtuosoMaxFaces'] },
  fortissimo: { group: 'original', timing: 'always', was: 2, win: 36.0, tunables: ['fortissimoBonus'] },
  fermata: {
    group: 'original', timing: 'button', was: 3, win: 29.7, tunables: ['fermataMinFaces', 'fermataInspirationCost'],
    note: 'A button on a spent d20 song during a concert. Songs refresh at the start of every concert anyway.',
  },
  counterpoint: { group: 'original', timing: 'once-per-turn', was: 2, win: 36.5, tunables: ['counterpointMultiplier'] },
  tutti: { group: 'original', timing: 'always', was: 2, win: 39.1, tunables: ['tuttiBonus', 'tuttiElements'] },
  overture: { group: 'original', timing: 'once-per-turn', was: 2, win: 33.9, tunables: ['overtureBonus'] },
  bravo: { group: 'original', timing: 'always', was: 3, win: 38.0, tunables: ['bravoFamePerTame', 'bravoMinLevel'] },
  ispirato: {
    group: 'original', timing: 'always', was: 1, win: 29.6, tunables: ['ispiratoPerTurn', 'ispiratoMin'],
    note: 'Comes after every concert, including one you end early. A turn without a concert gives nothing.',
  },
  'hometown-hero': { group: 'lab', timing: 'always', was: 1, win: 35.2, tunables: ['hometownHeroBonus'] },
  'studio-regular': { group: 'lab', timing: 'always', was: 3, win: 34.9, tunables: ['studioRegularDiscount'] },
  'inspired-play': {
    group: 'lab', timing: 'button', was: 3, win: 28.3, tunables: ['inspiredPlayBonus', 'inspiredPlayMin', 'inspiredPlayCost'],
    note: 'Tick it before you play a song; it can be used on any number of songs while you can pay. Checks the Inspiration you had when your turn began.',
  },
  'steady-hands': { group: 'lab', timing: 'always', was: 1, win: 34.3, tunables: ['steadyHandsFloor'], note: 'Changes the die\'s face, so a raised die counts for crits as well.' },
  'street-performer': { group: 'lab', timing: 'always', was: 1, win: 29.9, tunables: ['streetPerformerExp'] },
  'chain-reaction': { group: 'lab', timing: 'always', was: 2, win: 35.7, tunables: ['chainReactionBonus', 'chainReactionCap', 'chainReactionShowdownBonus'] },
  'swarm-singer': { group: 'lab', timing: 'always', was: 2, win: 37.3, tunables: ['swarmSingerBonus', 'swarmSingerMin'] },
  'jam-session': { group: 'lab', timing: 'always', was: 3, win: 37.8, tunables: ['jamSessionBonus'] },
  punk: { group: 'new', timing: 'always', was: 1, win: 33.8, tunables: ['punkBonus'] },
  'soft-rock': { group: 'new', timing: 'always', was: 2, win: 34.9, tunables: ['softRockBonus'] },
  'prog-rock': { group: 'new', timing: 'always', was: 2, win: 33.8, tunables: ['progRockFrom', 'progRockBonus'] },
  ska: { group: 'new', timing: 'always', was: 2, win: 34.7, tunables: ['skaBonus'], note: 'Reads the face the die lands on, before any bonus.' },
  'k-pop': { group: 'new', timing: 'always', was: 2, win: 32.1, tunables: ['kPopFame'], note: 'Paid at the end of the concert.' },
  emo: { group: 'new', timing: 'always', was: 2, win: 32.1, tunables: ['emoBonus', 'emoCap'] },
  trance: { group: 'new', timing: 'always', was: 2, win: 30.3, tunables: ['tranceBonus'] },
  grunge: { group: 'new', timing: 'always', was: 1, win: 34.8, tunables: ['grungeBonus'], note: 'A guest song that misses counts too.' },
  dubstep: { group: 'new', timing: 'once-per-turn', was: 2, win: 33.5, tunables: [] },
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
