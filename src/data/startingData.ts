import { Genre, DiceType, Dice, Song } from "@/types";

// Starter dice for each genre
export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Ballad: [
    { id: "ballad-starter-1", type: "d6", genre: "Ballad" },
    { id: "ballad-starter-2", type: "d6", genre: "Ballad" },
  ],
  Folk: [
    { id: "folk-starter-1", type: "d6", genre: "Folk" },
    { id: "folk-starter-2", type: "d6", genre: "Folk" },
  ],
  Hymn: [
    { id: "hymn-starter-1", type: "d6", genre: "Hymn" },
    { id: "hymn-starter-2", type: "d6", genre: "Hymn" },
  ],
  Shanty: [
    { id: "shanty-starter-1", type: "d6", genre: "Shanty" },
    { id: "shanty-starter-2", type: "d6", genre: "Shanty" },
  ],
};

// Create 3 starter songs: first has 2 dice, others are empty. All untitled with no effects.
export function createStarterSongs(genre: Genre, playerId: string): Song[] {
  const starterDice = STARTER_DICE[genre];

  return [
    {
      id: `${playerId}-song-1`,
      name: '',
      slots: [{ dice: starterDice[0] }, { dice: starterDice[1] }],
      effects: [],
      used: false,
    },
    {
      id: `${playerId}-song-2`,
      name: '',
      slots: [{ dice: null }, { dice: null }],
      effects: [],
      used: false,
    },
    {
      id: `${playerId}-song-3`,
      name: '',
      slots: [{ dice: null }, { dice: null }],
      effects: [],
      used: false,
    },
  ];
}

// Dice upgrade path
export const DICE_UPGRADE_PATH: { [key in DiceType]: DiceType | null } = {
  d4: "d6",
  d6: "d8",
  d8: "d12",
  d12: null, // Max level
};

// Fame thresholds for phase transitions (tuned for ~6-8 round games)
export const FAME_THRESHOLDS = {
  undergroundScene: 150, // Total collective fame needed
  finalBoss: 300, // Total collective fame needed
};

// Fame multipliers based on total monsters defeated
export function calculateFameMultiplier(monstersDefeated: number): number {
  if (monstersDefeated >= 10) return 4;
  if (monstersDefeated >= 7) return 3;
  if (monstersDefeated >= 4) return 2;
  return 1;
}
