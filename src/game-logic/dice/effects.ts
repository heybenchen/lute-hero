import { TrackEffect, DiceRoll, Dice } from "@/types";
import { getMaxValue, flipDiceValue, rollDiceWithCrit, rollCascadeDice } from "./roller";
import { DICE_UPGRADE_PATH } from "@/data/startingData";

/**
 * Apply track effects to a dice roll
 * Returns modified roll and updated effect (if one-time use)
 */
export function applyTrackEffect(
  roll: DiceRoll,
  dice: Dice,
  effect: TrackEffect | null,
): {
  modifiedRoll: DiceRoll;
  updatedEffect: TrackEffect | null;
  additionalRolls: DiceRoll[];
} {
  if (!effect) {
    return {
      modifiedRoll: roll,
      updatedEffect: null,
      additionalRolls: [],
    };
  }

  let modifiedRoll = { ...roll };
  let updatedEffect: TrackEffect | null = effect;
  let additionalRolls: DiceRoll[] = [];

  switch (effect.type) {
    case "freeReroll":
      // In real implementation, this would need UI interaction
      break;

    case "upgrade":
      // One-time upgrade when slotted, not during roll
      break;

    case "flip": {
      // Only flip if it results in a higher value
      const flipped = flipDiceValue(roll.value, dice.type);
      if (flipped > roll.value) {
        modifiedRoll.value = flipped;
        if (modifiedRoll.value === getMaxValue(dice.type)) {
          modifiedRoll.isCrit = true;
          // Trigger cascade rolls for the new crit
          const cascadeRolls = rollCascadeDice(dice.type);
          modifiedRoll.critBonus = cascadeRolls.reduce((sum, v) => sum + v, 0);
          modifiedRoll.cascadeRolls = cascadeRolls;
        } else {
          modifiedRoll.isCrit = false;
          modifiedRoll.critBonus = 0;
          modifiedRoll.cascadeRolls = [];
        }
      }
      break;
    }

    case "addFlat":
      // Damage bonus applied later in damage calculation
      break;

    case "addDice":
      if (!effect.used) {
        const extraDice: Dice = {
          id: `extra-${dice.id}`,
          type: effect.diceType,
          genre: dice.genre,
        };
        additionalRolls.push(rollDiceWithCrit(extraDice));
        updatedEffect = { ...effect, used: true };
      }
      break;

    case "rollTwiceKeepHigher": {
      const secondRoll = rollDiceWithCrit(dice);
      if (secondRoll.value + secondRoll.critBonus > roll.value + roll.critBonus) {
        modifiedRoll = secondRoll;
      }
      break;
    }

    case "harmonize":
      // Bonus calculated at song level in calculateHarmonizeBonus
      break;

    case "offbeat":
      // Multiplier applied in damage calculation via calculateOffbeatMultiplier
      break;

    case "wildDice":
      // Once per song: add one extra d4 roll
      if (!effect.used) {
        const wildDie: Dice = {
          id: `wild-${dice.id}`,
          type: "d4",
          genre: dice.genre,
        };
        additionalRolls.push(rollDiceWithCrit(wildDie));
        updatedEffect = { ...effect, used: true };
      }
      break;

    case "tempo":
      // Bonus calculated at song level in calculateTempoBonus
      break;

    case "powerChord":
      // 3s deal double damage — replace value with 6
      if (roll.value === 3) {
        modifiedRoll.value = 6;
        modifiedRoll.isCrit = false;
        modifiedRoll.critBonus = 0;
      }
      break;

    // Song-level effects — handled by dedicated bonus functions
    case "dynamicRange":
    case "dropTheBass":
    case "lucky7":
    case "crescendo":
    case "monoOut":
      break;
  }

  return {
    modifiedRoll,
    updatedEffect,
    additionalRolls,
  };
}

/**
 * Calculate flat bonuses from effects
 */
export function calculateEffectBonuses(effects: TrackEffect[]): number {
  let bonus = 0;
  effects.forEach((effect) => {
    if (effect.type === "addFlat") {
      bonus += effect.amount;
    }
  });
  return bonus;
}

/**
 * Upgrade a die to the next tier
 */
export function upgradeDice(dice: Dice): Dice {
  const nextTier = DICE_UPGRADE_PATH[dice.type];
  if (!nextTier) return dice;
  return { ...dice, type: nextTier };
}

/**
 * Calculate harmonize bonus if any effect is harmonize
 * and 2+ dice rolled the same value
 */
export function calculateHarmonizeBonus(effects: TrackEffect[], rolls: DiceRoll[]): number {
  const harmonizeEffect = effects.find((e) => e.type === "harmonize");
  if (!harmonizeEffect || harmonizeEffect.type !== "harmonize") return 0;
  const values = rolls.map((r) => r.value);
  const hasDuplicates = values.some((val, idx) => values.indexOf(val) !== idx);
  return hasDuplicates ? harmonizeEffect.bonusDamage : 0;
}

/**
 * Calculate tempo bonus: add the lowest primary die's value as bonus damage
 */
export function calculateTempoBonus(effects: TrackEffect[], rolls: DiceRoll[]): number {
  if (!effects.some((e) => e.type === "tempo")) return 0;
  if (rolls.length < 2) return 0;
  return Math.min(...rolls.map((r) => r.value));
}

/**
 * Calculate crescendo bonus: total roll >= 15 adds 5 damage
 */
export function calculateCrescendoBonus(effects: TrackEffect[], rolls: DiceRoll[]): number {
  if (!effects.some((e) => e.type === "crescendo")) return 0;
  const total = rolls.reduce((sum, r) => sum + r.value, 0);
  return total >= 15 ? 5 : 0;
}

/**
 * Calculate dynamic range bonus: if spread between primary dice >= 6, add 4
 */
export function calculateDynamicRangeBonus(
  effects: TrackEffect[],
  primaryRolls: DiceRoll[],
): number {
  if (!effects.some((e) => e.type === "dynamicRange")) return 0;
  if (primaryRolls.length < 2) return 0;
  const values = primaryRolls.map((r) => r.value);
  const spread = Math.max(...values) - Math.min(...values);
  return spread >= 6 ? 4 : 0;
}

/**
 * Calculate drop the bass bonus: if all primary dice rolled 1, add 9
 */
export function calculateDropTheBassBonus(
  effects: TrackEffect[],
  primaryRolls: DiceRoll[],
): number {
  if (!effects.some((e) => e.type === "dropTheBass")) return 0;
  if (primaryRolls.length < 2) return 0;
  const allOnes = primaryRolls.every((r) => r.value === 1);
  return allOnes ? 9 : 0;
}

/**
 * Calculate lucky 7 bonus: if any roll shows 7, add 3
 */
export function calculateLucky7Bonus(effects: TrackEffect[], rolls: DiceRoll[]): number {
  if (!effects.some((e) => e.type === "lucky7")) return 0;
  return rolls.some((r) => r.value === 7) ? 3 : 0;
}

/**
 * Calculate offbeat multiplier for a single roll
 * Odd rolls = 2x, Even rolls = 0.5x
 */
export function calculateOffbeatMultiplier(roll: DiceRoll, effect: TrackEffect | null): number {
  if (effect?.type !== "offbeat") return 1;
  return roll.value % 2 === 1 ? 2 : 0.5;
}
