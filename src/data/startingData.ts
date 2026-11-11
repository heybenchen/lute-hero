import { Genre, DiceType, Dice, Song } from '../types/index.js';

// Starter dice: a d8 of the bard's chosen element and a d4 of its opposite.
export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Ballad: [
    { id: "ballad-starter-1", type: "d8", genre: "Ballad" },
    { id: "ballad-starter-2", type: "d4", genre: "Shanty" },
  ],
  Folk: [
    { id: "folk-starter-1", type: "d8", genre: "Folk" },
    { id: "folk-starter-2", type: "d4", genre: "Hymn" },
  ],
  Hymn: [
    { id: "hymn-starter-1", type: "d8", genre: "Hymn" },
    { id: "hymn-starter-2", type: "d4", genre: "Folk" },
  ],
  Shanty: [
    { id: "shanty-starter-1", type: "d8", genre: "Shanty" },
    { id: "shanty-starter-2", type: "d4", genre: "Ballad" },
  ],
};

/** Every bard carries this many songs; each song holds exactly one die. */
export const SONGS_PER_BARD = 6;

// Create 6 starter songs of one die each: the first two hold the starter dice.
export function createStarterSongs(genre: Genre, playerId: string): Song[] {
  const starterDice = STARTER_DICE[genre];

  return Array.from({ length: SONGS_PER_BARD }, (_, i): Song => ({
    id: `${playerId}-song-${i + 1}`,
    slots: [{ dice: starterDice[i] ?? null }],
    used: false,
  }));
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
