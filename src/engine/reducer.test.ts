import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx, computeCombatRewards } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'

const HOTSEAT: Pick<ActionCtx, 'actor'> = { actor: { kind: 'hotseat' } }

function ctx(seed = 42): ActionCtx {
  return { rng: mulberry32(seed), ...HOTSEAT }
}

function seatCtx(playerId: string, isHost = false, seed = 42): ActionCtx {
  return { rng: mulberry32(seed), actor: { kind: 'seat', playerId, isHost } }
}

function startTwoPlayerGame(seed = 42): EngineState {
  const result = applyAction(
    createInitialEngineState(),
    {
      type: 'START_GAME',
      playerConfigs: [
        { name: 'Alba', starterGenre: 'Ballad', color: '#3b82f6' },
        { name: 'Bryn', starterGenre: 'Folk', color: '#ef4444' },
      ],
    },
    ctx(seed)
  )
  if (!result.ok) throw new Error(result.message)
  return result.state
}

function apply(state: EngineState, action: GameAction, c: ActionCtx = ctx()) {
  const result = applyAction(state, action, c)
  if (!result.ok) throw new Error(`${action.type} failed: ${result.message}`)
  return result
}

/** Drive round-end redistribution to completion (each giver picks 4 Ballad
 *  chips, each receiver places them on the first free tiles). */
function completeRedistribution(state: EngineState): EngineState {
  let s = state
  let guard = 0
  while (s.redistribution.active && guard++ < 500) {
    const r = s.redistribution
    if (r.stage === 'selecting') {
      s = r.selectedChips.length < 4
        ? apply(s, { type: 'ADD_REDISTRIBUTION_CHIP', genre: 'Ballad' }).state
        : apply(s, { type: 'CONFIRM_REDISTRIBUTION_GIFT' }).state
    } else {
      const used = new Set(r.placedSpaceIds)
      const target = s.spaces.find((sp) => !used.has(sp.id) && sp.genreTags.length < 5)!
      s = apply(s, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: target.id }).state
    }
  }
  return s
}

describe('engine determinism', () => {
  it('produces identical state for the same seed and action sequence', () => {
    const run = (seed: number) => {
      let state = startTwoPlayerGame(seed)
      const p1 = state.players[0]
      const target = state.spaces.find((s) => s.connections.includes(p1.position))!
      state = apply(state, { type: 'MOVE', playerId: p1.id, toSpaceId: p1.position === 0 ? 1 : target.id, inspirationTravel: false }, ctx(seed + 1)).state
      state = apply(state, { type: 'END_TURN' }, ctx(seed + 2)).state
      return state
    }
    expect(run(7)).toEqual(run(7))
    // Different seeds diverge (bag order, monster picks)
    expect(JSON.stringify(run(7))).not.toEqual(JSON.stringify(run(8)))
  })

  it('generates deterministic, unique ids', () => {
    const a = startTwoPlayerGame(9)
    const b = startTwoPlayerGame(9)
    const monsterIds = (s: typeof a) => s.spaces.flatMap((sp) => sp.monsters.map((m) => m.id))
    // Same seed produces identical ids
    expect(monsterIds(a)).toEqual(monsterIds(b))
    const allIds = monsterIds(a)
    expect(new Set(allIds).size).toBe(allIds.length)
  })
})

describe('START_GAME', () => {
  it('builds the full opening state in one action', () => {
    const state = startTwoPlayerGame()
    expect(state.phase).toBe('main')
    expect(state.currentRound).toBe(1)
    expect(state.players).toHaveLength(2)
    expect(state.players[0].position).toBe(0)
    expect(state.players[1].position).toBe(3)
    expect(state.spaces).toHaveLength(16)
    // Every space starts with exactly 1 monster chip
    expect(state.spaces.every((s) => s.genreTags.length === 1)).toBe(true)
    // Each space spawns one monster per unique genre chip, matching the board
    expect(state.spaces.every((s) => s.monsters.length === new Set(s.genreTags).size)).toBe(true)
    expect(state.elementOffers).toHaveLength(4)
  })

  it('rejects starting twice', () => {
    const state = startTwoPlayerGame()
    const result = applyAction(state, { type: 'START_GAME', playerConfigs: [{ name: 'X', starterGenre: 'Hymn', color: '#fff' }] }, ctx())
    expect(result.ok).toBe(false)
  })
})

describe('MOVE', () => {
  it('moves to adjacent spaces, spends a move, and spawns monsters from tags', () => {
    const state = startTwoPlayerGame()
    const p1 = state.players[0]
    const result = apply(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 1, inspirationTravel: false })
    const moved = result.state.players[0]
    expect(moved.position).toBe(1)
    expect(moved.movesThisTurn).toBe(1)
    const space = result.state.spaces.find((s) => s.id === 1)!
    expect(space.monsters.length).toBe(space.genreTags.length > 0 ? new Set(space.genreTags).size : 0)
  })

  it('rejects non-adjacent moves and exhausted moves', () => {
    let state = startTwoPlayerGame()
    const p1 = state.players[0]
    expect(applyAction(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 15, inspirationTravel: false }, ctx()).ok).toBe(false)
    state = apply(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 1, inspirationTravel: false }).state
    state = apply(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 2, inspirationTravel: false }).state
    expect(applyAction(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 3, inspirationTravel: false }, ctx()).ok).toBe(false)
  })

  it('inspiration travel reaches any space and spends a token', () => {
    let state = startTwoPlayerGame()
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: 2 } : p)) }
    const p1 = state.players[0]
    const result = apply(state, { type: 'MOVE', playerId: p1.id, toSpaceId: 10, inspirationTravel: true })
    expect(result.state.players[0].position).toBe(10)
    expect(result.state.players[0].inspiration).toBe(1)
  })
})

describe('combat flow', () => {
  function stateWithMonsterAtPlayer(): EngineState {
    let state = startTwoPlayerGame()
    // Guarantee a monster on an adjacent space by moving onto a tagged space,
    // or plant tags manually for a stable test
    state = {
      ...state,
      spaces: state.spaces.map((s) =>
        s.id === 1 ? { ...s, genreTags: ['Ballad', 'Ballad'] } : s
      ),
    }
    state = apply(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false }).state
    return state
  }

  it('runs a full combat: start, play songs, victory with element spread', () => {
    let state = stateWithMonsterAtPlayer()
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    expect(state.combat.isActive).toBe(true)
    expect(state.combat.monsters.length).toBeGreaterThan(0)
    expect(state.players[0].fightsThisTurn).toBe(1)

    // Cheat the monsters down so one song can finish it
    state = {
      ...state,
      combat: {
        ...state.combat,
        monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 1 })),
      },
    }
    const targetId = state.combat.monsters[0].id
    const playResult = apply(state, { type: 'PLAY_SONG', songId: state.players[0].songs[0].id, ownerId: 'player-1', targetMonsterId: targetId })
    state = playResult.state
    expect(playResult.events.some((e) => e.type === 'diceRolled')).toBe(true)
    expect(playResult.events.some((e) => e.type === 'damageDealt')).toBe(true)
    expect(state.combat.monsters.every((m) => m.currentHP <= 0)).toBe(true)

    const fameBefore = state.players[0].fame
    const rewards = computeCombatRewards(state.combat)
    const endResult = apply(state, { type: 'END_COMBAT', spreadGenre: 'Folk' })
    state = endResult.state
    expect(state.combat.isActive).toBe(false)
    expect(state.studio.playerId).toBe('player-1')
    expect(state.players[0].fame).toBe(fameBefore + rewards.fighterFame)
    expect(state.players[0].monstersDefeated).toBe(rewards.monstersDefeatedCount)
    // Victory clears the space and radiates Folk to neighbors
    const fought = state.spaces.find((s) => s.id === 1)!
    expect(fought.monsters).toHaveLength(0)
    expect(fought.genreTags).toHaveLength(0)
    for (const nid of fought.connections) {
      const n = state.spaces.find((s) => s.id === nid)!
      expect(n.genreTags.filter((g) => g === 'Folk').length).toBeGreaterThanOrEqual(1)
    }
  })

  it('requires an element choice on victory', () => {
    let state = stateWithMonsterAtPlayer()
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    state = {
      ...state,
      combat: { ...state.combat, monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 0 })) },
    }
    expect(applyAction(state, { type: 'END_COMBAT' }, ctx()).ok).toBe(false)
    state = apply(state, { type: 'SELECT_COMBAT_SPREAD', genre: 'Hymn' }).state
    expect(state.combat.selectedSpreadGenre).toBe('Hymn')
    expect(applyAction(state, { type: 'END_COMBAT' }, ctx()).ok).toBe(true)
  })

  it('retreat adjusts tags for defeated and surviving monsters', () => {
    let state = stateWithMonsterAtPlayer()
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    // One survivor at full HP: retreat re-adds its genre tag
    const survivors = state.combat.monsters
    state = apply(state, { type: 'END_COMBAT' }).state
    const space = state.spaces.find((s) => s.id === 1)!
    const survivingGenres = survivors.filter((m) => m.vulnerability).map((m) => m.vulnerability!)
    for (const g of survivingGenres) {
      expect(space.genreTags).toContain(g)
    }
  })

  it('reroll replays the last song from its snapshot and spends inspiration', () => {
    let state = stateWithMonsterAtPlayer()
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: 1 } : p)) }
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    // Beef up the monster so the song wounds without killing (reroll needs a live target)
    state = {
      ...state,
      combat: { ...state.combat, monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 9999, maxHP: 9999 })) },
    }
    const songId = state.players[0].songs[0].id
    const targetId = state.combat.monsters[0].id
    state = apply(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: targetId }).state
    const songsUsedAfterPlay = state.combat.songsUsed.length
    state = apply(state, { type: 'REROLL_SONG' }, ctx(99)).state
    expect(state.combat.songsUsed.length).toBe(songsUsedAfterPlay) // replaced, not stacked
    expect(state.players[0].inspiration).toBe(0)
  })

  it('spends a song that only wounds, and returns its dice when it defeats the target', () => {
    let state = stateWithMonsterAtPlayer()
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    // A tanky monster survives the song → the song is spent (no replay)
    state = {
      ...state,
      combat: { ...state.combat, monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 9999, maxHP: 9999 })) },
    }
    const songId = state.players[0].songs[0].id
    const targetId = state.combat.monsters[0].id
    state = apply(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: targetId }).state
    expect(state.combat.spentSongIds).toContain(songId)
    expect(applyAction(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: targetId }, ctx()).ok).toBe(false)

    // Now the same song defeats a fresh 1-HP target → dice return, no longer spent
    state = {
      ...state,
      combat: {
        ...state.combat,
        spentSongIds: [],
        monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 1 })),
      },
    }
    state = apply(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: targetId }).state
    expect(state.combat.monsters[0].currentHP).toBe(0)
    expect(state.combat.spentSongIds).not.toContain(songId)
  })
})

describe('END_TURN', () => {
  it('advances to the next player and refills the shop', () => {
    let state = startTwoPlayerGame()
    state = { ...state, elementOffers: [] }
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.currentTurnPlayerIndex).toBe(1)
    expect(state.currentRound).toBe(1)
    expect(state.elementOffers).toHaveLength(4)
  })

  it('runs round-end redistribution, then increments the round and respawns monsters', () => {
    let state = startTwoPlayerGame()
    state = apply(state, { type: 'END_TURN' }).state // player-1 → player-2
    state = apply(state, { type: 'END_TURN' }).state // player-2 → round end → redistribution
    expect(state.redistribution.active).toBe(true)
    expect(state.currentRound).toBe(1)
    const tagsBefore = state.spaces.reduce((n, s) => n + s.genreTags.length, 0)

    state = completeRedistribution(state)
    expect(state.redistribution.active).toBe(false)
    expect(state.currentRound).toBe(2)
    expect(state.currentTurnPlayerIndex).toBe(0)
    // 2 players each hand off 4 chips → 8 new tags placed on the board
    const tagsAfter = state.spaces.reduce((n, s) => n + s.genreTags.length, 0)
    expect(tagsAfter).toBe(tagsBefore + 2 * 4)
    // Monsters respawn to match the (redistributed) tags
    state.spaces.forEach((s) => expect(s.monsters.length).toBe(new Set(s.genreTags).size))
  })

  it('grants one final turn, then transitions and auto-starts the showdown', () => {
    let state = startTwoPlayerGame()
    state = { ...state, pendingPhase: 'finalBoss' as const, currentTurnPlayerIndex: 1 }
    // First round-end runs redistribution, then grants the final turn
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.redistribution.active).toBe(true)
    state = completeRedistribution(state)
    expect(state.phase).toBe('main')
    expect(state.finalTurnGranted).toBe(true)
    expect(state.showdownActive).toBe(false)
    // Play out the granted round; its round-end flips straight to the showdown
    // (no redistribution when entering the boss)
    state = apply(state, { type: 'END_TURN' }).state // player-1 → player-2
    state = apply(state, { type: 'END_TURN' }).state // round end → transition
    expect(state.redistribution.active).toBe(false)
    expect(state.phase).toBe('finalBoss')
    expect(state.finalTurnGranted).toBe(false)
    expect(state.showdownActive).toBe(true)
    expect(state.showdownOrder).toEqual(['player-1', 'player-2'])
    expect(state.showdownFandom).toEqual({ 'player-1': 0, 'player-2': 0 })
  })

  it('gates redistribution to the giver and receiver, one chip per tile', () => {
    let state = startTwoPlayerGame()
    state = apply(state, { type: 'END_TURN' }).state
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.redistribution.active).toBe(true)
    expect(state.redistribution.stage).toBe('selecting')
    // giverIdx 0 → giver player-1, receiver player-2
    // The receiver can't add chips; the giver can
    expect(applyAction(state, { type: 'ADD_REDISTRIBUTION_CHIP', genre: 'Folk' }, seatCtx('player-2')).ok).toBe(false)
    expect(applyAction(state, { type: 'ADD_REDISTRIBUTION_CHIP', genre: 'Folk' }, seatCtx('player-1')).ok).toBe(true)
    // Confirm requires exactly 4 chips
    state = apply(state, { type: 'ADD_REDISTRIBUTION_CHIP', genre: 'Folk' }).state
    expect(applyAction(state, { type: 'CONFIRM_REDISTRIBUTION_GIFT' }, ctx()).ok).toBe(false)
    for (let i = 0; i < 3; i++) state = apply(state, { type: 'ADD_REDISTRIBUTION_CHIP', genre: 'Folk' }).state
    state = apply(state, { type: 'CONFIRM_REDISTRIBUTION_GIFT' }).state
    expect(state.redistribution.stage).toBe('placing')
    // Now the receiver (player-2) places; the giver can't
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-1')).ok).toBe(false)
    state = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-2')).state
    // No two chips on the same tile
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-2')).ok).toBe(false)
  })
})

describe('shop actions', () => {
  function openStudio(state: EngineState): EngineState {
    return apply(state, { type: 'OPEN_STUDIO', playerId: 'player-1' }).state
  }

  it('synchronizes the open Studio and the active player\'s selections', () => {
    let state = openStudio(startTwoPlayerGame())
    expect(state.studio.playerId).toBe('player-1')

    state = apply(state, { type: 'SELECT_STUDIO_OFFER', offerIndex: 0 }).state
    expect(state.studio.selectedOfferIdx).toBe(0)

    expect(applyAction(
      state,
      { type: 'SELECT_STUDIO_OFFER', offerIndex: 1 },
      seatCtx('player-2')
    ).ok).toBe(false)

    state = apply(state, { type: 'CLOSE_STUDIO' }).state
    expect(state.studio.playerId).toBeNull()
  })

  it('BUY_DIE deducts EXP, consumes the chip, and queues a die reward', () => {
    let state = openStudio(startTwoPlayerGame())
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 20 } : p)) }
    const genre = state.elementOffers[0]
    state = apply(state, { type: 'BUY_DIE', offerIndex: 0 }).state
    expect(state.players[0].exp).toBe(15)
    expect(state.elementOffers).toHaveLength(3)
    expect(state.elementDiscard).toContain(genre)
    const rewards = state.pendingRewards['player-1']
    expect(rewards).toHaveLength(1)
    expect(rewards[0].kind).toBe('die')
    expect(state.studio.activeRewardId).toBe(rewards[0].id)
    if (rewards[0].kind === 'die') {
      expect(rewards[0].dice.genre).toBe(genre)
      expect(rewards[0].dice.type).toBe('d4')
    }
  })

  it('SLOT_DIE_REWARD places the die and removes the reward', () => {
    let state = openStudio(startTwoPlayerGame())
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 20 } : p)) }
    state = apply(state, { type: 'BUY_DIE', offerIndex: 0 }).state
    const reward = state.pendingRewards['player-1'][0]
    const song = state.players[0].songs[1] // empty song
    state = apply(state, { type: 'SLOT_DIE_REWARD', rewardId: reward.id, songId: song.id, slotIndex: 0 }).state
    expect(state.pendingRewards['player-1']).toHaveLength(0)
    const slot = state.players[0].songs[1].slots[0]
    expect(slot.dice).not.toBeNull()
  })

  it('BUY_INSPIRATION escalates within a turn and END_TURN resets it', () => {
    let state = openStudio(startTwoPlayerGame())
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 100 } : p)) }
    state = apply(state, { type: 'BUY_INSPIRATION' }).state // 5
    state = apply(state, { type: 'BUY_INSPIRATION' }).state // 10
    expect(state.players[0].exp).toBe(85)
    // Players start with 1 Inspiration, so two purchases bring it to 3
    expect(state.players[0].inspiration).toBe(3)
    expect(applyAction({ ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 0 } : p)) }, { type: 'BUY_INSPIRATION' }, ctx()).ok).toBe(false)
  })

  it('UPGRADE_DIE requires a matching element chip', () => {
    let state = openStudio(startTwoPlayerGame())
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 50 } : p)) }
    const p1 = state.players[0]
    const die = p1.songs[0].slots[0].dice! // Ballad d4
    const matchingIdx = state.elementOffers.findIndex((g) => g === die.genre)
    const mismatchIdx = state.elementOffers.findIndex((g) => g !== die.genre)
    if (mismatchIdx !== -1) {
      expect(applyAction(state, { type: 'UPGRADE_DIE', offerIndex: mismatchIdx, diceId: die.id }, ctx()).ok).toBe(false)
    }
    if (matchingIdx !== -1) {
      const result = apply(state, { type: 'UPGRADE_DIE', offerIndex: matchingIdx, diceId: die.id })
      expect(result.state.players[0].songs[0].slots[0].dice!.type).toBe('d6')
      expect(result.state.players[0].exp).toBe(45)
    }
  })
})

describe('showdown actions', () => {
  function showdownState(): EngineState {
    let state = startTwoPlayerGame()
    // finalTurnGranted already true → the next round-end flips straight to the showdown
    state = { ...state, pendingPhase: 'finalBoss' as const, finalTurnGranted: true, currentTurnPlayerIndex: 1 }
    return apply(state, { type: 'END_TURN' }).state
  }

  it('plays one song per verse per performer, then the boss adapts by element', () => {
    let state = showdownState()
    const p1Song = state.players[0].songs[0]
    let result = apply(state, { type: 'PLAY_SHOWDOWN_SONG', songId: p1Song.id })
    state = result.state
    expect(result.events.some((e) => e.type === 'showdownPlay')).toBe(true)
    // Second song refused
    expect(applyAction(state, { type: 'PLAY_SHOWDOWN_SONG', songId: p1Song.id }, ctx()).ok).toBe(false)

    state = apply(state, { type: 'FINISH_SHOWDOWN_PERFORMANCE' }).state
    expect(state.showdownPerformerIdx).toBe(1)

    const p2Song = state.players[1].songs[0]
    state = apply(state, { type: 'PLAY_SHOWDOWN_SONG', songId: p2Song.id }).state
    result = apply(state, { type: 'FINISH_SHOWDOWN_PERFORMANCE' })
    state = result.state
    const advance = result.events.find((e) => e.type === 'showdownAdvance')
    expect(advance && advance.type === 'showdownAdvance' && advance.advance).toBe('bossAdapts')
    expect(state.showdownTurn).toBe(2)
    expect(state.showdownHistory).toHaveLength(1)
  })

  it('completes after 3 verses, banks fandom into fame, allows summary advance', () => {
    let state = showdownState()
    for (let verse = 1; verse <= 3; verse++) {
      for (const pid of ['player-1', 'player-2']) {
        const performer = state.players.find((p) => p.id === pid)!
        const song = performer.songs.find((s) => s.slots.some((sl) => sl.dice))!
        state = apply(state, { type: 'PLAY_SHOWDOWN_SONG', songId: song.id }, ctx(verse * 10)).state
        state = apply(state, { type: 'FINISH_SHOWDOWN_PERFORMANCE' }).state
      }
    }
    expect(state.showdownComplete).toBe(true)
    for (const p of state.players) {
      expect(p.fame).toBe(state.showdownFandom[p.id])
      expect(p.totalBossDamage).toBe(state.showdownFandom[p.id])
    }
    state = apply(state, { type: 'ADVANCE_TO_SUMMARY' }).state
    expect(state.phase).toBe('gameOver')
  })
})

describe('seat validation (online)', () => {
  it('rejects out-of-turn actions from other seats', () => {
    const state = startTwoPlayerGame()
    const result = applyAction(
      state,
      { type: 'MOVE', playerId: 'player-2', toSpaceId: 2, inspirationTravel: false },
      seatCtx('player-2')
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('forbidden')
  })

  it('allows the current seat to act', () => {
    const state = startTwoPlayerGame()
    const result = applyAction(
      state,
      { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false },
      seatCtx('player-1')
    )
    expect(result.ok).toBe(true)
  })

  it('restricts host actions to the host seat', () => {
    const state = startTwoPlayerGame()
    expect(applyAction(state, { type: 'RESET_GAME' }, seatCtx('player-2', false)).ok).toBe(false)
    expect(applyAction(state, { type: 'RESET_GAME' }, seatCtx('player-1', true)).ok).toBe(true)
    expect(
      applyAction(state, { type: 'HOST_SKIP_TURN', targetPlayerId: 'player-1' }, seatCtx('player-1', true)).ok
    ).toBe(true)
  })

  it('showdown performances are seat-locked to the current performer', () => {
    let state = startTwoPlayerGame()
    state = { ...state, pendingPhase: 'finalBoss' as const, finalTurnGranted: true, currentTurnPlayerIndex: 1 }
    state = applyAction(state, { type: 'END_TURN' }, seatCtx('player-2')).ok
      ? (applyAction(state, { type: 'END_TURN' }, seatCtx('player-2')) as { ok: true; state: EngineState }).state
      : state
    const p2Song = state.players[1].songs[0]
    const result = applyAction(state, { type: 'PLAY_SHOWDOWN_SONG', songId: p2Song.id }, seatCtx('player-2'))
    expect(result.ok).toBe(false)
  })

  it('HOST_SKIP_TURN auto-retreats an active combat and ends the turn', () => {
    let state = startTwoPlayerGame()
    state = {
      ...state,
      spaces: state.spaces.map((s) => (s.id === 1 ? { ...s, genreTags: ['Ballad', 'Ballad'] } : s)),
    }
    state = apply(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false }).state
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    const result = apply(state, { type: 'HOST_SKIP_TURN', targetPlayerId: 'player-1' }, seatCtx('host', true))
    expect(result.state.combat.isActive).toBe(false)
    expect(result.state.currentTurnPlayerIndex).toBe(1)
    expect(result.events.some((e) => e.type === 'combatEnded')).toBe(true)
  })
})
