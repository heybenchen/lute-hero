import { StateCreator } from 'zustand'
import { Monster, Song, DiceRoll, DamageCalculation } from '@/types'
import { rollSong, calculateAOEDamage } from '@/game-logic/combat/damageCalculator'

export interface CombatSlice {
  // State
  isActive: boolean
  playerId: string | null
  spaceId: number | null
  monsters: Monster[]
  songsUsed: string[]
  currentSongId: string | null
  rolls: DiceRoll[]
  totalDamage: number
  lastDamageCalculations: DamageCalculation[]

  // Actions
  startCombat: (playerId: string, spaceId: number, monsters: Monster[]) => void
  playSong: (song: Song) => { rolls: DiceRoll[]; updatedMonsters: Monster[]; damageCalculations: DamageCalculation[] }
  endCombat: (success: boolean) => { success: boolean; monstersDefeated: number }
  resetCombat: () => void
}

export const createCombatSlice: StateCreator<CombatSlice> = (set, get) => ({
  // Initial state
  isActive: false,
  playerId: null,
  spaceId: null,
  monsters: [],
  songsUsed: [],
  currentSongId: null,
  rolls: [],
  totalDamage: 0,
  lastDamageCalculations: [],

  // Actions
  startCombat: (playerId, spaceId, monsters) => {
    set({
      isActive: true,
      playerId,
      spaceId,
      monsters,
      songsUsed: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
      lastDamageCalculations: [],
    })
  },

  playSong: (song) => {
    // Roll the song
    const { rolls } = rollSong(song)

    // Calculate damage against all monsters
    const { damageCalculations, updatedMonsters } = calculateAOEDamage(
      song,
      rolls,
      get().monsters
    )

    // Calculate total damage dealt
    const totalDamageDealt = damageCalculations.reduce(
      (sum, calc) => sum + calc.totalDamage,
      0
    )

    // Update state
    set({
      monsters: updatedMonsters,
      songsUsed: [...get().songsUsed, song.id],
      currentSongId: song.id,
      rolls,
      totalDamage: get().totalDamage + totalDamageDealt,
      lastDamageCalculations: damageCalculations,
    })

    return { rolls, updatedMonsters, damageCalculations }
  },

  endCombat: (success) => {
    const monstersDefeated = get().monsters.filter((m) => m.currentHP <= 0).length

    set({
      isActive: false,
      playerId: null,
      spaceId: null,
      monsters: [],
      songsUsed: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
    })

    return { success, monstersDefeated }
  },

  resetCombat: () => {
    set({
      isActive: false,
      playerId: null,
      spaceId: null,
      monsters: [],
      songsUsed: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
      lastDamageCalculations: [],
    })
  },
})
