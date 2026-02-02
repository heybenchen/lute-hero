import { DiceType, DiceRoll, Dice } from '@/types'

/**
 * Get the maximum value for a given dice type
 */
export function getMaxValue(diceType: DiceType): number {
  switch (diceType) {
    case 'd4':
      return 4
    case 'd6':
      return 6
    case 'd12':
      return 12
    case 'd20':
      return 20
  }
}

/**
 * Get the minimum value for a dice roll (always 1)
 */
export function getMinValue(): number {
  return 1
}

/**
 * Roll a single die and return the value
 */
export function rollDie(diceType: DiceType): number {
  const max = getMaxValue(diceType)
  return Math.floor(Math.random() * max) + 1
}

/**
 * Roll a die and determine if it's a critical hit
 */
export function rollDiceWithCrit(dice: Dice): DiceRoll {
  const value = rollDie(dice.type)
  const maxValue = getMaxValue(dice.type)
  const isCrit = value === maxValue
  const critBonus = isCrit ? 5 : 0

  return {
    diceId: dice.id,
    value,
    isCrit,
    critBonus,
  }
}

/**
 * Flip a dice value (e.g., 3 on d20 becomes 17)
 */
export function flipDiceValue(value: number, diceType: DiceType): number {
  const max = getMaxValue(diceType)
  return max - value + 1
}

/**
 * Roll multiple dice at once
 */
export function rollMultipleDice(dice: Dice[]): DiceRoll[] {
  return dice.map(rollDiceWithCrit)
}

/**
 * Calculate total from dice rolls (base values only, no bonuses)
 */
export function calculateBaseDamage(rolls: DiceRoll[]): number {
  return rolls.reduce((sum, roll) => sum + roll.value, 0)
}

/**
 * Calculate total crit bonuses
 */
export function calculateCritBonuses(rolls: DiceRoll[]): number {
  return rolls.reduce((sum, roll) => sum + roll.critBonus, 0)
}
