/**
 * Per-player prices and limits: the tunable base values adjusted by any
 * data-defined styles the player holds (style lab). With no specs these are
 * exactly the tunable values.
 */
import { Dice, Player } from '../types/index.js'
import { newD4Cost, getUpgradeCost, getInspirationCost } from '../data/draftCards.js'
import { getTunables } from '../data/tunables.js'
import { specsOf } from '../data/styleSpecs.js'
import { economyDelta, upgradeDelta } from '../game-logic/styles/specs.js'

export function d4CostFor(player: Player): number {
  return Math.max(0, newD4Cost() + economyDelta(specsOf(player), 'd4Cost'))
}

export function upgradeCostFor(player: Player, die: Dice): number | null {
  const base = getUpgradeCost(die.type)
  return base === null ? null : Math.max(0, base + upgradeDelta(specsOf(player), die, player.starterGenre))
}

export function inspirationCostFor(player: Player): number {
  return Math.max(0, getInspirationCost(player.inspirationBoughtThisTurn) + economyDelta(specsOf(player), 'inspirationCost'))
}

export function movesFor(player: Player): number {
  return getTunables().maxMovesPerTurn + economyDelta(specsOf(player), 'moves')
}

/** EXP the player can spend, counting Inspiration that may stand in for EXP. */
export function spendable(player: Player): number {
  return player.exp + player.inspiration * economyDelta(specsOf(player), 'inspirationAsExp')
}

export function canAfford(player: Player, cost: number): boolean {
  return spendable(player) >= cost
}

/** Pay a Studio price: EXP first, then Inspiration at its EXP rate (rounded up). */
export function pay(player: Player, cost: number): Player {
  if (player.exp >= cost) return { ...player, exp: player.exp - cost }
  const rate = economyDelta(specsOf(player), 'inspirationAsExp')
  const short = cost - player.exp
  const insp = rate > 0 ? Math.ceil(short / rate) : 0
  return { ...player, exp: Math.max(0, player.exp + insp * rate - cost), inspiration: player.inspiration - insp }
}
