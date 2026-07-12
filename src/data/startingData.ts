import { Genre, DiceType, Dice, Song } from '../types';

// Starter dice for each genre: 1 d4 + 1 d6
export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Ballad: [
    { id: "ballad-starter-1", type: "d4", genre: "Ballad" },
    { id: "ballad-starter-2", type: "d6", genre: "Ballad" },
  ],
  Folk: [
    { id: "folk-starter-1", type: "d4", genre: "Folk" },
    { id: "folk-starter-2", type: "d6", genre: "Folk" },
  ],
  Hymn: [
    { id: "hymn-starter-1", type: "d4", genre: "Hymn" },
    { id: "hymn-starter-2", type: "d6", genre: "Hymn" },
  ],
  Shanty: [
    { id: "shanty-starter-1", type: "d4", genre: "Shanty" },
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
      effect: null,
      used: false,
    },
    {
      id: `${playerId}-song-2`,
      name: '',
      slots: [{ dice: null }, { dice: null }],
      effect: null,
      used: false,
    },
    {
      id: `${playerId}-song-3`,
      name: '',
      slots: [{ dice: null }, { dice: null }],
      effect: null,
      used: false,
    },
  ];
}

// Dice upgrade path
export const DICE_UPGRADE_PATH: { [key in DiceType]: DiceType | null } = {
  d4: "d6",
  d6: "d12",
  d12: "d20",
  d20: null, // Max level
};

// Fame thresholds for phase transitions
export const FAME_THRESHOLDS = {
  finalBoss: 300, // Any single player reaching this triggers the final boss
};
