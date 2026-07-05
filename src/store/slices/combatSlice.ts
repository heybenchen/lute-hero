import { StateCreator } from 'zustand'
import { Monster, Song, SongUsage, KillCredit, DiceRoll, DamageCalculation } from '@/types'
import { rollSong, calculateAOEDamage } from '@/game-logic/combat/damageCalculator'

export const MAX_SONGS_PER_COMBAT = 3

/** Combat fields captured before a song play, so the play can be undone/rerolled. */
interface PlaySnapshot {
  monsters: Monster[]
  songsUsed: SongUsage[]
  killCredits: KillCredit[]
  totalDamage: number
}

export interface PlayResult {
  rolls: DiceRoll[]
  updatedMonsters: Monster[]
  damageCalculations: DamageCalculation[]
  monstersBefore: Monster[]
}

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
  // Reroll support: the state just before the last play + the song that was played
  undoSnapshot: PlaySnapshot | null
  lastPlayedSong: Song | null
  lastPlayedOwnerId: string | null

  // Actions
  startCombat: (playerId: string, spaceId: number, monsters: Monster[]) => void
  playSong: (song: Song, ownerId: string) => PlayResult
  rerollLastSong: () => PlayResult | null
  endCombat: (success: boolean) => { success: boolean; monstersDefeated: number }
  resetCombat: () => void
}

/** Apply a song performance to a base combat state, returning the resulting fields. */
function performPlay(base: PlaySnapshot, song: Song, ownerId: string, playerId: string | null) {
  const monstersBefore = base.monsters
  const isCover = ownerId !== playerId

  const { rolls } = rollSong(song)
  const { damageCalculations, updatedMonsters } = calculateAOEDamage(song, rolls, monstersBefore)
  const totalDamageDealt = damageCalculations.reduce((sum, calc) => sum + calc.totalDamage, 0)

  const newKillCredits: KillCredit[] = updatedMonsters
    .filter((m, i) => monstersBefore[i].currentHP > 0 && m.currentHP <= 0)
    .map((m) => ({ monsterId: m.id, songOwnerId: ownerId, isCover }))

  return {
    fields: {
      monsters: updatedMonsters,
      songsUsed: [...base.songsUsed, { songId: song.id, ownerId, isCover }],
      killCredits: [...base.killCredits, ...newKillCredits],
      currentSongId: song.id,
      rolls,
      totalDamage: base.totalDamage + totalDamageDealt,
      lastDamageCalculations: damageCalculations,
    },
    result: { rolls, updatedMonsters, damageCalculations, monstersBefore } as PlayResult,
  }
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
  undoSnapshot: null,
  lastPlayedSong: null,
  lastPlayedOwnerId: null,

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
      undoSnapshot: null,
      lastPlayedSong: null,
      lastPlayedOwnerId: null,
    })
  },

  playSong: (song, ownerId) => {
    const state = get()
    const snapshot: PlaySnapshot = {
      monsters: state.monsters,
      songsUsed: state.songsUsed,
      killCredits: state.killCredits,
      totalDamage: state.totalDamage,
    }

    const { fields, result } = performPlay(snapshot, song, ownerId, state.playerId)

    set({
      ...fields,
      undoSnapshot: snapshot,
      lastPlayedSong: song,
      lastPlayedOwnerId: ownerId,
    })

    return result
  },

  rerollLastSong: () => {
    const state = get()
    if (!state.undoSnapshot || !state.lastPlayedSong || state.lastPlayedOwnerId === null) {
      return null
    }

    // Replay the same song from the pre-play snapshot — a true reroll that
    // replaces the last result. undoSnapshot stays put so it can reroll again.
    const { fields, result } = performPlay(
      state.undoSnapshot,
      state.lastPlayedSong,
      state.lastPlayedOwnerId,
      state.playerId
    )

    set(fields)
    return result
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
      undoSnapshot: null,
      lastPlayedSong: null,
      lastPlayedOwnerId: null,
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
      undoSnapshot: null,
      lastPlayedSong: null,
      lastPlayedOwnerId: null,
    })
  },
})
