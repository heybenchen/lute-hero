import { Dice, Genre, DiceType, NewId } from '../types/index.js';
import { DICE_UPGRADE_PATH } from "./startingData.js";
import { getTunables } from "./tunables.js";

let dieIdCounter = 0;

/** EXP to add a brand-new d4 of a purchased element. */
export function newD4Cost(): number {
  return getTunables().newD4Cost;
}

/**
 * Inspiration cost for the next token this turn: a base price that escalates by
 * a fixed step for each token already bought.
 */
export function getInspirationCost(boughtThisTurn: number): number {
  const { inspirationBaseCost, inspirationCostStep } = getTunables();
  return inspirationBaseCost + inspirationCostStep * boughtThisTurn;
}

/** Inspiration tokens spent per refresh / travel / reroll. */
export function inspirationSpend(): number {
  return getTunables().inspirationSpend;
}

/** EXP cost to upgrade a die INTO the given type. */
export function upgradeCostFor(type: Exclude<DiceType, "d4">): number {
  const t = getTunables();
  return type === "d8" ? t.upgradeCostD8 : type === "d12" ? t.upgradeCostD12 : t.upgradeCostD20;
}

/**
 * The die type an existing die upgrades into, or null if already maxed (d20).
 */
export function getNextDiceType(type: DiceType): DiceType | null {
  return DICE_UPGRADE_PATH[type];
}

/**
 * EXP cost to upgrade a die of the given type to the next tier,
 * or null if the die is already maxed.
 */
export function getUpgradeCost(type: DiceType): number | null {
  const next = getNextDiceType(type);
  if (!next) return null;
  return upgradeCostFor(next as Exclude<DiceType, "d4">);
}

/**
 * Create a fresh d4 die of the purchased element.
 */
export function createElementalDie(genre: Genre, newId?: NewId): Dice {
  return {
    id: newId ? newId("die") : `die-${Date.now()}-${dieIdCounter++}`,
    type: "d4",
    genre,
  };
}
