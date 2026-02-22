import { DraftCard, Dice, Genre, DiceType } from "@/types";
import { TRACK_EFFECTS } from "./trackEffects";

let cardIdCounter = 0;

function generateCardId(): string {
  return `card-${Date.now()}-${cardIdCounter++}`;
}

// Dice pair configurations with costs
// Pricing is based on total dice face value (sum of max faces).
// Costs are higher to balance against rising EXP from harder monsters.
// Two d20s are never sold.
export const DICE_PAIR_TEMPLATES: Array<{
  genre: Genre;
  dice1: DiceType;
  dice2: DiceType;
  cost: number;
  name: string;
}> = [
  // d4 + d4 (value 8) — 8 EXP, cheapest
  { genre: "Ballad", dice1: "d4", dice2: "d4", cost: 8, name: "Ballad Warmup" },
  { genre: "Folk", dice1: "d4", dice2: "d4", cost: 8, name: "Folk Warmup" },
  { genre: "Hymn", dice1: "d4", dice2: "d4", cost: 8, name: "Hymn Warmup" },
  { genre: "Shanty", dice1: "d4", dice2: "d4", cost: 8, name: "Shanty Warmup" },

  // d4 + d6 (value 10) — 10 EXP
  { genre: "Ballad", dice1: "d4", dice2: "d6", cost: 10, name: "Ballad Opener" },
  { genre: "Folk", dice1: "d4", dice2: "d6", cost: 10, name: "Folk Opener" },
  { genre: "Hymn", dice1: "d4", dice2: "d6", cost: 10, name: "Hymn Opener" },
  { genre: "Shanty", dice1: "d4", dice2: "d6", cost: 10, name: "Shanty Opener" },

  // d6 + d6 (value 12) — 12 EXP
  { genre: "Ballad", dice1: "d6", dice2: "d6", cost: 12, name: "Ballad Duo" },
  { genre: "Folk", dice1: "d6", dice2: "d6", cost: 12, name: "Folk Duo" },
  { genre: "Hymn", dice1: "d6", dice2: "d6", cost: 12, name: "Hymn Duo" },
  { genre: "Shanty", dice1: "d6", dice2: "d6", cost: 12, name: "Shanty Duo" },

  // d4 + d12 (value 16) — 16 EXP
  { genre: "Ballad", dice1: "d4", dice2: "d12", cost: 16, name: "Ballad Gambit" },
  { genre: "Folk", dice1: "d4", dice2: "d12", cost: 16, name: "Folk Gambit" },
  { genre: "Hymn", dice1: "d4", dice2: "d12", cost: 16, name: "Hymn Gambit" },
  { genre: "Shanty", dice1: "d4", dice2: "d12", cost: 16, name: "Shanty Gambit" },

  // d6 + d12 (value 18) — 20 EXP, the "average" baseline
  { genre: "Ballad", dice1: "d6", dice2: "d12", cost: 20, name: "Ballad Verse" },
  { genre: "Folk", dice1: "d6", dice2: "d12", cost: 20, name: "Folk Reel" },
  { genre: "Hymn", dice1: "d6", dice2: "d12", cost: 20, name: "Hymn Chant" },
  { genre: "Shanty", dice1: "d6", dice2: "d12", cost: 20, name: "Shanty Call" },

  // d4 + d20 (value 24) — 22 EXP, high variance
  { genre: "Ballad", dice1: "d4", dice2: "d20", cost: 25, name: "Ballad of Flames" },
  { genre: "Folk", dice1: "d4", dice2: "d20", cost: 25, name: "Folk Anthem" },
  { genre: "Hymn", dice1: "d4", dice2: "d20", cost: 25, name: "Hymn Crescendo" },
  { genre: "Shanty", dice1: "d4", dice2: "d20", cost: 25, name: "Shanty Storm" },

  // d12 + d12 (value 24) — 25 EXP
  { genre: "Ballad", dice1: "d12", dice2: "d12", cost: 25, name: "Ballad Inferno" },
  { genre: "Folk", dice1: "d12", dice2: "d12", cost: 25, name: "Folk Harvest" },
  { genre: "Hymn", dice1: "d12", dice2: "d12", cost: 25, name: "Hymn Gale" },
  { genre: "Shanty", dice1: "d12", dice2: "d12", cost: 25, name: "Shanty Maelstrom" },

  // d20 + d6 (value 26) — 30 EXP
  { genre: "Ballad", dice1: "d20", dice2: "d6", cost: 30, name: "Ballad Showstopper" },
  { genre: "Folk", dice1: "d20", dice2: "d6", cost: 30, name: "Folk Showstopper" },
  { genre: "Hymn", dice1: "d20", dice2: "d6", cost: 30, name: "Hymn Showstopper" },
  { genre: "Shanty", dice1: "d20", dice2: "d6", cost: 30, name: "Shanty Showstopper" },

  // d20 + d12 (value 32) — 35 EXP, most expensive
  { genre: "Ballad", dice1: "d20", dice2: "d12", cost: 35, name: "Ballad Legendary" },
  { genre: "Folk", dice1: "d20", dice2: "d12", cost: 35, name: "Folk Legendary" },
  { genre: "Hymn", dice1: "d20", dice2: "d12", cost: 35, name: "Hymn Legendary" },
  { genre: "Shanty", dice1: "d20", dice2: "d12", cost: 35, name: "Shanty Legendary" },
];

/**
 * Calculate studio level from monsters defeated.
 * Level 1 (0-4 kills): prioritizes cheap dice
 * Level 2 (5-9 kills): balanced mix
 * Level 3 (10+ kills): prioritizes expensive dice
 */
export function getStudioLevel(monstersDefeated: number): number {
  if (monstersDefeated >= 10) return 3;
  if (monstersDefeated >= 5) return 2;
  return 1;
}

// Cost tier boundaries
const COST_TIERS = {
  cheap: { min: 0, max: 10 }, // d4+d4(8), d4+d6(10), d6+d6(12)
  mid: { min: 11, max: 20 }, // d4+d12(16), d6+d12(19)
  expensive: { min: 21, max: 99 }, // d4+d20(22), d12+d12(25), d20+d6(25), d20+d12(30)
};

// Weights per studio level: [cheap, mid, expensive]
const TIER_WEIGHTS: Record<number, [number, number, number]> = {
  1: [60, 30, 10],
  2: [25, 50, 25],
  3: [10, 30, 60],
};

function getTemplatesByTier() {
  return {
    cheap: DICE_PAIR_TEMPLATES.filter((t) => t.cost <= COST_TIERS.cheap.max),
    mid: DICE_PAIR_TEMPLATES.filter(
      (t) => t.cost > COST_TIERS.cheap.max && t.cost <= COST_TIERS.mid.max,
    ),
    expensive: DICE_PAIR_TEMPLATES.filter((t) => t.cost > COST_TIERS.mid.max),
  };
}

function pickWeightedTemplate(studioLevel: number) {
  const weights = TIER_WEIGHTS[studioLevel] || TIER_WEIGHTS[1];
  const tiers = getTemplatesByTier();
  const tierArrays = [tiers.cheap, tiers.mid, tiers.expensive];

  // Weighted random selection of tier
  const roll = Math.random() * 100;
  let tierIndex = 0;
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      tierIndex = i;
      break;
    }
  }

  const selectedTier = tierArrays[tierIndex];
  return selectedTier[Math.floor(Math.random() * selectedTier.length)];
}

export function generateDicePairCard(playerId: string, studioLevel: number = 1): DraftCard {
  const template = pickWeightedTemplate(studioLevel);

  const dice: Dice[] = [
    {
      id: `${playerId}-dice-${generateCardId()}-1`,
      type: template.dice1,
      genre: template.genre,
    },
    {
      id: `${playerId}-dice-${generateCardId()}-2`,
      type: template.dice2,
      genre: template.genre,
    },
  ];

  return {
    id: generateCardId(),
    type: "dice",
    cost: template.cost,
    dice,
  };
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
    songEffect2: TRACK_EFFECTS[randomEffect2], // All songs now have 2 effects
  };
}

export function generateDraftCards(playerId: string, count: number = 3): DraftCard[] {
  const cards: DraftCard[] = [];

  for (let i = 0; i < count; i++) {
    // 70% chance for dice, 30% for song
    if (Math.random() < 0.7) {
      cards.push(generateDicePairCard(playerId));
    } else {
      cards.push(generateSongCard());
    }
  }

  return cards;
}
