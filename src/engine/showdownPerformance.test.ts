import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { Dice, Song } from '../types'
import { ROUND_PROFILES } from '../data/roundProfiles'

const ctx = (seed = 3): ActionCtx => ({ rng: mulberry32(seed), actor: { kind: 'hotseat' } })
function apply(state: EngineState, action: GameAction, c: ActionCtx = ctx()) {
  const result = applyAction(state, action, c)
  if (!result.ok) throw new Error(`${action.type} failed: ${result.message}`)
  return result
}

/** Two bards in the showdown; Alba holds two Ballad dice and one Folk die. */
function showdown(): EngineState {
  const started = apply(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [{ name: 'Alba', starterGenre: 'Ballad' }, { name: 'Bryn', starterGenre: 'Folk' }],
  }).state
  const dice: (Dice | null)[] = [
    { id: 'b1', type: 'd8', genre: 'Ballad' },
    { id: 'f1', type: 'd12', genre: 'Folk' },
    { id: 'b2', type: 'd4', genre: 'Ballad' },
    null, null, null,
  ]
  let state: EngineState = {
    ...started,
    players: started.players.map((p, i) =>
      i === 0 ? { ...p, inspiration: 2, songs: p.songs.map((s, si): Song => ({ ...s, slots: [{ dice: dice[si] }] })) } : p
    ),
    pendingPhase: 'finalBoss',
    finalTurnGranted: true,
    currentTurnPlayerIndex: 1,
  }
  state = apply(state, { type: 'END_TURN' }).state
  expect(state.showdownActive).toBe(true)
  return state
}

describe('showdown performances', () => {
  it('tapping a die performs every die of that element together', () => {
    const state = showdown()
    const result = apply(state, { type: 'PLAY_SHOWDOWN_SONG', songId: 'player-1-song-3' })
    expect(result.state.showdownSongsUsed).toEqual(['player-1-song-1', 'player-1-song-3'])
    const rolled = result.events.find((e) => e.type === 'diceRolled')
    expect(rolled?.type === 'diceRolled' && rolled.rolls.map((r) => r.diceId).sort()).toEqual(['b1', 'b2'])
    // Still one performance a verse
    expect(applyAction(result.state, { type: 'PLAY_SHOWDOWN_SONG', songId: 'player-1-song-2' }, ctx()).ok).toBe(false)
  })

  it('an Inspiration reroll rerolls the whole element and costs 1', () => {
    let state = showdown()
    state = apply(state, { type: 'PLAY_SHOWDOWN_SONG', songId: 'player-1-song-1' }).state
    const result = apply(state, { type: 'REROLL_SHOWDOWN_SONG' }, ctx(99))
    const rolled = result.events.find((e) => e.type === 'diceRolled')
    expect(rolled?.type === 'diceRolled' && rolled.rolls.length).toBe(2)
    expect(result.state.players[0].inspiration).toBe(1)
    // Fandom is replaced, not added on top of the first roll
    const play = result.events.find((e) => e.type === 'showdownPlay')
    expect(play?.type === 'showdownPlay' && result.state.showdownFandom['player-1']).toBe(play?.type === 'showdownPlay' ? play.fandom : -1)
  })
})

describe('DEBUG_JUMP_TO_SHOWDOWN', () => {
  const fresh = () => apply(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [{ name: 'Alba', starterGenre: 'Ballad' }, { name: 'Bryn', starterGenre: 'Folk' }, { name: 'Cleo', starterGenre: 'Hymn' }],
  }).state

  it('starts the showdown with holdings drawn from that round\'s simulated samples', () => {
    const state = apply(fresh(), { type: 'DEBUG_JUMP_TO_SHOWDOWN', round: 9 }, ctx(5)).state
    expect(state.phase).toBe('finalBoss')
    expect(state.showdownActive).toBe(true)
    expect(state.showdownTurn).toBe(1)
    expect(state.currentRound).toBe(10)
    const pool = ROUND_PROFILES[9]
    for (const p of state.players) {
      const dice = p.songs.flatMap((s) => s.slots.map((slot) => slot.dice)).filter((d) => d !== null)
      // Some sample from round 9 matches this bard exactly
      const match = pool.some((snap) =>
        snap.fame === p.fame && snap.exp === p.exp && snap.inspiration === p.inspiration &&
        snap.dice.length === dice.length && snap.dice.every(([type], i) => dice[i]!.type === type)
      )
      expect(match).toBe(true)
      expect(p.styles.length).toBeLessThanOrEqual(2)
      // Coda's extra song exists exactly when the bard plays in that style
      expect(p.songs.length).toBe(p.styles.includes('coda') ? 7 : 6)
    }
  })

  it('clamps to the simulated rounds and is host-only online', () => {
    const state = apply(fresh(), { type: 'DEBUG_JUMP_TO_SHOWDOWN', round: 99 }).state
    const last = Math.max(...Object.keys(ROUND_PROFILES).map(Number))
    expect(state.currentRound).toBe(last + 1)
    const seat: ActionCtx = { rng: mulberry32(1), actor: { kind: 'seat', playerId: 'player-2', isHost: false } }
    expect(applyAction(fresh(), { type: 'DEBUG_JUMP_TO_SHOWDOWN', round: 5 }, seat).ok).toBe(false)
  })
})
