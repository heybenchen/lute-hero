import { TrackEffect } from "@/types";

export const TRACK_EFFECTS: { [key: string]: TrackEffect } = {
  freeReroll: { type: "freeReroll", used: false },
  upgrade: { type: "upgrade", used: false },
  flip: { type: "flip" },
  addFlat: { type: "addFlat", amount: 2 },
  addDice: { type: "addDice", diceType: "d6", used: false },
  rollTwiceKeepHigher: { type: "rollTwiceKeepHigher" },
  harmonize: { type: "harmonize", bonusDamage: 4 },
  offbeat: { type: "offbeat" },
  wildDice: { type: "wildDice", used: false },
  tempo: { type: "tempo" },
  dynamicRange: { type: "dynamicRange" },
  dropTheBass: { type: "dropTheBass" },
  lucky7: { type: "lucky7" },
  powerChord: { type: "powerChord" },
  crescendo: { type: "crescendo" },
  monoOut: { type: "monoOut" },
};

// User-friendly names for display
export const TRACK_EFFECT_NAMES: { [key: string]: string } = {
  freeReroll: "Second Chance",
  upgrade: "Level Up",
  flip: "Reversal",
  addFlat: "Bonus Damage",
  addDice: "Bonus Die",
  rollTwiceKeepHigher: "Double Take",
  harmonize: "Harmonize",
  offbeat: "Offbeat",
  wildDice: "Wild Roll",
  tempo: "Tempo",
  dynamicRange: "Dynamic Range",
  dropTheBass: "Drop the Bass",
  lucky7: "Lucky Seven",
  powerChord: "Power Chord",
  crescendo: "Crescendo",
  monoOut: "Mono Out",
};

// Descriptions for tooltips and shop
export const TRACK_EFFECT_DESCRIPTIONS: { [key: string]: string } = {
  freeReroll: "Reroll once",
  upgrade: "Die becomes stronger",
  flip: "Flip only if it helps",
  addFlat: "+2 damage",
  addDice: "Roll an extra d6",
  rollTwiceKeepHigher: "Roll twice, keep best",
  harmonize: "Matching dice: +4",
  offbeat: "Odd 2×, Even 0.5×",
  wildDice: "Add one extra d4 roll",
  tempo: "Add lowest die as bonus",
  dynamicRange: "Spread ≥6: +4 damage",
  dropTheBass: "Both 1s: +9 damage",
  lucky7: "Any 7 showing: +3 damage",
  powerChord: "3s deal double damage",
  crescendo: "Total ≥15: +5 damage",
  monoOut: "Roll once for both slots",
};
