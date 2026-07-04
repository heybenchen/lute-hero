import { StateCreator } from 'zustand'
import { Monster, Song, SongUsage, KillCredit, DiceRoll, DamageCalculation } from '@/types'
import { rollSong, calculateAOEDamage } from '@/game-logic/combat/damageCalculator'

export const MAX_SONGS_PER_COMBAT = 3

export interface CombatSlice {
  // State
  isActive: boolean
  playerId: string | null
  spaceId: number | null
  monsters: Monster[]
  songsUsed: SongUsage[]
  killCredits: KillCredit[]
  currentSongId: string | null
  rolls: DiceRoll[]
  totalDamage: number
  lastDamageCalculations: DamageCalculation[]

  // Actions
  startCombat: (playerId: string, spaceId: number, monsters: Monster[]) => void
  playSong: (song: Song, ownerId: string) => { rolls: DiceRoll[]; updatedMonsters: Monster[]; damageCalculations: DamageCalculation[] }
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
  killCredits: [],
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
      killCredits: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
      lastDamageCalculations: [],
    })
  },

  playSong: (song, ownerId) => {
    const state = get()
    const isCover = ownerId !== state.playerId

    // Snapshot monsters before damage
    const monstersBefore = state.monsters

    // Roll the song
    const { rolls } = rollSong(song)

    // Calculate damage against all monsters
    const { damageCalculations, updatedMonsters } = calculateAOEDamage(
      song,
      rolls,
      monstersBefore
    )

    // Calculate total damage dealt
    const totalDamageDealt = damageCalculations.reduce(
      (sum, calc) => sum + calc.totalDamage,
      0
    )

    // Track newly killed monsters (alive before, dead after)
    const newKillCredits: KillCredit[] = updatedMonsters
      .filter((m, i) => monstersBefore[i].currentHP > 0 && m.currentHP <= 0)
      .map((m) => ({ monsterId: m.id, songOwnerId: ownerId, isCover }))

    // Update state
    set({
      monsters: updatedMonsters,
      songsUsed: [...state.songsUsed, { songId: song.id, ownerId, isCover }],
      killCredits: [...state.killCredits, ...newKillCredits],
      currentSongId: song.id,
      rolls,
      totalDamage: state.totalDamage + totalDamageDealt,
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
      killCredits: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
      lastDamageCalculations: [],
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
      killCredits: [],
      currentSongId: null,
      rolls: [],
      totalDamage: 0,
      lastDamageCalculations: [],
    })
  },
})
