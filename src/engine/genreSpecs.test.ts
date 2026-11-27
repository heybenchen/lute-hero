import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { Dice, Monster } from '../types'
import { conditionHolds, PlayContext } from '../game-logic/genres/specs'

const ctx = (seed = 4): ActionCtx => ({ rng: mulberry32(seed), actor: { kind: 'hotseat' } })
function apply(state: EngineState, action: GameAction, c: ActionCtx = ctx()) {
  const r = applyAction(state, action, c)
  if (!r.ok) throw new Error(`${action.type}: ${r.message}`)
  return r.state
}
const monster = (hp: number, level = 2): Monster => ({
  id: 'm1', templateId: 't', name: 'M', currentHP: hp, maxHP: Math.max(hp, 14), vulnerability: 'Hymn', resistance: 'Shanty', isBoss: false, level,
})

/** Alba (with the given lab genres) fights one monster on space 5 holding a single die. */
function fight(specGenres: string[], die: Dice, hp: number, extra: Partial<EngineState['players'][number]> = {}): EngineState {
  let s = apply(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [{ name: 'Alba', starterElement: 'Ballad' }, { name: 'Bryn', starterElement: 'Folk' }],
  })
  s = {
    ...s,
    players: s.players.map((p, i) => i === 0
      ? { ...p, position: 5, specGenres, ...extra, songs: p.songs.map((sg, si) => ({ ...sg, slots: [{ dice: si === 0 ? die : null }] as typeof sg.slots })) }
      : p),
    spaces: s.spaces.map((sp) => (sp.id === 5 ? { ...sp, elementTags: ['Hymn'], monsters: [monster(hp)] } : sp)),
  }
  return apply(s, { type: 'START_COMBAT', playerId: 'player-1' })
}
const d4: Dice = { id: 'd', type: 'd4', element: 'Folk' }

describe('genre lab specs in the engine', () => {
  it('conditions read the play context', () => {
    const play: PlayContext = {
      showdown: false, playIndex: 2, lastElement: 'Folk', comboCount: 1, elementsPlayed: ['Folk'], target: monster(10, 4),
      sharingSpace: true, trailingFame: false, leadingFame: true, inspiration: 3, starter: 'Ballad', monstersInFight: 3, used: [],
    }
    expect(conditionHolds({ sameElementAsLast: true, targetLevelAtLeast: 4, sharingSpace: true }, d4, play, 'x')).toBe(true)
    expect(conditionHolds({ element: 'starter' }, d4, play, 'x')).toBe(false)
    expect(conditionHolds({ oncePerTurn: true }, d4, { ...play, used: ['x'] }, 'x')).toBe(false)
  })

  it('a miss can keep the song (Quick Strum on a d4)', () => {
    const s = apply(fight(['quick-strum'], d4, 500), { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1' })
    expect(s.combat.spentSongIds).toEqual([])
    const plain = apply(fight([], d4, 500), { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1' })
    expect(plain.combat.spentSongIds).toEqual(['player-1-song-1'])
  })

  it('tame and miss rewards are paid when the fight ends (Showboat)', () => {
    let s = apply(fight(['showboat'], d4, 1), { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1' })
    const before = s.players[0].fame
    s = apply(s, { type: 'END_COMBAT', spreadElement: 'Hymn' })
    // Lv2 tame = 10 Fame, plus Showboat's +5
    expect(s.players[0].fame - before).toBe(15)
  })

  it('economy changes apply to prices (Cheap Tuning makes a d4 free)', () => {
    let s = apply(createInitialEngineState(), {
      type: 'START_GAME',
      playerConfigs: [{ name: 'Alba', starterElement: 'Ballad' }, { name: 'Bryn', starterElement: 'Folk' }],
    })
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, exp: 0, specGenres: ['cheap-tuning'] } : p)) }
    s = apply(s, { type: 'OPEN_STUDIO', playerId: 'player-1' })
    expect(applyAction(s, { type: 'BUY_DIE', offerIndex: 0 }, ctx()).ok).toBe(true)
  })

  it('a free Inspiration reroll each turn (Second Take)', () => {
    let s = fight(['second-take'], d4, 500, { inspiration: 0 })
    s = apply(s, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1' })
    s = apply(s, { type: 'REROLL_SONG' })
    expect(s.players[0].inspiration).toBe(0)
    expect(applyAction(s, { type: 'REROLL_SONG' }, ctx()).ok).toBe(false)
  })
})
