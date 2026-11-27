import { Element, DiceType, Dice, Song } from '../types/index.js';

// Starter die: one d8 of the bard's chosen element, in their first song.
const starterDie = (element: Element): Dice[] => [{
  id: `${element.toLowerCase()}-starter-1`,
  type: "d8",
  element,
}];

export const STARTER_DICE: { [key in Element]: Dice[] } = {
  Ballad: starterDie("Ballad"),
  Folk: starterDie("Folk"),
  Hymn: starterDie("Hymn"),
  Shanty: starterDie("Shanty"),
};

/** Every bard carries this many songs; each song holds exactly one die. */
export const SONGS_PER_BARD = 6;

// Create 6 starter songs of one die each: the first holds the starter d8.
export function createStarterSongs(element: Element, playerId: string): Song[] {
  const starterDice = STARTER_DICE[element];

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
