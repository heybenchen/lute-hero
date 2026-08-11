import { Genre, DiceType, Dice, Song } from '../types/index.js';

// Starter dice for each genre: a single d8 of the bard's chosen element.
export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Ballad: [{ id: "ballad-starter-1", type: "d8", genre: "Ballad" }],
  Folk: [{ id: "folk-starter-1", type: "d8", genre: "Folk" }],
  Hymn: [{ id: "hymn-starter-1", type: "d8", genre: "Hymn" }],
  Shanty: [{ id: "shanty-starter-1", type: "d8", genre: "Shanty" }],
};

// Create 3 starter songs: the first holds the single starter d8 in its first
// slot (its second slot is open), the others are empty.
export function createStarterSongs(genre: Genre, playerId: string): Song[] {
  const starterDice = STARTER_DICE[genre];

  return [
    {
      id: `${playerId}-song-1`,
      slots: [{ dice: starterDice[0] }, { dice: null }],
      used: false,
    },
    {
      id: `${playerId}-song-2`,
      slots: [{ dice: null }, { dice: null }],
      used: false,
    },
    {
      id: `${playerId}-song-3`,
      slots: [{ dice: null }, { dice: null }],
      used: false,
    },
  ];
}

// Dice upgrade path
export const DICE_UPGRADE_PATH: { [key in DiceType]: DiceType | null } = {
  d4: "d8",
  d8: "d12",
  d12: "d20",
  d20: null, // Max level
};

/** Every die type, weakest first. */
export const ALL_DICE_TYPES: DiceType[] = ["d4", "d8", "d12", "d20"];

// Fame thresholds for phase transitions
export const FAME_THRESHOLDS = {
  finalBoss: 150, // Any single player reaching this triggers the final boss
};
