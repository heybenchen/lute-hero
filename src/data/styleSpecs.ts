// KEEP IN SYNC: songStyles.md (repo root) documents every style's rule, price, tunables and simulated strength. When you change style logic, rule text, a price or a style tunable's default, or add or remove a style, update songStyles.md in the same change.
/**
 * Data-defined styles (see game-logic/styles/specs.ts).
 *
 *  - `studioSpec(id)`: the Studio styles promoted from the style lab. Their
 *    effects are specs built from the live tunables on every call, so the
 *    debug console and saves can retune them like any other style.
 *  - `STYLE_SPECS`: the style lab catalog, designed and simulated with
 *    `scripts/style-lab.ts`. A player only holds those through
 *    `Player.specStyles`, which the style lab sets. Batches live in
 *    ./styleSpecBatches.
 */
import type { StyleSpec } from '../game-logic/styles/specs.js'
import type { Player, StyleId } from '../types/index.js'
import { STYLE_SPEC_BATCHES, STYLE_SPEC_REWORKS } from './styleSpecBatches.js'
import { getTunables } from './tunables.js'

export const STYLE_SPECS: Record<string, StyleSpec> = Object.fromEntries(
  [...STYLE_SPEC_BATCHES.flat(), ...STYLE_SPEC_REWORKS].map((spec) => [spec.id, spec])
)

/** The spec behind a Studio style, or null for styles the engine handles directly. */
export function studioSpec(id: StyleId): StyleSpec | null {
  const t = getTunables()
  const base = { id, name: id, theme: 'studio', rule: '', cost: 0 }
  switch (id) {
    case 'hometown-hero':
      return { ...base, roll: [{ when: { element: 'starter' }, critBonus: t.hometownHeroBonus }] }
    case 'studio-regular':
      return { ...base, economy: { upgradeCost: -t.studioRegularDiscount } }
    // Soul (Inspired Play) is a choice the bard makes per play (PLAY_SONG inspiredPlay),
    // so the engine adds its bonus through inspiredPlaySpec() rather than here
    case 'steady-hands':
      // Baroque: a low roll is raised (bonus dice are rolled plain)
      return { ...base, roll: [{ lowFaceBonus: t.steadyHandsBonus, lowFaceAtMost: t.steadyHandsAtMost }] }
    case 'street-performer':
      return { ...base, onTurnStart: [{ reward: { exp: t.streetPerformerExp } }] }
    case 'chain-reaction': {
      // House: no cap by default (0 = none), and a smaller bonus per link in the Final Showdown
      const cap = t.chainReactionCap > 0 ? { bonusCap: t.chainReactionCap } : {}
      return { ...base, roll: [
        { when: { showdown: false }, perComboBonus: t.chainReactionBonus, ...cap },
        { when: { showdown: true }, perComboBonus: t.chainReactionShowdownBonus, ...cap },
      ] }
    }
    case 'swarm-singer':
      // Orchestra: while enough monsters remain, every die's rolled value goes up (it can crit)
      return { ...base, roll: [{ when: { monstersAtLeast: t.swarmSingerMin }, critBonus: t.swarmSingerBonus }] }
    case 'jam-session':
      return { ...base, roll: [{ when: { sharingSpace: true }, flat: t.jamSessionBonus }] }
    // Genres added with the rename from styles to genres
    case 'punk':
      // Punk: a bonus on the song whenever its die crits
      return { ...base, roll: [{ critFlat: t.punkBonus }] }
    case 'soft-rock':
      return { ...base, roll: [{ when: { dice: ['d8', 'd12'] }, critBonus: t.softRockBonus }] }
    case 'prog-rock':
      return { ...base, roll: [{ when: { playIndexAtLeast: t.progRockFrom - 1, showdown: false }, flat: t.progRockBonus }] }
    case 'ska':
      return { ...base, roll: [{ oddBonus: t.skaBonus }] }
    // K-Pop's Fame for a big concert is paid in endCombat (it counts the concert's wins)
    case 'emo':
      // Emo: a bonus on your last unspent song
      return { ...base, roll: [{ when: { lastSong: true }, flat: t.emoBonus }] }
    case 'trance':
      return { ...base, roll: [{ when: { inspirationAtMost: 0 }, flat: t.tranceBonus }] }
    case 'grunge':
      // Grunge: after a song moves its monster without winning it over
      return { ...base, roll: [{ when: { afterMove: true }, flat: t.grungeBonus }] }
    case 'dubstep':
      // Dubstep: after a song wins its monster over, once per turn
      return { ...base, roll: [{ when: { afterWin: true, oncePerTurn: true }, advantage: true }] }
    default:
      return null
  }
}

/** Soul (Inspired Play): the +bonus a bard buys for one play by spending Inspiration. */
export function inspiredPlaySpec(): StyleSpec {
  return { id: 'inspired-play', name: 'inspired-play', theme: 'studio', rule: '', cost: 0, roll: [{ flat: getTunables().inspiredPlayBonus }] }
}

/** Specs for a set of Studio styles plus any style-lab specs. */
export function specsForStyles(styles: readonly StyleId[] = [], specStyles: readonly string[] = []): StyleSpec[] {
  const out: StyleSpec[] = []
  for (const id of styles) {
    const spec = studioSpec(id)
    if (spec) out.push(spec)
  }
  for (const id of specStyles) {
    const spec = STYLE_SPECS[id]
    if (spec) out.push(spec)
  }
  return out
}

/** The data-defined styles a player holds (Studio ones and style-lab ones). */
export function specsOf(player: Pick<Player, 'specStyles' | 'styles'> | undefined): StyleSpec[] {
  if (!player) return []
  return specsForStyles(player.styles, player.specStyles)
}
