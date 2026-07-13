import { DraftCard, Dice, Genre, DiceType, Rng, NewId } from '../types/index.js';
import { TRACK_EFFECTS } from "./trackEffects.js";
import { DICE_UPGRADE_PATH } from "./startingData.js";

let cardIdCounter = 0;

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`;
}

let dieIdCounter = 0;

// Buying an element grants the right to add a new d4 of that element
export const NEW_D4_COST = 5;

// Inspiration: base cost 5 EXP, escalating by 5 for each token bought this turn.
export const INSPIRATION_BASE_COST = 5;
export function getInspirationCost(boughtThisTurn: number): number {
  return INSPIRATION_BASE_COST * (boughtThisTurn + 1);
}
// Each refresh / travel / reroll spends this many inspiration tokens.
export const INSPIRATION_SPEND = 1;

// Cost to upgrade an existing die TO the given type (via DICE_UPGRADE_PATH)
export const UPGRADE_COSTS: Record<Exclude<DiceType, "d4">, number> = {
  d6: 5,
  d12: 15,
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
export function createElementalDie(genre: Genre, newId?: NewId): Dice {
  return {
    id: newId ? newId("die") : `die-${Date.now()}-${dieIdCounter++}`,
    type: "d4",
    genre,
  };
}

const SONG_NAMES = [
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

export function generateNameCard(
  excludeNames: Set<string> = new Set(),
  rng: Rng = Math.random,
  newId?: NewId
): DraftCard {
  const effects = Object.keys(TRACK_EFFECTS);
  const randomEffect = effects[Math.floor(rng() * effects.length)];

  const available = SONG_NAMES.filter((n) => !excludeNames.has(n));
  const pool = available.length > 0 ? available : SONG_NAMES;

  return {
    id: newId ? newId("card") : generateCardId(),
    type: "name",
    cost: 10,
    songName: pool[Math.floor(rng() * pool.length)],
    songEffect: TRACK_EFFECTS[randomEffect],
  };
}
