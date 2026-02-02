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
  vampiric20: { type: 'vampiric', healPercent: 20 },
  explosive: { type: 'explosive' },
}

export const TRACK_EFFECT_DESCRIPTIONS: { [key: string]: string } = {
  freeReroll: 'Reroll this die once (one-time)',
  doubleCrit: 'Critical hits deal +10 instead of +5',
  upgrade: 'Upgrade this die one tier (one-time)',
  flip: 'Use the opposite value of the roll',
  addFlat3: 'Add +3 to this die',
  addFlat5: 'Add +5 to this die',
  multiply15x: 'Multiply this die by 1.5x',
  multiply2x: 'Multiply this die by 2x',
  rerollOnes: 'Reroll if you roll a 1',
  guaranteedCrit: 'Force a critical hit (one-time)',
  addD6: 'Add an extra d6 to this song (one-time)',
  rollTwice: 'Roll twice, keep the higher value',
  vampiric20: 'Heal 20% of damage dealt',
  explosive: 'Critical hits trigger an additional roll',
}
