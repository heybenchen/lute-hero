import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { Monster } from '../types'

const hotseat = (seed = 7): ActionCtx => ({ rng: mulberry32(seed), actor: { kind: 'hotseat' } })
const seat = (playerId: string, seed = 7): ActionCtx => ({ rng: mulberry32(seed), actor: { kind: 'seat', playerId, isHost: false } })

function apply(state: EngineState, action: GameAction, c: ActionCtx = hotseat()) {
  const result = applyAction(state, action, c)
  if (!result.ok) throw new Error(`${action.type} failed: ${result.message}`)
  return result
}

const monster = (id: string, hp: number, level = 2): Monster => ({
  id,
  templateId: 't',
  name: id,
  currentHP: hp,
  maxHP: Math.max(hp, 14),
  vulnerability: 'Hymn',
  resistance: 'Shanty',
  isBoss: false,
  level,
})

/** Alba fights on space 5 with Bryn standing there too; Bryn holds a Folk d20. */
function sharedFight(monsters: Monster[], brynPosition = 5): EngineState {
  const started = applyAction(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [
      { name: 'Alba', starterElement: 'Ballad' },
      { name: 'Bryn', starterElement: 'Folk' },
    ],
  }, hotseat())
  if (!started.ok) throw new Error(started.message)
  let state = started.state
  state = {
    ...state,
    players: state.players.map((p, i) => ({
      ...p,
      position: i === 0 ? 5 : brynPosition,
      songs: i === 1
        ? p.songs.map((s, si) => (si === 0 ? { ...s, slots: [{ dice: { id: 'bryn-d20', type: 'd20' as const, element: 'Folk' as const } }] as typeof s.slots } : s))
        : p.songs,
    })),
    spaces: state.spaces.map((s) => (s.id === 5 ? { ...s, elementTags: ['Hymn'], monsters } : s)),
  }
  return apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
}

const feature = (targetMonsterId: string): GameAction => ({
  type: 'PLAY_FEATURED_SONG',
  guestPlayerId: 'player-2',
  songId: 'player-2-song-1',
  targetMonsterId,
})

describe('featured songs', () => {
  it('a featured tame splits that monster\'s Fame and EXP with the guest', () => {
    let state = sharedFight([monster('m1', 1)])
    state = apply(state, feature('m1')).state
    expect(state.combat.monsters[0].currentHP).toBe(0)
    expect(state.combat.killCredits).toEqual([{ monsterId: 'm1', featuredPlayerId: 'player-2' }])
    // Costs the fighter nothing, and can't be rerolled
    expect(state.combat.spentSongIds).toEqual([])
    expect(state.combat.undoSnapshot).toBeNull()

    const before = state.players.map((p) => ({ fame: p.fame, exp: p.exp }))
    state = apply(state, { type: 'END_COMBAT', spreadElement: 'Hymn' }).state
    // Lv2: 10 Fame and 2 EXP, split evenly
    expect(state.players[0].fame - before[0].fame).toBe(5)
    expect(state.players[0].exp - before[0].exp).toBe(1)
    expect(state.players[1].fame - before[1].fame).toBe(5)
    expect(state.players[1].exp - before[1].exp).toBe(1)
  })

  it('the fighter keeps the larger half of an odd split', () => {
    let state = sharedFight([monster('m1', 1, 1)])
    state = apply(state, feature('m1')).state
    state = apply(state, { type: 'END_COMBAT', spreadElement: 'Hymn' }).state
    // Lv1: 5 Fame / 1 EXP → fighter 3 / 1, guest 2 / 0
    expect(state.players[0].fame).toBe(3)
    expect(state.players[1].fame).toBe(2)
    expect(state.players[1].exp).toBe(0)
  })

  it('a featured miss leaves its damage and costs nothing; one feature per guest', () => {
    let state = sharedFight([monster('m1', 500)])
    state = apply(state, feature('m1')).state
    expect(state.combat.monsters[0].currentHP).toBeLessThan(500)
    expect(state.combat.killCredits).toEqual([])
    expect(state.combat.spentSongIds).toEqual([])
    expect(state.combat.featuredPlayerIds).toEqual(['player-2'])
    expect(applyAction(state, feature('m1'), hotseat()).ok).toBe(false)
  })

  it('locks all song types to a wounded monster until it is defeated or the bard retreats', () => {
    let state = sharedFight([monster('m1', 14), monster('m2', 14)])
    const play = (targetMonsterId: string): GameAction => ({
      type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId,
    })
    // The bard rolls 2 to wound the first monster.
    state = apply(state, play('m1'), { ...hotseat(), rng: () => 0.125 }).state
    const request = (targetMonsterId: string): GameAction => ({
      type: 'REQUEST_FEATURE', guestPlayerId: 'player-2', songId: 'player-2-song-1', targetMonsterId,
    })
    expect(applyAction(state, feature('m2'), hotseat())).toMatchObject({ ok: false, code: 'illegal' })
    expect(applyAction(state, request('m2'), seat('player-1'))).toMatchObject({ ok: false, code: 'illegal' })
    const retreated = apply(state, { type: 'END_COMBAT' }).state
    expect(retreated.combat.isActive).toBe(false)
    expect(retreated.combat.lockedTargetMonsterId).toBeNull()
    expect(retreated.players[0].exp - state.players[0].exp).toBe(2)

    // The featured d20 rolls 16 and finishes the locked target.
    state = apply(state, request('m1'), seat('player-1')).state
    state = apply(state, { type: 'ANSWER_FEATURE', accept: true }, { ...seat('player-2'), rng: () => 0.75 }).state
    expect(state.combat.monsters[0].currentHP).toBe(0)
    expect(state.combat.lockedTargetMonsterId).toBeNull()
  })

  it("a featured wound locks the bard's own songs to that target", () => {
    let state = sharedFight([monster('m1', 14), monster('m2', 14)])
    state = apply(state, feature('m1'), { ...hotseat(), rng: () => 0.05 }).state
    const play = (targetMonsterId: string): GameAction => ({
      type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId,
    })
    expect(applyAction(state, play('m2'), hotseat())).toMatchObject({
      ok: false,
      message: 'Win over the monster you moved, or end the concert',
    })
    // The bard rolls an 8 and a 7 on the crit to finish the locked target.
    const rolls = [0.875, 0.75]
    state = apply(state, play('m1'), { ...hotseat(), rng: () => rolls.shift() ?? 0 }).state
    expect(state.combat.monsters[0].currentHP).toBe(0)
    expect(applyAction(state, play('m2'), hotseat()).ok).toBe(true)
  })

  it('needs the guest on the same space', () => {
    const state = sharedFight([monster('m1', 5)], 6)
    expect(applyAction(state, feature('m1'), hotseat()).ok).toBe(false)
  })

  it('online, the guest has to agree before the song plays', () => {
    let state = sharedFight([monster('m1', 1)])
    const { guestPlayerId, songId, targetMonsterId } = feature('m1') as Extract<GameAction, { type: 'PLAY_FEATURED_SONG' }>
    const request: GameAction = { type: 'REQUEST_FEATURE', guestPlayerId, songId, targetMonsterId }

    // The fighter can't just take it, and the guest can't ask on the fighter's turn
    expect(applyAction(state, feature('m1'), seat('player-1')).ok).toBe(false)
    expect(applyAction(state, request, seat('player-2')).ok).toBe(false)

    state = apply(state, request, seat('player-1')).state
    expect(state.combat.featureRequest).toEqual({ guestPlayerId, songId, targetMonsterId })
    // The fight pauses for the answer, and only the guest can agree
    expect(applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1' }, seat('player-1')).ok).toBe(false)
    expect(applyAction(state, { type: 'ANSWER_FEATURE', accept: true }, seat('player-1')).ok).toBe(false)

    // Declining clears the ask without playing anything
    const declined = apply(state, { type: 'ANSWER_FEATURE', accept: false }, seat('player-2')).state
    expect(declined.combat.featureRequest).toBeNull()
    expect(declined.combat.featuredPlayerIds).toEqual([])

    // Agreeing plays it
    const agreed = apply(state, { type: 'ANSWER_FEATURE', accept: true }, seat('player-2'))
    expect(agreed.state.combat.featureRequest).toBeNull()
    expect(agreed.state.combat.monsters[0].currentHP).toBe(0)
    expect(agreed.events.some((e) => e.type === 'diceRolled')).toBe(true)
  })

  it('the fighter can withdraw the ask', () => {
    let state = sharedFight([monster('m1', 1)])
    state = apply(state, { type: 'REQUEST_FEATURE', guestPlayerId: 'player-2', songId: 'player-2-song-1', targetMonsterId: 'm1' }, seat('player-1')).state
    state = apply(state, { type: 'ANSWER_FEATURE', accept: false }, seat('player-1')).state
    expect(state.combat.featureRequest).toBeNull()
  })
})
