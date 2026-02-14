import { TrackEffect } from "@/types";

export const TRACK_EFFECTS: { [key: string]: TrackEffect } = {
  freeReroll: { type: "freeReroll", used: false },
  upgrade: { type: "upgrade", used: false },
  flip: { type: "flip" },
  addFlat: { type: "addFlat", amount: 3 },
  rerollOnes: { type: "rerollOnes" },
  addD6: { type: "addDice", diceType: "d6", used: false },
  rollTwice: { type: "rollTwiceKeepHigher" },
  explosive: { type: "explosive" },
  harmonize: { type: "harmonize", bonusDamage: 4 },
  gamble: { type: "gamble" },
  offbeat: { type: "offbeat" },
};

// User-friendly names for display
export const TRACK_EFFECT_NAMES: { [key: string]: string } = {
  freeReroll: "Second Chance",
  upgrade: "Level Up",
  flip: "Reversal",
  addFlat: "Bonus Damage",
  rerollOnes: "No Duds",
  addDice: "Bonus Die",
  rollTwiceKeepHigher: "Double Take",
  explosive: "Chain Reaction",
  harmonize: "Harmonize",
  gamble: "All or Nothing",
  offbeat: "Offbeat",
};

// Descriptions for tooltips and shop
export const TRACK_EFFECT_DESCRIPTIONS: { [key: string]: string } = {
  freeReroll: "Reroll once",
  upgrade: "Die becomes stronger",
  flip: "Invert the roll",
  addFlat: "+5 damage",
  rerollOnes: "Auto-reroll 1s",
  addD6: "Extra d6 roll",
  rollTwice: "Roll twice, keep best",
  explosive: "Crits chain extra roll",
  harmonize: "Matching dice: +4",
  gamble: "Gamble with d12",
  offbeat: "Odd 2×, Even 0.5×",
};
