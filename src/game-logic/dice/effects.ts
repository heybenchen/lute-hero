import {
  TrackEffect,
  DiceRoll,
  Dice,
  SongSlot,
} from '@/types'
import {
  getMaxValue,
  flipDiceValue,
  rollDiceWithCrit,
  rollDie,
} from './roller'
import { DICE_UPGRADE_PATH } from '@/data/startingData'

/**
 * Apply track effects to a dice roll
 * Returns modified roll and updated effect (if one-time use)
 */
export function applyTrackEffect(
  roll: DiceRoll,
  dice: Dice,
  effect: TrackEffect | null
): {
  modifiedRoll: DiceRoll
  updatedEffect: TrackEffect | null
  additionalRolls: DiceRoll[]
} {
  if (!effect) {
    return {
      modifiedRoll: roll,
      updatedEffect: null,
      additionalRolls: [],
    }
  }

  let modifiedRoll = { ...roll }
  let updatedEffect: TrackEffect | null = effect
  let additionalRolls: DiceRoll[] = []

  switch (effect.type) {
    case 'freeReroll':
      // In real implementation, this would need UI interaction
      // For now, just mark as available
      break

    case 'doubleCrit':
      if (roll.isCrit) {
        modifiedRoll.critBonus = 10 // Instead of 5
      }
      break

    case 'upgrade':
      // One-time upgrade when slotted
      // This happens during song building, not during roll
      break

    case 'flip':
      modifiedRoll.value = flipDiceValue(roll.value, dice.type)
      // Recalculate crit after flip
      if (modifiedRoll.value === getMaxValue(dice.type)) {
        modifiedRoll.isCrit = true
        modifiedRoll.critBonus = 5
      } else {
        modifiedRoll.isCrit = false
        modifiedRoll.critBonus = 0
      }
      break

    case 'addFlat':
      // Damage bonus applied later in damage calculation
      break

    case 'multiplyDamage':
      // Multiplier applied later in damage calculation
      break

    case 'rerollOnes':
      if (roll.value === 1) {
        modifiedRoll = rollDiceWithCrit(dice)
      }
      break

    case 'guaranteedCrit':
      if (!effect.used) {
        modifiedRoll.value = getMaxValue(dice.type)
        modifiedRoll.isCrit = true
        modifiedRoll.critBonus = 5
        updatedEffect = { ...effect, used: true }
      }
      break

    case 'addDice':
      if (!effect.used) {
        // Add extra die roll
        const extraDice: Dice = {
          id: `extra-${dice.id}`,
          type: effect.diceType,
          genre: dice.genre,
        }
        additionalRolls.push(rollDiceWithCrit(extraDice))
        updatedEffect = { ...effect, used: true }
      }
      break

    case 'rollTwiceKeepHigher':
      const secondRoll = rollDiceWithCrit(dice)
      if (secondRoll.value + secondRoll.critBonus > roll.value + roll.critBonus) {
        modifiedRoll = secondRoll
      }
      break

    case 'vampiric':
      // Healing applied after damage calculation
      break

    case 'explosive':
      if (roll.isCrit) {
        // Trigger additional roll on crit
        additionalRolls.push(rollDiceWithCrit(dice))
      }
      break

    case 'harmonize':
      // Bonus calculated at song level in calculateHarmonizeBonus
      break

    case 'gamble':
      // Roll a d12; if higher than original, keep it; else deal 0
      const gambleRoll = rollDie('d12')
      if (gambleRoll > roll.value) {
        modifiedRoll.value = gambleRoll
        // Check if gamble roll is a crit (rolled 12)
        if (gambleRoll === 12) {
          modifiedRoll.isCrit = true
          modifiedRoll.critBonus = 5
        } else {
          modifiedRoll.isCrit = false
          modifiedRoll.critBonus = 0
        }
      } else {
        // Gamble failed - deal 0 damage
        modifiedRoll.value = 0
        modifiedRoll.isCrit = false
        modifiedRoll.critBonus = 0
      }
      break

    case 'offbeat':
      // Multiplier applied in damage calculation via calculateOffbeatMultiplier
      break
  }

  return {
    modifiedRoll,
    updatedEffect,
    additionalRolls,
  }
}

/**
 * Calculate flat bonuses from effects
 * Only applies to slots that have dice
 */
export function calculateEffectBonuses(slots: SongSlot[]): number {
  let bonus = 0

  slots.forEach((slot) => {
    // Only apply effect if there's a dice in the slot
    if (slot.dice && slot.effect?.type === 'addFlat') {
      bonus += slot.effect.amount
    }
  })

  return bonus
}

/**
 * Calculate damage multipliers from effects
 * Only applies to slots that have dice
 */
export function calculateEffectMultipliers(slots: SongSlot[]): number {
  let multiplier = 1

  slots.forEach((slot) => {
    // Only apply effect if there's a dice in the slot
    if (slot.dice && slot.effect?.type === 'multiplyDamage') {
      multiplier *= slot.effect.multiplier
    }
  })

  return multiplier
}

/**
 * Upgrade a die to the next tier
 */
export function upgradeDice(dice: Dice): Dice {
  const nextTier = DICE_UPGRADE_PATH[dice.type]

  if (!nextTier) {
    return dice // Already max level
  }

  return {
    ...dice,
    type: nextTier,
  }
}

/**
 * Calculate harmonize bonus if any slot has harmonize effect
 * and 2+ dice rolled the same value
 */
export function calculateHarmonizeBonus(
  slots: SongSlot[],
  rolls: DiceRoll[]
): number {
  // Check if any slot has harmonize effect
  const harmonizeEffect = slots.find(
    (slot) => slot.effect?.type === 'harmonize'
  )?.effect

  if (!harmonizeEffect || harmonizeEffect.type !== 'harmonize') {
    return 0
  }

  // Check if 2+ dice rolled the same value
  const values = rolls.map((r) => r.value)
  const hasDuplicates = values.some(
    (val, idx) => values.indexOf(val) !== idx
  )

  return hasDuplicates ? harmonizeEffect.bonusDamage : 0
}

/**
 * Calculate offbeat multiplier for a single roll
 * Odd rolls = 2x, Even rolls = 0.5x
 */
export function calculateOffbeatMultiplier(
  roll: DiceRoll,
  slot: SongSlot
): number {
  if (slot.effect?.type !== 'offbeat') {
    return 1
  }

  // Odd values get 2x, even values get 0.5x
  return roll.value % 2 === 1 ? 2 : 0.5
}
