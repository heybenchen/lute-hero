import { TrackEffect } from '@/types'

export const TRACK_EFFECTS: { [key: string]: TrackEffect } = {
  freeReroll: { type: 'freeReroll', used: false },
  doubleCrit: { type: 'doubleCrit' },
  upgrade: { type: 'upgrade', used: false },
  flip: { type: 'flip' },
  addFlat3: { type: 'addFlat', amount: 3 },
  addFlat5: { type: 'addFlat', amount: 5 },
  multiply15x: { type: 'multiplyDamage', multiplier: 1.5 },
  multiply2x: { type: 'multiplyDamage', multiplier: 2 },
  rerollOnes: { type: 'rerollOnes' },
  guaranteedCrit: { type: 'guaranteedCrit', used: false },
  addD6: { type: 'addDice', diceType: 'd6', used: false },
  rollTwice: { type: 'rollTwiceKeepHigher' },
  explosive: { type: 'explosive' },
  harmonize: { type: 'harmonize', bonusDamage: 4 },
  gamble: { type: 'gamble' },
  offbeat: { type: 'offbeat' },
}

// User-friendly names for display
export const TRACK_EFFECT_NAMES: { [key: string]: string } = {
  freeReroll: 'Second Chance',
  doubleCrit: 'Power Crit',
  upgrade: 'Level Up',
  flip: 'Reversal',
  addFlat: 'Bonus Damage',
  multiplyDamage: 'Amplify',
  rerollOnes: 'No Duds',
  guaranteedCrit: 'Perfect Note',
  addDice: 'Bonus Die',
  rollTwiceKeepHigher: 'Double Take',
  explosive: 'Chain Reaction',
  harmonize: 'Harmonize',
  gamble: 'All or Nothing',
  offbeat: 'Offbeat',
}

// Descriptions for tooltips and shop
export const TRACK_EFFECT_DESCRIPTIONS: { [key: string]: string } = {
  freeReroll: 'Reroll once',
  doubleCrit: 'Crits deal +10',
  upgrade: 'Die becomes stronger',
  flip: 'Invert the roll',
  addFlat3: '+3 damage',
  addFlat5: '+5 damage',
  multiply15x: '1.5× damage',
  multiply2x: '2× damage',
  rerollOnes: 'Auto-reroll 1s',
  guaranteedCrit: 'Guaranteed crit',
  addD6: 'Extra d6 roll',
  rollTwice: 'Roll twice, keep best',
  explosive: 'Crits chain extra roll',
  harmonize: 'Matching dice: +4',
  gamble: 'Gamble with d12',
  offbeat: 'Odd 2×, Even 0.5×',
}
