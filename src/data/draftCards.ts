import { DraftCard, Dice, Genre, DiceType, InspirationDie } from "@/types";
import { TRACK_EFFECTS } from "./trackEffects";

let cardIdCounter = 0;

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`;
}

// Single dice purchase costs by type
export const SINGLE_DICE_COSTS: Record<DiceType, number> = {
  d4: 4,
  d6: 6,
  d12: 12,
  d20: 18,
};

// Inspiration reveal cost: 10 * (rollCount + 1)
export const INSPIRATION_BASE_COST = 10;

export function getInspirationCost(rollCount: number): number {
  return INSPIRATION_BASE_COST * (rollCount + 1);
}

/**
 * Create the finite inspiration pool for the game.
 * 2 copies of each (diceType x genre) per player.
 */
export function createInspirationPool(numPlayers: number): Dice[] {
  const pool: Dice[] = [];
  const diceTypes: DiceType[] = ["d4", "d6", "d12", "d20"];
  const genres: Genre[] = ["Ballad", "Folk", "Hymn", "Shanty"];
  const copiesPerPlayer = 2;

  for (const genre of genres) {
    for (const diceType of diceTypes) {
      for (let copy = 0; copy < copiesPerPlayer * numPlayers; copy++) {
        pool.push({
          id: `pool-${genre}-${diceType}-${copy}`,
          type: diceType,
          genre,
        });
      }
    }
  }
  return pool;
}

/**
 * Draw dice from the inspiration pool with genre weighting.
 * Genres that players already own many of are less likely to appear.
 * Unchosen dice are returned to pool by the caller.
 */
export function drawInspirationDice(
  pool: Dice[],
  count: number,
  playerGenreCounts?: Record<Genre, number>,
): { drawn: InspirationDie[]; remainingPool: Dice[] } {
  if (pool.length === 0) return { drawn: [], remainingPool: [] };

  const remainingPool = [...pool];
  const drawn: InspirationDie[] = [];
  const drawCount = Math.min(count, remainingPool.length);

  for (let i = 0; i < drawCount; i++) {
    // Calculate weights for remaining dice
    const weights = remainingPool.map((die) => {
      const genreCount = playerGenreCounts?.[die.genre] ?? 0;
      return Math.max(1, 10 - genreCount);
    });

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * totalWeight;
    let selectedIdx = 0;

    for (let j = 0; j < weights.length; j++) {
      roll -= weights[j];
      if (roll <= 0) {
        selectedIdx = j;
        break;
      }
    }

    const selected = remainingPool.splice(selectedIdx, 1)[0];
    drawn.push({
      dice: selected,
      cost: SINGLE_DICE_COSTS[selected.type],
    });
  }

  return { drawn, remainingPool };
}

export function generateSongCard(): DraftCard {
  const effects = Object.keys(TRACK_EFFECTS);
  const randomEffect1 = effects[Math.floor(Math.random() * effects.length)];
  const randomEffect2 = effects[Math.floor(Math.random() * effects.length)];

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
    type: "song",
    cost: 10,
    songName: songNames[Math.floor(Math.random() * songNames.length)],
    songEffect: TRACK_EFFECTS[randomEffect1],
    songEffect2: TRACK_EFFECTS[randomEffect2],
  };
}
