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
    case 'inspired-play':
      return { ...base, roll: [{ when: { inspirationAtLeast: t.inspiredPlayMin }, flat: t.inspiredPlayBonus }] }
    case 'steady-hands':
      return { ...base, roll: [{ floor: t.steadyHandsFloor }] }
    case 'street-performer':
      return { ...base, onTurnStart: [{ reward: { exp: t.streetPerformerExp } }] }
    case 'chain-reaction':
      return { ...base, roll: [{ perComboBonus: t.chainReactionBonus, bonusCap: t.chainReactionCap }] }
    case 'swarm-singer':
      return { ...base, roll: [{ when: { monstersAtLeast: t.swarmSingerMin }, flat: t.swarmSingerBonus }] }
    case 'jam-session':
      return { ...base, roll: [{ when: { sharingSpace: true }, flat: t.jamSessionBonus }] }
    default:
      return null
  }
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
