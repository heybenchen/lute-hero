import { Player, Monster, GamePhase } from '@/types'
import { FAME_THRESHOLDS } from '@/data/startingData'

/**
 * Fame per monster level. Since songs hit all monsters at once (AOE),
 * high-level monsters ramp up steeply to make the tough fights the real
 * fame payoffs. Level 1 monsters award no fame. Levels past 5 clamp to the
 * top value, matching the HP multiplier cap.
 */
export const MONSTER_FAME_BY_LEVEL = [0, 10, 30, 60, 100]

/** Fame a monster is worth by level. */
export function calculateMonsterFameValue(level: number): number {
  const capped = Math.min(Math.max(level, 1), MONSTER_FAME_BY_LEVEL.length)
  return MONSTER_FAME_BY_LEVEL[capped - 1]
}

/**
 * Calculate fame earned from defeating monsters — the sum of each
 * defeated monster's level-based fame value.
 */
export function calculateFameEarned(defeatedMonsterLevels: number[]): number {
  return defeatedMonsterLevels.reduce(
    (sum, level) => sum + calculateMonsterFameValue(level),
    0
  )
}

/**
 * Calculate EXP reward for a single monster based on level
 * Formula: 5 + level * 5 (Lv1=10, Lv2=15, Lv3=20, Lv4=25)
 */
export function calculateMonsterExp(level: number): number {
  return 5 + level * 5
}

/**
 * Calculate total EXP from an array of monsters
 */
export function calculateTotalMonsterExp(monsters: Monster[]): number {
  return monsters.reduce((total, m) => total + calculateMonsterExp(m.level), 0)
}

/**
 * Calculate bonus EXP for failing a combat (catchup mechanic)
 */
export function calculateFailureBonus(baseExp: number): number {
  return Math.floor(baseExp * 1.5) // 50% bonus EXP
}

/**
 * Calculate collective fame across all players
 */
export function calculateCollectiveFame(players: Player[]): number {
  return players.reduce((total, player) => total + player.fame, 0)
}

/**
 * Calculate total monsters defeated by all players
 */
export function calculateTotalMonstersDefeated(players: Player[]): number {
  return players.reduce(
    (total, player) => total + player.monstersDefeated,
    0
  )
}

/**
 * Award fame to a player
 */
export function awardFame(player: Player, fameAmount: number): Player {
  return {
    ...player,
    fame: player.fame + fameAmount,
  }
}

/**
 * Award EXP to a player
 */
export function awardExp(player: Player, expAmount: number): Player {
  return {
    ...player,
    exp: player.exp + expAmount,
  }
}

/**
 * Increment monsters defeated counter
 */
export function incrementMonstersDefeated(
  player: Player,
  count: number
): Player {
  return {
    ...player,
    monstersDefeated: player.monstersDefeated + count,
  }
}

/**
 * Determine the next game phase based on individual player fame.
 * Triggers when ANY single player reaches FAME_THRESHOLDS.finalBoss.
 */
export function getNextPhase(currentPhase: GamePhase, playerFames: number[]): GamePhase | null {
  if (currentPhase === 'main' && playerFames.some(f => f >= FAME_THRESHOLDS.finalBoss)) {
    return 'finalBoss'
  }
  return null
}

/**
 * Calculate final rankings for players
 */
export function calculateFinalRankings(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    // First by fame
    if (b.fame !== a.fame) {
      return b.fame - a.fame
    }

    // Then by total boss damage (tiebreaker)
    return b.totalBossDamage - a.totalBossDamage
  })
}
