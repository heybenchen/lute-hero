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
  }

  return {
    modifiedRoll,
    updatedEffect,
    additionalRolls,
  }
}

/**
 * Calculate flat bonuses from effects
 */
export function calculateEffectBonuses(slots: SongSlot[]): number {
  let bonus = 0

  slots.forEach((slot) => {
    if (slot.effect?.type === 'addFlat') {
      bonus += slot.effect.amount
    }
  })

  return bonus
}

/**
 * Calculate damage multipliers from effects
 */
export function calculateEffectMultipliers(slots: SongSlot[]): number {
  let multiplier = 1

  slots.forEach((slot) => {
    if (slot.effect?.type === 'multiplyDamage') {
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
