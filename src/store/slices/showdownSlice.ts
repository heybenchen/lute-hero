import { StateCreator } from 'zustand'
import { Song, DiceRoll, Player } from '@/types'
import { rollSong, calculateDamage } from '@/game-logic/combat/damageCalculator'
import {
  SHOWDOWN_TURNS,
  ShowdownPerformance,
  createShowdownBoss,
  getShowdownMultiplier,
  computeBossAdaptation,
  calculateShowdownFandom,
} from '@/game-logic/showdown/showdown'

/** Result of one song played against the boss, returned for UI animation. */
export interface ShowdownPlayResult {
  rolls: DiceRoll[]
  rawDamage: number
  multiplier: number
  fandom: number
  hadCrit: boolean
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
  showdownResistedId: string | null
  showdownWeakenedId: string | null
  showdownSongsUsed: string[] // song ids the current performer has played
  showdownTurnPerformances: ShowdownPerformance[] // completed performances this turn
  showdownHistory: ShowdownPerformance[][] // one entry per completed turn
  showdownCurrentDamage: number // raw damage by the current performer so far
  showdownCurrentFandom: number // fandom earned by the current performer so far
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
  showdownResistedId: null as string | null,
  showdownWeakenedId: null as string | null,
  showdownSongsUsed: [] as string[],
  showdownTurnPerformances: [] as ShowdownPerformance[],
  showdownHistory: [] as ShowdownPerformance[][],
  showdownCurrentDamage: 0,
  showdownCurrentFandom: 0,
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
    if (state.showdownSongsUsed.includes(song.id)) return null

    const performerId = state.showdownOrder[state.showdownPerformerIdx]
    if (!performerId) return null

    const boss = createShowdownBoss()
    const { rolls } = rollSong(song)
    const calc = calculateDamage(song, rolls, boss)
    const rawDamage = Math.max(0, calc.totalDamage)

    const multiplier = getShowdownMultiplier(performerId, {
      resistedPlayerId: state.showdownResistedId,
      weakenedPlayerId: state.showdownWeakenedId,
    })
    const fandom = calculateShowdownFandom(rawDamage, multiplier)
    const critCount = rolls.filter((r) => r.isCrit).length

    const prevBest = state.showdownBestHit[performerId]
    const bestHit =
      !prevBest || fandom > prevBest.damage
        ? { damage: fandom, songName: song.name || 'Untitled' }
        : prevBest

    set({
      showdownSongsUsed: [...state.showdownSongsUsed, song.id],
      showdownCurrentDamage: state.showdownCurrentDamage + rawDamage,
      showdownCurrentFandom: state.showdownCurrentFandom + fandom,
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

    return { rolls, rawDamage, multiplier, fandom, hadCrit: critCount > 0 }
  },

  finishShowdownPerformance: () => {
    const state = get()
    const performerId = state.showdownOrder[state.showdownPerformerIdx]
    const multiplier = getShowdownMultiplier(performerId, {
      resistedPlayerId: state.showdownResistedId,
      weakenedPlayerId: state.showdownWeakenedId,
    })

    const performance: ShowdownPerformance = {
      playerId: performerId,
      rawDamage: state.showdownCurrentDamage,
      multiplier,
      fandom: state.showdownCurrentFandom,
    }
    const turnPerformances = [...state.showdownTurnPerformances, performance]

    // More performers left this turn
    if (state.showdownPerformerIdx < state.showdownOrder.length - 1) {
      set({
        showdownTurnPerformances: turnPerformances,
        showdownPerformerIdx: state.showdownPerformerIdx + 1,
        showdownSongsUsed: [],
        showdownCurrentDamage: 0,
        showdownCurrentFandom: 0,
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
        showdownCurrentDamage: 0,
        showdownCurrentFandom: 0,
        showdownResistedId: adaptation.resistedPlayerId,
        showdownWeakenedId: adaptation.weakenedPlayerId,
      })
      return { kind: 'bossAdapts', turnEnded: state.showdownTurn }
    }

    // Third turn complete — the boss falls. Bank fandom into fame and record
    // total boss damage on each player (players live on the combined store).
    const store = get() as ShowdownSlice & {
      players: Player[]
      updatePlayer: (playerId: string, updates: Partial<Player>) => void
    }
    const fandomByPlayer = { ...state.showdownFandom }
    store.players.forEach((p) => {
      const fandom = fandomByPlayer[p.id] || 0
      const bossDamage = history
        .flat()
        .filter((perf) => perf.playerId === p.id)
        .reduce((sum, perf) => sum + perf.rawDamage, 0)
      store.updatePlayer(p.id, {
        fame: p.fame + fandom,
        totalBossDamage: bossDamage,
      })
    })

    set({
      showdownHistory: history,
      showdownTurnPerformances: [],
      showdownSongsUsed: [],
      showdownCurrentDamage: 0,
      showdownCurrentFandom: 0,
      showdownComplete: true,
    })
    return { kind: 'showdownComplete' }
  },

  resetShowdown: () => set({ ...initialShowdownState }),
})
