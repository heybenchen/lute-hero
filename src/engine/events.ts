import { DiceRoll, DamageCalculation, Monster, Genre } from '../types/index.js'
import { ShowdownPerformance } from '../game-logic/showdown/showdown.js'

/**
 * Side-channel facts about what happened during an action, for UI animation
 * (dice tumbles, damage popups, fandom bursts). The server also broadcasts
 * these over SSE so every client plays the same animation exactly once —
 * dedup keys are assigned at the transport layer (`${seq}:${index}`).
 */
export type EngineEvent =
  | {
      type: 'diceRolled'
      playerId: string
      songId: string
      context: 'combat' | 'showdown'
      rolls: DiceRoll[]
    }
  | {
      type: 'damageDealt'
      calculations: DamageCalculation[]
      monstersBefore: Monster[]
      monstersAfter: Monster[]
    }
  | {
      type: 'showdownPlay'
      playerId: string
      songId: string
      fandom: number
      hadCrit: boolean
      hitWeakness: boolean
      wasResisted: boolean
      genre: Genre | null
    }
  | {
      type: 'showdownAdvance'
      advance: 'nextPerformer' | 'bossAdapts' | 'showdownComplete'
      turnEnded?: number
      recap?: ShowdownPerformance[]
    }
  | {
      type: 'combatEnded'
      playerId: string
      success: boolean
      monstersDefeated: number
    }
