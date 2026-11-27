import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { Dice, Song } from '../types'

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

describe('DEBUG_SIMULATE', () => {
  const fresh = () => {
    const started = apply(createInitialEngineState(), {
      type: 'START_GAME',
      playerConfigs: [{ name: 'Alba', starterGenre: 'Ballad' }, { name: 'Bryn', starterGenre: 'Folk' }, { name: 'Cleo', starterGenre: 'Hymn' }],
    }).state
    // A playtest tweak that the simulation must keep
    return { ...started, tunables: { ...started.tunables, newD4Cost: 2 } }
  }
  const dice = (s: EngineState) => s.players.flatMap((p) => p.songs.flatMap((sg) => sg.slots.map((slot) => slot.dice))).filter(Boolean)

  it('plays the table forward to the start of the next round, keeping bards and tunables', () => {
    const before = fresh()
    const state = apply(before, { type: 'DEBUG_SIMULATE', round: 6, showdown: false }, ctx(5)).state
    expect(state.phase).toBe('main')
    expect(state.currentRound).toBe(7)
    expect(state.currentTurnPlayerIndex).toBe(0)
    expect(state.showdownActive).toBe(false)
    expect(state.players.map((p) => [p.id, p.name, p.starterGenre])).toEqual(before.players.map((p) => [p.id, p.name, p.starterGenre]))
    expect(state.tunables.newD4Cost).toBe(2)
    // Six rounds of real play: bards have bought dice, earned Fame, and the board moved on
    expect(dice(state).length).toBeGreaterThan(dice(before).length)
    expect(state.players.some((p) => p.fame > 0)).toBe(true)
    expect(state.spaces.map((sp) => sp.genreTags.join())).not.toEqual(before.spaces.map((sp) => sp.genreTags.join()))
    // ...and the game simply continues from there
    expect(applyAction(state, { type: 'END_TURN' }, ctx()).ok).toBe(true)
  })

  it('can start the showdown from the simulated state', () => {
    const state = apply(fresh(), { type: 'DEBUG_SIMULATE', round: 8, showdown: true }, ctx(9)).state
    expect(state.phase).toBe('finalBoss')
    expect(state.showdownActive).toBe(true)
    expect(state.showdownTurn).toBe(1)
    expect(state.combat.isActive).toBe(false)
    expect(state.players.every((p) => p.songs.some((sg) => sg.slots.some((slot) => slot.dice)))).toBe(true)
  })

  it('stops at the furthest round a bot game reaches before the showdown', () => {
    const state = apply(fresh(), { type: 'DEBUG_SIMULATE', round: 30, showdown: false }, ctx(2)).state
    expect(state.phase).toBe('main')
    expect(state.currentRound).toBeGreaterThan(5)
    expect(state.currentRound).toBeLessThanOrEqual(31)
  })

  it('plays slower at a learning pace than at the expert pace', () => {
    // Summed over a few seeds so one lucky game can't flip it
    let learning = 0
    let expert = 0
    for (const seed of [3, 4, 5]) {
      learning += dice(apply(fresh(), { type: 'DEBUG_SIMULATE', round: 5, showdown: false, pace: 'learning' }, ctx(seed)).state).length
      expert += dice(apply(fresh(), { type: 'DEBUG_SIMULATE', round: 5, showdown: false, pace: 'expert' }, ctx(seed)).state).length
    }
    expect(learning).toBeLessThan(expert)
  })

  it('rejects an unknown pace', () => {
    const action = { type: 'DEBUG_SIMULATE', round: 5, showdown: false, pace: 'godlike' } as unknown as GameAction
    expect(applyAction(fresh(), action, ctx()).ok).toBe(false)
  })

  it('is host-only online', () => {
    const seat: ActionCtx = { rng: mulberry32(1), actor: { kind: 'seat', playerId: 'player-2', isHost: false } }
    expect(applyAction(fresh(), { type: 'DEBUG_SIMULATE', round: 5, showdown: false }, seat).ok).toBe(false)
  })
})
