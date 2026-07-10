import { StateCreator } from 'zustand'
import { Song, DiceRoll, Genre, Player } from '@/types'
import { rollSong, calculateDamage } from '@/game-logic/combat/damageCalculator'
import {
  SHOWDOWN_TURNS,
  ShowdownPerformance,
  createShowdownBoss,
  getDominantGenre,
  computeBossAdaptation,
} from '@/game-logic/showdown/showdown'

/** Each player performs exactly one song per showdown turn. */
export const SONGS_PER_SHOWDOWN_TURN = 1

/** Result of one song played against the boss, returned for UI animation. */
export interface ShowdownPlayResult {
  rolls: DiceRoll[]
  fandom: number
  hadCrit: boolean
  /** Dominant element of the performance */
  genre: Genre | null
  /** Song included dice matching the boss's exposed weakness (2x) */
  hitWeakness: boolean
  /** Song included dice the boss is immune to (0x) */
  wasResisted: boolean
}

/** What happened when a performance ended — drives the UI's next scene. */
export type ShowdownAdvance =
  | { kind: 'nextPerformer' }
  | { kind: 'bossAdapts'; turnEnded: number }
  | { kind: 'showdownComplete' }

export interface ShowdownSlice {
  // State
  showdownActive: boolean
  showdownComplete: boolean
  showdownTurn: number // 1..SHOWDOWN_TURNS
  showdownOrder: string[] // player ids in performance order
  showdownPerformerIdx: number
  showdownResistGenre: Genre | null // boss is immune to this element (0x)
  showdownWeakGenre: Genre | null // boss takes double damage from this element (2x)
  showdownSongsUsed: string[] // song ids the current performer has played
  showdownCurrentFandom: number // fandom earned by the current performer this turn
  showdownCurrentGenre: Genre | null // dominant element of the current performance
  showdownTurnPerformances: ShowdownPerformance[] // completed performances this turn
  showdownHistory: ShowdownPerformance[][] // one entry per completed turn
  showdownFandom: Record<string, number> // total fandom per player
  showdownBestHit: Record<string, { damage: number; songName: string }>
  showdownCrits: Record<string, number>

  // Actions
  startShowdown: (playerIds: string[]) => void
  playShowdownSong: (song: Song) => ShowdownPlayResult | null
  finishShowdownPerformance: () => ShowdownAdvance
  resetShowdown: () => void
}

const initialShowdownState = {
  showdownActive: false,
  showdownComplete: false,
  showdownTurn: 1,
  showdownOrder: [] as string[],
  showdownPerformerIdx: 0,
  showdownResistGenre: null as Genre | null,
  showdownWeakGenre: null as Genre | null,
  showdownSongsUsed: [] as string[],
  showdownCurrentFandom: 0,
  showdownCurrentGenre: null as Genre | null,
  showdownTurnPerformances: [] as ShowdownPerformance[],
  showdownHistory: [] as ShowdownPerformance[][],
  showdownFandom: {} as Record<string, number>,
  showdownBestHit: {} as Record<string, { damage: number; songName: string }>,
  showdownCrits: {} as Record<string, number>,
}

export const createShowdownSlice: StateCreator<ShowdownSlice> = (set, get) => ({
  ...initialShowdownState,

  startShowdown: (playerIds) => {
    set({
      ...initialShowdownState,
      showdownActive: true,
      showdownOrder: playerIds,
      showdownFandom: Object.fromEntries(playerIds.map((id) => [id, 0])),
      showdownCrits: Object.fromEntries(playerIds.map((id) => [id, 0])),
    })
  },

  playShowdownSong: (song) => {
    const state = get()
    if (!state.showdownActive || state.showdownComplete) return null
    if (state.showdownSongsUsed.length >= SONGS_PER_SHOWDOWN_TURN) return null
    if (state.showdownSongsUsed.includes(song.id)) return null

    const performerId = state.showdownOrder[state.showdownPerformerIdx]
    if (!performerId) return null

    // The boss carries its adaptation as ordinary monster weakness/resistance,
    // so the standard damage pipeline applies the 2x / 0x element multipliers.
    const boss = createShowdownBoss({
      resistGenre: state.showdownResistGenre,
      weakGenre: state.showdownWeakGenre,
    })
    const { rolls } = rollSong(song)
    const calc = calculateDamage(song, rolls, boss)
    const fandom = Math.max(0, calc.totalDamage)
    const genre = getDominantGenre(song, rolls)
    const critCount = rolls.filter((r) => r.isCrit).length

    const songGenres = song.slots
      .map((slot) => slot.dice?.genre)
      .filter((g): g is Genre => g !== undefined)
    const hitWeakness = state.showdownWeakGenre !== null && songGenres.includes(state.showdownWeakGenre)
    const wasResisted = state.showdownResistGenre !== null && songGenres.includes(state.showdownResistGenre)

    const prevBest = state.showdownBestHit[performerId]
    const bestHit =
      !prevBest || fandom > prevBest.damage
        ? { damage: fandom, songName: song.name || 'Untitled' }
        : prevBest

    set({
      showdownSongsUsed: [...state.showdownSongsUsed, song.id],
      showdownCurrentFandom: state.showdownCurrentFandom + fandom,
      showdownCurrentGenre: genre,
      showdownFandom: {
        ...state.showdownFandom,
        [performerId]: (state.showdownFandom[performerId] || 0) + fandom,
      },
      showdownBestHit: { ...state.showdownBestHit, [performerId]: bestHit },
      showdownCrits: {
        ...state.showdownCrits,
        [performerId]: (state.showdownCrits[performerId] || 0) + critCount,
      },
    })

    return { rolls, fandom, hadCrit: critCount > 0, genre, hitWeakness, wasResisted }
  },

  finishShowdownPerformance: () => {
    const state = get()
    const performerId = state.showdownOrder[state.showdownPerformerIdx]

    const performance: ShowdownPerformance = {
      playerId: performerId,
      fandom: state.showdownCurrentFandom,
      genre: state.showdownCurrentGenre,
    }
    const turnPerformances = [...state.showdownTurnPerformances, performance]

    // More performers left this turn
    if (state.showdownPerformerIdx < state.showdownOrder.length - 1) {
      set({
        showdownTurnPerformances: turnPerformances,
        showdownPerformerIdx: state.showdownPerformerIdx + 1,
        showdownSongsUsed: [],
        showdownCurrentFandom: 0,
        showdownCurrentGenre: null,
      })
      return { kind: 'nextPerformer' }
    }

    const history = [...state.showdownHistory, turnPerformances]

    // Turn over — boss adapts and the next turn begins
    if (state.showdownTurn < SHOWDOWN_TURNS) {
      const adaptation = computeBossAdaptation(turnPerformances)
      set({
        showdownHistory: history,
        showdownTurnPerformances: [],
        showdownTurn: state.showdownTurn + 1,
        showdownPerformerIdx: 0,
        showdownSongsUsed: [],
        showdownCurrentFandom: 0,
        showdownCurrentGenre: null,
        showdownResistGenre: adaptation.resistGenre,
        showdownWeakGenre: adaptation.weakGenre,
      })
      return { kind: 'bossAdapts', turnEnded: state.showdownTurn }
    }

    // Third turn complete — the boss falls. Bank fandom into fame and record
    // total boss damage on each player (players live on the combined store).
    const store = get() as ShowdownSlice & {
      players: Player[]
      updatePlayer: (playerId: string, updates: Partial<Player>) => void
    }
    store.players.forEach((p) => {
      const fandom = state.showdownFandom[p.id] || 0
      store.updatePlayer(p.id, {
        fame: p.fame + fandom,
        totalBossDamage: fandom, // fandom == damage dealt to the boss
      })
    })

    set({
      showdownHistory: history,
      showdownTurnPerformances: [],
      showdownSongsUsed: [],
      showdownCurrentFandom: 0,
      showdownCurrentGenre: null,
      showdownComplete: true,
    })
    return { kind: 'showdownComplete' }
  },

  resetShowdown: () => set({ ...initialShowdownState }),
})
