import { Genre, DiceType, Dice, Song } from '../types/index.js';

// Starter dice: two d4s of the bard's chosen element, one in each of the first two songs.
const starterPair = (genre: Genre): Dice[] => [1, 2].map((n) => ({
  id: `${genre.toLowerCase()}-starter-${n}`,
  type: "d4",
  genre,
}));

export const STARTER_DICE: { [key in Genre]: Dice[] } = {
  Ballad: starterPair("Ballad"),
  Folk: starterPair("Folk"),
  Hymn: starterPair("Hymn"),
  Shanty: starterPair("Shanty"),
};

/** Every bard carries this many songs; each song holds exactly one die. */
export const SONGS_PER_BARD = 6;

// Create 6 starter songs of one die each: the first two hold the starter d4s.
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
  finalBoss: 200, // Any single player reaching this triggers the final boss
};
