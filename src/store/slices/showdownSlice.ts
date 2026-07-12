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

/** Performer accumulators captured before a play, so it can be rerolled. */
interface ShowdownPlaySnapshot {
  song: Song
  performerId: string
  currentFandom: number
  fandomTotal: number
  bestHit: { damage: number; songName: string } | undefined
  crits: number
  songsUsed: string[]
}

/** Roll a song against the adapted boss and derive the performance stats. */
function rollShowdownPlay(base: ShowdownPlaySnapshot, resistGenre: Genre | null, weakGenre: Genre | null) {
  const { song } = base
  // The boss carries its adaptation as ordinary monster weakness/resistance,
  // so the standard damage pipeline applies the 2x / 0x element multipliers.
  const boss = createShowdownBoss({ resistGenre, weakGenre })
  const { rolls } = rollSong(song)
  const calc = calculateDamage(song, rolls, boss)
  const fandom = Math.max(0, calc.totalDamage)
  const genre = getDominantGenre(song, rolls)
  const critCount = rolls.filter((r) => r.isCrit).length

  const songGenres = song.slots
    .map((slot) => slot.dice?.genre)
    .filter((g): g is Genre => g !== undefined)
  const hitWeakness = weakGenre !== null && songGenres.includes(weakGenre)
  const wasResisted = resistGenre !== null && songGenres.includes(resistGenre)

  const bestHit =
    !base.bestHit || fandom > base.bestHit.damage
      ? { damage: fandom, songName: song.name || 'Untitled' }
      : base.bestHit

  return { rolls, fandom, genre, critCount, hitWeakness, wasResisted, bestHit }
}

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
  showdownUndo: ShowdownPlaySnapshot | null // pre-play snapshot, enables reroll

  // Actions
  startShowdown: (playerIds: string[]) => void
  playShowdownSong: (song: Song) => ShowdownPlayResult | null
  rerollShowdownSong: () => ShowdownPlayResult | null
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
  showdownUndo: null as ShowdownPlaySnapshot | null,
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

    // Snapshot the performer's accumulators before this play, so it can be rerolled.
    const base: ShowdownPlaySnapshot = {
      song,
      performerId,
      currentFandom: state.showdownCurrentFandom,
      fandomTotal: state.showdownFandom[performerId] || 0,
      bestHit: state.showdownBestHit[performerId],
      crits: state.showdownCrits[performerId] || 0,
      songsUsed: state.showdownSongsUsed,
    }

    const c = rollShowdownPlay(base, state.showdownResistGenre, state.showdownWeakGenre)

    set({
      showdownSongsUsed: [...base.songsUsed, song.id],
      showdownCurrentFandom: base.currentFandom + c.fandom,
      showdownCurrentGenre: c.genre,
      showdownFandom: { ...state.showdownFandom, [performerId]: base.fandomTotal + c.fandom },
      showdownBestHit: { ...state.showdownBestHit, [performerId]: c.bestHit },
      showdownCrits: { ...state.showdownCrits, [performerId]: base.crits + c.critCount },
      showdownUndo: base,
    })

    return { rolls: c.rolls, fandom: c.fandom, hadCrit: c.critCount > 0, genre: c.genre, hitWeakness: c.hitWeakness, wasResisted: c.wasResisted }
  },

  rerollShowdownSong: () => {
    const state = get()
    const base = state.showdownUndo
    if (!base) return null

    // Replay the same song from the pre-play snapshot, replacing the last result.
    // The snapshot stays put so the performance can be rerolled again.
    const c = rollShowdownPlay(base, state.showdownResistGenre, state.showdownWeakGenre)

    set({
      showdownCurrentFandom: base.currentFandom + c.fandom,
      showdownCurrentGenre: c.genre,
      showdownFandom: { ...state.showdownFandom, [base.performerId]: base.fandomTotal + c.fandom },
      showdownBestHit: { ...state.showdownBestHit, [base.performerId]: c.bestHit },
      showdownCrits: { ...state.showdownCrits, [base.performerId]: base.crits + c.critCount },
    })

    return { rolls: c.rolls, fandom: c.fandom, hadCrit: c.critCount > 0, genre: c.genre, hitWeakness: c.hitWeakness, wasResisted: c.wasResisted }
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
        showdownUndo: null,
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
        showdownUndo: null,
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
      showdownUndo: null,
    })
    return { kind: 'showdownComplete' }
  },

  resetShowdown: () => set({ ...initialShowdownState }),
})
