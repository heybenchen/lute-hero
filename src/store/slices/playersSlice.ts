import { StateCreator } from 'zustand'
import { Player, Genre, Song, Dice, SongSlot } from '@/types'
import { createStarterSong } from '@/data/startingData'
import {
  awardFame,
  awardExp,
  incrementMonstersDefeated,
} from '@/game-logic/fame/calculator'

export const MAX_SONGS = 3

export interface PlayersSlice {
  // State
  players: Player[]

  // Actions
  initializePlayers: (playerConfigs: { name: string; starterGenre: Genre; color: string }[]) => void
  movePlayer: (playerId: string, newSpaceId: number) => void
  usePlayerFight: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  addSongToPlayer: (playerId: string, song: Song) => void
  replaceSongForPlayer: (playerId: string, oldSongId: string, newSong: Song) => void
  addDiceToPlayer: (playerId: string, dice: Dice, songId: string, slotIndex: number) => void
  awardPlayerFame: (playerId: string, amount: number) => void
  awardPlayerExp: (playerId: string, amount: number) => void
  incrementPlayerMonstersDefeated: (playerId: string, count: number) => void
  eliminatePlayer: (playerId: string) => void
  resetPlayerMoves: (playerId: string) => void
  resetPlayerFights: (playerId: string) => void
  setPlayerShopped: (playerId: string) => void
}

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
const STARTING_POSITIONS = [0, 2, 7, 13] // Edge spaces

export const createPlayersSlice: StateCreator<PlayersSlice> = (set, get) => ({
  // Initial state
  players: [],

  // Actions
  initializePlayers: (playerConfigs) => {
    const players: Player[] = playerConfigs.map((config, index) => {
      const playerId = `player-${index + 1}`
      const starterSong = createStarterSong(config.starterGenre, playerId)

      return {
        id: playerId,
        name: config.name,
        color: config.color || PLAYER_COLORS[index] || '#888888',
        position: STARTING_POSITIONS[index] || 0,
        songs: [starterSong],
        exp: 0,
        fame: 0,
        monstersDefeated: 0,
        isEliminated: false,
        totalBossDamage: 0,
        movesThisTurn: 0,
        fightsThisTurn: 0,
        hasShoppedThisTurn: false,
      }
    })

    set({ players })
  },

  movePlayer: (playerId, newSpaceId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, position: newSpaceId, movesThisTurn: p.movesThisTurn + 1 } : p
      ),
    })
  },

  usePlayerFight: (playerId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, fightsThisTurn: p.fightsThisTurn + 1 } : p
      ),
    })
  },

  updatePlayer: (playerId, updates) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    })
  },

  addSongToPlayer: (playerId, song) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, songs: [...p.songs, song] } : p
      ),
    })
  },

  replaceSongForPlayer: (playerId, oldSongId, newSong) => {
    set({
      players: get().players.map((p) => {
        if (p.id !== playerId) return p
        return {
          ...p,
          songs: p.songs.map((s) => (s.id === oldSongId ? newSong : s)),
        }
      }),
    })
  },

  addDiceToPlayer: (playerId, dice, songId, slotIndex) => {
    set({
      players: get().players.map((p) => {
        if (p.id !== playerId) return p

        const updatedSongs = p.songs.map((song) => {
          if (song.id !== songId) return song

          const updatedSlots = [...song.slots]
          updatedSlots[slotIndex] = {
            ...updatedSlots[slotIndex],
            dice,
          }

          return {
            ...song,
            slots: updatedSlots as [SongSlot, SongSlot],
          }
        })

        return { ...p, songs: updatedSongs }
      }),
    })
  },

  awardPlayerFame: (playerId, amount) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? awardFame(p, amount) : p
      ),
    })
  },

  awardPlayerExp: (playerId, amount) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? awardExp(p, amount) : p
      ),
    })
  },

  incrementPlayerMonstersDefeated: (playerId, count) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? incrementMonstersDefeated(p, count) : p
      ),
    })
  },

  eliminatePlayer: (playerId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, isEliminated: true } : p
      ),
    })
  },

  resetPlayerMoves: (playerId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, movesThisTurn: 0 } : p
      ),
    })
  },

  resetPlayerFights: (playerId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, fightsThisTurn: 0 } : p
      ),
    })
  },

  setPlayerShopped: (playerId) => {
    set({
      players: get().players.map((p) =>
        p.id === playerId ? { ...p, hasShoppedThisTurn: true } : p
      ),
    })
  },
})
