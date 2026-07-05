import { DraftCard, Dice, Genre, DiceType } from "@/types";
import { TRACK_EFFECTS } from "./trackEffects";
import { DICE_UPGRADE_PATH } from "./startingData";

let cardIdCounter = 0;

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`;
}

let dieIdCounter = 0;

// Buying an element grants the right to add a new d4 of that element
export const NEW_D4_COST = 5;

// Cost to upgrade an existing die TO the given type (via DICE_UPGRADE_PATH)
export const UPGRADE_COSTS: Record<Exclude<DiceType, "d4">, number> = {
  d6: 10,
  d12: 20,
  d20: 30,
};

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
  return UPGRADE_COSTS[next as Exclude<DiceType, "d4">];
}

/**
 * Create a fresh d4 die of the purchased element.
 */
export function createElementalDie(genre: Genre): Dice {
  return {
    id: `die-${Date.now()}-${dieIdCounter++}`,
    type: "d4",
    genre,
  };
}

export function generateNameCard(): DraftCard {
  const effects = Object.keys(TRACK_EFFECTS);
  const randomEffect = effects[Math.floor(Math.random() * effects.length)];

  const songNames = [
    "Acoustic Serenade",
    "Bass Drop Anthem",
    "Melody of Hope",
    "Rhythm Revolution",
    "Harmony Unleashed",
    "Symphony of Chaos",
    "Beat Machine",
    "Lyrical Storm",
    "Crescendo Rising",
    "Digital Dreams",
  ];

  return {
    id: generateCardId(),
    type: "name",
    cost: 10,
    songName: songNames[Math.floor(Math.random() * songNames.length)],
    songEffect: TRACK_EFFECTS[randomEffect],
  };
}
