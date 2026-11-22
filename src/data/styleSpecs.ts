/**
 * The style lab catalog: data-defined styles (see game-logic/styles/specs.ts)
 * designed and simulated with `scripts/style-lab.ts`. None of them is in the
 * shipped Studio — a player only holds them through `Player.specStyles`,
 * which the style lab sets. Batches are added in ./styleSpecBatches.
 */
import type { StyleSpec } from '../game-logic/styles/specs.js'
import type { Player } from '../types/index.js'
import { STYLE_SPEC_BATCHES, STYLE_SPEC_REWORKS } from './styleSpecBatches.js'

export const STYLE_SPECS: Record<string, StyleSpec> = Object.fromEntries(
  [...STYLE_SPEC_BATCHES.flat(), ...STYLE_SPEC_REWORKS].map((spec) => [spec.id, spec])
)

/** The data-defined styles a player holds. */
export function specsOf(player: Pick<Player, 'specStyles'> | undefined): StyleSpec[] {
  if (!player?.specStyles?.length) return []
  return player.specStyles.map((id) => STYLE_SPECS[id]).filter((s): s is StyleSpec => !!s)
}
