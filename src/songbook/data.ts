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

export type StyleGroup = 'original' | 'lab'
export type StyleTiming = 'always' | 'once-per-turn' | 'button'

export const GROUP_LABEL: Record<StyleGroup, string> = {
  original: 'Original',
  lab: 'From the style lab',
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
export const BASELINE_WIN = 33.5
/** A third of games, the fair share at a three-bard table. */
export const PARITY = 33.3
/** Games per style in the latest audit. */
export const AUDIT_GAMES = 800

export const STYLE_META: Record<StyleId, StyleMeta> = {
  staccato: {
    group: 'original', timing: 'button', was: 2, win: 35.3, tunables: ['staccatoMaxFaces'],
    note: 'After a tame, a prompt lets you choose a spent song to refresh. Once per turn.',
  },
  coda: {
    group: 'original', timing: 'always', was: 1, win: 32.6, tunables: [],
    note: "Losing the style returns that song's die as an unclaimed reward.",
  },
  ostinato: {
    group: 'original', timing: 'always', was: 2, win: 37.1,
    tunables: ['ostinatoCritFace', 'ostinatoMaxFaces', 'ostinatoCascadeBonus', 'ostinatoChainFace'],
  },
  rubato: {
    group: 'original', timing: 'button', was: 1, win: 34.4, tunables: ['rubatoMaxFaces', 'rubatoUsesPerTurn'],
    note: 'A free reroll button. It never costs Inspiration.',
  },
  virtuoso: { group: 'original', timing: 'once-per-turn', was: 2, win: 35.1, tunables: ['virtuosoMinFaces'] },
  fortissimo: { group: 'original', timing: 'always', was: 2, win: 36.0, tunables: ['fortissimoBonus'] },
  fermata: {
    group: 'original', timing: 'once-per-turn', was: 3, win: 35.1, tunables: ['fermataMinFaces', 'fermataInspirationCost'],
    note: 'Without the Inspiration to pay for it, the song is spent as usual.',
  },
  counterpoint: { group: 'original', timing: 'once-per-turn', was: 1, win: 35.8, tunables: ['counterpointMultiplier'] },
  tutti: { group: 'original', timing: 'once-per-turn', was: 2, win: 38.4, tunables: ['tuttiBonus', 'tuttiElements'] },
  overture: { group: 'original', timing: 'once-per-turn', was: 2, win: 35.5, tunables: ['overtureBonus'] },
  bravo: { group: 'original', timing: 'always', was: 4, win: 35.4, tunables: ['bravoFamePerTame', 'bravoMinLevel'] },
  ispirato: { group: 'original', timing: 'always', was: 1, win: 38.5, tunables: ['ispiratoPerTurn', 'ispiratoMin'] },
  'hometown-hero': { group: 'lab', timing: 'always', was: 1, win: 33.7, tunables: ['hometownHeroBonus'] },
  'small-ensemble': { group: 'lab', timing: 'always', was: 4, win: 34.9, tunables: ['smallEnsembleMaxFaces'] },
  'studio-regular': { group: 'lab', timing: 'always', was: 2, win: 37.1, tunables: ['studioRegularDiscount'] },
  'inspired-play': { group: 'lab', timing: 'always', was: 3, win: 33.6, tunables: ['inspiredPlayBonus', 'inspiredPlayMin'] },
  'double-time': {
    group: 'lab', timing: 'once-per-turn', was: 2, win: 34.9, tunables: [],
    note: 'It always applies to the first die you roll that turn.',
  },
  'chain-reaction': { group: 'lab', timing: 'always', was: 3, win: 35.9, tunables: ['chainReactionBonus', 'chainReactionCap'] },
  'swarm-singer': { group: 'lab', timing: 'always', was: 2, win: 35.0, tunables: ['swarmSingerBonus', 'swarmSingerMin'] },
  'jam-session': { group: 'lab', timing: 'always', was: 2, win: 36.2, tunables: ['jamSessionBonus'] },
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
