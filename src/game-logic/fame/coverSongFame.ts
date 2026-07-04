/**
 * Round a number down to the nearest multiple of 5
 */
export function roundDownTo5(n: number): number {
  return Math.floor(n / 5) * 5
}

/**
 * Calculate each player's share of fame when a cover song kills monsters.
 * Both the fighting player and the song owner get half, rounded down to nearest 5.
 */
export function calculateCoverFameSplit(totalFame: number): number {
  return roundDownTo5(totalFame / 2)
}
