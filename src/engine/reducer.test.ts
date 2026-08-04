import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx, computeCombatRewards } from './reducer'
import { createInitialEngineState, normalizeEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { DEFAULT_TUNABLES } from '../data/tunables'

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

/** Drive round-end reinforcements to completion: every bard drops their dealt
 *  chips onto the first tiles they have not used yet. */
function completeRedistribution(state: EngineState): EngineState {
  let s = state
  let guard = 0
  while (s.redistribution.active && guard++ < 500) {
    const used = new Set(s.redistribution.placedSpaceIds)
    const chip = s.redistribution.chipsToPlace[0]
    const target = s.spaces.find(
      (sp) => !used.has(sp.id) && sp.genreTags.filter((t) => t === chip).length < 5
    )!
    s = apply(s, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: target.id }).state
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

  it('gives every bard a single starter d8 of their element', () => {
    const state = startTwoPlayerGame()
    const [alba, bryn] = state.players

    const dice = (p: (typeof state.players)[number]) =>
      p.songs.flatMap((s) => s.slots.map((slot) => slot.dice)).filter((d) => d !== null)

    expect(dice(alba)).toHaveLength(1)
    expect(dice(alba)[0]).toMatchObject({ type: 'd8', genre: 'Ballad' })
    expect(dice(bryn)).toHaveLength(1)
    expect(dice(bryn)[0]).toMatchObject({ type: 'd8', genre: 'Folk' })
    // It sits in the first song's first slot; the second slot stays open
    expect(alba.songs[0].slots[0].dice?.type).toBe('d8')
    expect(alba.songs[0].slots[1].dice).toBeNull()
  })

  it('deals the opening chips evenly across elements, in a random order', () => {
    const counts = (state: EngineState) => {
      const tally: Record<string, number> = { Ballad: 0, Folk: 0, Hymn: 0, Shanty: 0 }
      for (const space of state.spaces) for (const tag of space.genreTags) tally[tag]++
      return tally
    }

    // 16 spaces x 1 chip = 16 chips = 4 per element, for any seed
    for (const seed of [1, 42, 99, 12345]) {
      expect(counts(startTwoPlayerGame(seed))).toEqual({ Ballad: 4, Folk: 4, Hymn: 4, Shanty: 4 })
    }

    // Balanced, but not in a fixed arrangement — different seeds place them differently
    const layout = (seed: number) => startTwoPlayerGame(seed).spaces.map((s) => s.genreTags.join())
    expect(layout(1)).not.toEqual(layout(42))
  })

  it('keeps the deal balanced when more chips per space are configured', () => {
    let state = createInitialEngineState()
    state = { ...state, tunables: { ...DEFAULT_TUNABLES, startingTagsPerSpace: 3 } }
    const started = apply(state, {
      type: 'START_GAME',
      playerConfigs: [{ name: 'Solo', starterGenre: 'Hymn', color: '#fff' }],
    }).state

    const tally: Record<string, number> = { Ballad: 0, Folk: 0, Hymn: 0, Shanty: 0 }
    for (const space of started.spaces) for (const tag of space.genreTags) tally[tag]++
    // 16 spaces x 3 chips = 48 = 12 per element
    expect(tally).toEqual({ Ballad: 12, Folk: 12, Hymn: 12, Shanty: 12 })
    expect(started.spaces.every((s) => s.genreTags.length === 3)).toBe(true)
  })

  it('spawns every level-1 monster with the same 8 HP', () => {
    const state = startTwoPlayerGame()
    const monsters = state.spaces.flatMap((sp) => sp.monsters)
    expect(monsters.length).toBeGreaterThan(0)
    // Templates differ only in flavour now — HP is uniform per level
    expect(monsters.every((m) => m.level === 1)).toBe(true)
    expect([...new Set(monsters.map((m) => m.maxHP))]).toEqual([8])
    expect(monsters.every((m) => m.currentHP === m.maxHP)).toBe(true)
    // …and distinct templates really are in play, so this is not a one-template fluke
    expect(new Set(monsters.map((m) => m.templateId)).size).toBeGreaterThan(1)
  })

  it('scales higher-level monsters from the same base', () => {
    let state = startTwoPlayerGame()
    // Stack chips so one space holds a Lv3 monster
    state = apply(state, {
      type: 'DEBUG_PATCH',
      patch: { spaceTags: { 5: ['Folk', 'Folk', 'Folk'] }, respawnMonsters: true },
    }).state
    const lv3 = state.spaces.find((sp) => sp.id === 5)!.monsters[0]
    expect(lv3.level).toBe(3)
    expect(lv3.maxHP).toBe(24) // 8 base x 3.0 level multiplier
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
    // Combat no longer opens the Studio — the button hints instead
    expect(state.studio.playerId).toBeNull()
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

  it('refreshes a song that lands a kill so it can be replayed on another monster', () => {
    let state = stateWithMonsterAtPlayer()
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    // Two monsters on the space; drop them to 1 HP so each song kills
    state = {
      ...state,
      combat: {
        ...state.combat,
        monsters: [
          { ...state.combat.monsters[0], id: 'mon-a', currentHP: 1 },
          { ...state.combat.monsters[0], id: 'mon-b', currentHP: 1 },
        ],
      },
    }
    const songId = state.players[0].songs[0].id

    // Kill the first: the song refreshes (not spent) and is legal again
    state = apply(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: 'mon-a' }).state
    expect(state.combat.monsters.find((m) => m.id === 'mon-a')!.currentHP).toBe(0)
    expect(state.combat.spentSongIds).not.toContain(songId)

    // A refreshed song cannot be rerolled — it is meant to be replayed
    expect(applyAction(state, { type: 'REROLL_SONG' }, ctx()).ok).toBe(false)

    // …and the replay lands on the second monster
    state = apply(state, { type: 'PLAY_SONG', songId, ownerId: 'player-1', targetMonsterId: 'mon-b' }).state
    expect(state.combat.monsters.find((m) => m.id === 'mon-b')!.currentHP).toBe(0)
    expect(state.combat.killCredits).toHaveLength(2)
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

  it('deals every bard one chip of each element and gates placement to them', () => {
    let state = startTwoPlayerGame()
    state = apply(state, { type: 'END_TURN' }).state
    state = apply(state, { type: 'END_TURN' }).state

    expect(state.redistribution.active).toBe(true)
    expect(state.redistribution.placerIdx).toBe(0)
    // One of every element, dealt automatically — nothing to choose
    expect([...state.redistribution.chipsToPlace].sort()).toEqual(['Ballad', 'Folk', 'Hymn', 'Shanty'])

    // Only the bard whose hand it is may place
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-2')).ok).toBe(false)
    state = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-1')).state
    // …and not twice on the same tile
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-1')).ok).toBe(false)
    expect(state.redistribution.chipsToPlace).toHaveLength(3)

    // Finishing the hand passes to the next bard, with a fresh set of chips
    state = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 1 }).state
    state = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 2 }).state
    state = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 3 }).state
    expect(state.redistribution.placerIdx).toBe(1)
    expect([...state.redistribution.chipsToPlace].sort()).toEqual(['Ballad', 'Folk', 'Hymn', 'Shanty'])
    expect(state.redistribution.placedSpaceIds).toEqual([])
    // The second bard may reuse tiles the first one used — the limit is per-hand
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-2')).ok).toBe(true)
  })

  it('caps chips per element, not per tile', () => {
    let state = startTwoPlayerGame()
    state = apply(state, { type: 'END_TURN' }).state
    state = apply(state, { type: 'END_TURN' }).state

    // Fill tile 0 with the cap of one element, plus other elements on top
    const chip = state.redistribution.chipsToPlace[0]
    state = {
      ...state,
      spaces: state.spaces.map((s) =>
        s.id === 0 ? { ...s, genreTags: Array(5).fill(chip) } : s
      ),
    }
    // That element is maxed out here…
    expect(applyAction(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }, seatCtx('player-1')).ok).toBe(false)

    // …but a different element still fits, however many chips the tile holds
    const other = state.redistribution.chipsToPlace.find((c) => c !== chip)!
    state = {
      ...state,
      redistribution: {
        ...state.redistribution,
        chipsToPlace: [other, ...state.redistribution.chipsToPlace.filter((c) => c !== other)],
      },
    }
    const placed = apply(state, { type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: 0 }).state
    expect(placed.spaces[0].genreTags).toHaveLength(6)
  })

  it('respects roundEndChipsPerElement', () => {
    let state = startTwoPlayerGame()
    state = { ...state, tunables: { ...DEFAULT_TUNABLES, roundEndChipsPerElement: 2 } }
    state = apply(state, { type: 'END_TURN' }).state
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.redistribution.chipsToPlace).toHaveLength(8)
    expect([...state.redistribution.chipsToPlace].sort()).toEqual(
      ['Ballad', 'Ballad', 'Folk', 'Folk', 'Hymn', 'Hymn', 'Shanty', 'Shanty']
    )
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
    expect(state.players[0].exp).toBe(19)
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

  it('tracks the Studio visit so the UI can hint it after a fight', () => {
    let state = startTwoPlayerGame()
    expect(state.players[0].hasShoppedThisTurn).toBe(false)

    state = apply(state, { type: 'OPEN_STUDIO', playerId: 'player-1' }).state
    expect(state.players[0].hasShoppedThisTurn).toBe(true)
    expect(state.players[1].hasShoppedThisTurn).toBe(false)

    // Closing keeps the flag — you have already seen the shop this turn
    state = apply(state, { type: 'CLOSE_STUDIO' }).state
    expect(state.players[0].hasShoppedThisTurn).toBe(true)

    // …and it resets when the turn passes
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.players[0].hasShoppedThisTurn).toBe(false)
  })

  it('BUY_INSPIRATION escalates within a turn and END_TURN resets it', () => {
    let state = openStudio(startTwoPlayerGame())
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, exp: 100 } : p)) }
    state = apply(state, { type: 'BUY_INSPIRATION' }).state // 1
    state = apply(state, { type: 'BUY_INSPIRATION' }).state // 2
    expect(state.players[0].exp).toBe(97)
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
      expect(result.state.players[0].songs[0].slots[0].dice!.type).toBe('d8')
      expect(result.state.players[0].exp).toBe(48)
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

describe('tunables', () => {
  it('a new game carries the default tunables', () => {
    const state = startTwoPlayerGame()
    expect(state.tunables).toEqual(DEFAULT_TUNABLES)
  })

  it('startingTagsPerSpace controls the opening board', () => {
    let state = createInitialEngineState()
    state = { ...state, tunables: { ...DEFAULT_TUNABLES, startingTagsPerSpace: 3 } }
    const started = apply(state, {
      type: 'START_GAME',
      playerConfigs: [
        { name: 'Alba', starterGenre: 'Ballad', color: '#3b82f6' },
        { name: 'Bryn', starterGenre: 'Folk', color: '#ef4444' },
      ],
    }).state
    expect(started.spaces.every((s) => s.genreTags.length === 3)).toBe(true)
  })

  it('the fame gate drives the showdown transition', () => {
    let state = startTwoPlayerGame()
    // Lower the gate so a modest fame total arms the boss
    state = { ...state, tunables: { ...DEFAULT_TUNABLES, fameFinalBossThreshold: 1 } }
    state = {
      ...state,
      spaces: state.spaces.map((s) => (s.id === 1 ? { ...s, genreTags: ['Ballad'] } : s)),
    }
    state = apply(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: 1, inspirationTravel: false }).state
    state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
    state = {
      ...state,
      combat: { ...state.combat, monsters: state.combat.monsters.map((m) => ({ ...m, currentHP: 1 })) },
    }
    state = apply(state, {
      type: 'PLAY_SONG',
      songId: state.players[0].songs[0].id,
      ownerId: 'player-1',
      targetMonsterId: state.combat.monsters[0].id,
    }).state
    state = apply(state, { type: 'END_COMBAT', spreadGenre: 'Folk' }).state
    expect(state.pendingPhase).toBe('finalBoss')
  })

  it('monsterHpScale scales spawned monster HP', () => {
    const base = startTwoPlayerGame()
    const scaled = applyAction(
      { ...base, tunables: { ...DEFAULT_TUNABLES, monsterHpScale: 4 } },
      { type: 'DEBUG_PATCH', patch: { respawnMonsters: true } },
      ctx()
    )
    if (!scaled.ok) throw new Error(scaled.message)
    const baseHp = base.spaces.flatMap((s) => s.monsters).reduce((n, m) => n + m.maxHP, 0)
    const scaledHp = scaled.state.spaces.flatMap((s) => s.monsters).reduce((n, m) => n + m.maxHP, 0)
    expect(scaledHp).toBeGreaterThan(baseHp * 3)
  })

  it('normalizes tunables loaded from an older or hand-edited save', () => {
    const state = normalizeEngineState({
      ...startTwoPlayerGame(),
      tunables: undefined as never,
    })
    expect(state.tunables).toEqual(DEFAULT_TUNABLES)
  })

  it('drops tunable keys that no longer exist in the schema', () => {
    const state = normalizeEngineState({
      ...startTwoPlayerGame(),
      tunables: { ...DEFAULT_TUNABLES, upgradeCostD6: 5 } as never,
    })
    expect(state.tunables).not.toHaveProperty('upgradeCostD6')
    expect(state.tunables).toEqual(DEFAULT_TUNABLES)
  })
})

describe('legacy save migration', () => {
  it('rewrites retired d6 dice to d8 on load, in songs and pending rewards', () => {
    const base = startTwoPlayerGame()
    const stale: EngineState = {
      ...base,
      players: base.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              songs: p.songs.map((song, si) =>
                si === 0
                  ? { ...song, slots: [{ dice: { id: 'old', type: 'd6' as never, genre: 'Ballad' as const } }, { dice: null }] as never }
                  : song
              ),
            }
          : p
      ),
      pendingRewards: {
        'player-1': [{ kind: 'die', id: 'r1', dice: { id: 'old-reward', type: 'd6' as never, genre: 'Folk' } }],
      },
    }

    const migrated = normalizeEngineState(stale)
    expect(migrated.players[0].songs[0].slots[0].dice?.type).toBe('d8')
    const reward = migrated.pendingRewards['player-1'][0]
    expect(reward.kind === 'die' && reward.dice.type).toBe('d8')
    // Untouched dice keep their type
    expect(migrated.players[1].songs[0].slots[0].dice?.type).toBe('d8')
  })
})

describe('debug actions', () => {
  it('DEBUG_PATCH edits players, flow, chips and tunables', () => {
    let state = startTwoPlayerGame()
    state = apply(state, {
      type: 'DEBUG_PATCH',
      patch: {
        players: { 'player-1': { fame: 120, exp: 60, inspiration: 7, position: 5 } },
        flow: { currentRound: 4, pendingPhase: 'finalBoss', finalTurnGranted: true },
        spaceTags: { 2: ['Hymn', 'Hymn', 'Shanty'] },
        tunables: { newD4Cost: 1 },
        respawnMonsters: true,
      },
    }).state

    const p1 = state.players[0]
    expect([p1.fame, p1.exp, p1.inspiration, p1.position]).toEqual([120, 60, 7, 5])
    expect(state.currentRound).toBe(4)
    expect(state.pendingPhase).toBe('finalBoss')
    expect(state.tunables.newD4Cost).toBe(1)

    const space2 = state.spaces.find((s) => s.id === 2)!
    expect(space2.genreTags).toEqual(['Hymn', 'Hymn', 'Shanty'])
    // Respawn re-derives the roster: one monster per unique chip, Hymn at Lv2
    expect(space2.monsters).toHaveLength(2)
    expect(space2.monsters.find((m) => m.level === 2)).toBeDefined()
  })

  it('DEBUG_PATCH clamps hostile values instead of corrupting state', () => {
    let state = startTwoPlayerGame()
    state = apply(state, {
      type: 'DEBUG_PATCH',
      patch: {
        players: { 'player-1': { fame: -50, exp: Number.NaN, position: 999 } },
        flow: { currentTurnPlayerIndex: 99, currentRound: -3 },
        spaceTags: { 0: Array(50).fill('Ballad') },
        tunables: { maxTagsPerGenre: 99999 },
      },
    }).state

    expect(state.players[0].fame).toBe(0)
    expect(state.players[0].exp).toBe(0) // NaN ignored, keeps prior value
    expect(state.players[0].position).toBe(0) // 999 is not a real space
    expect(state.currentTurnPlayerIndex).toBe(1) // clamped to players.length - 1
    expect(state.currentRound).toBe(1)
    expect(state.tunables.maxTagsPerGenre).toBe(20) // field max
    expect(state.spaces[0].genreTags.length).toBeLessThanOrEqual(20)
  })

  it('DEBUG_PATCH edits dice: retype, re-element, add and clear', () => {
    let state = startTwoPlayerGame()
    const song1 = state.players[0].songs[0]
    const song2 = state.players[0].songs[1]
    const starterDieId = song1.slots[0].dice!.id

    state = apply(state, {
      type: 'DEBUG_PATCH',
      patch: {
        dice: [
          // retype + re-element the starter die
          { playerId: 'player-1', songId: song1.id, slotIndex: 0, dice: { type: 'd20', genre: 'Shanty' } },
          // fill the open slot next to it
          { playerId: 'player-1', songId: song1.id, slotIndex: 1, dice: { type: 'd12', genre: 'Hymn' } },
          // and stock an empty song
          { playerId: 'player-1', songId: song2.id, slotIndex: 0, dice: { type: 'd4', genre: 'Folk' } },
        ],
      },
    }).state

    const edited = state.players[0]
    expect(edited.songs[0].slots[0].dice).toMatchObject({ type: 'd20', genre: 'Shanty' })
    // Editing in place keeps the die id, so in-flight combat rolls still match
    expect(edited.songs[0].slots[0].dice!.id).toBe(starterDieId)
    expect(edited.songs[0].slots[1].dice).toMatchObject({ type: 'd12', genre: 'Hymn' })
    expect(edited.songs[1].slots[0].dice).toMatchObject({ type: 'd4', genre: 'Folk' })
    // A newly added die gets its own id
    expect(edited.songs[0].slots[1].dice!.id).not.toBe(starterDieId)
    // The other player is untouched
    expect(state.players[1].songs[0].slots[0].dice).toMatchObject({ type: 'd8', genre: 'Folk' })

    // Clearing a slot empties it
    state = apply(state, {
      type: 'DEBUG_PATCH',
      patch: { dice: [{ playerId: 'player-1', songId: song1.id, slotIndex: 0, dice: null }] },
    }).state
    expect(state.players[0].songs[0].slots[0].dice).toBeNull()
  })

  it('DEBUG_PATCH skips dice edits with unknown ids or invalid values', () => {
    const state = startTwoPlayerGame()
    const song1 = state.players[0].songs[0]
    const before = state.players[0].songs[0].slots[0].dice

    const patched = apply(state, {
      type: 'DEBUG_PATCH',
      patch: {
        dice: [
          { playerId: 'nobody', songId: song1.id, slotIndex: 0, dice: { type: 'd20', genre: 'Folk' } },
          { playerId: 'player-1', songId: 'no-such-song', slotIndex: 0, dice: { type: 'd20', genre: 'Folk' } },
          { playerId: 'player-1', songId: song1.id, slotIndex: 9, dice: { type: 'd20', genre: 'Folk' } },
          { playerId: 'player-1', songId: song1.id, slotIndex: 0, dice: { type: 'd6' as never, genre: 'Folk' } },
          { playerId: 'player-1', songId: song1.id, slotIndex: 0, dice: { type: 'd20', genre: 'Jazz' as never } },
        ],
      },
    }).state

    expect(patched.players[0].songs[0].slots[0].dice).toEqual(before)
  })

  it('DEBUG_PATCH ignores unknown player ids', () => {
    const state = startTwoPlayerGame()
    const patched = apply(state, {
      type: 'DEBUG_PATCH',
      patch: { players: { 'player-99': { fame: 500 } } },
    }).state
    expect(patched.players.map((p) => p.fame)).toEqual([0, 0])
  })

  it('DEBUG_LOAD_STATE restores a snapshot and never rewinds the id counter', () => {
    const preset = apply(startTwoPlayerGame(7), {
      type: 'DEBUG_PATCH',
      patch: { players: { 'player-1': { fame: 99 } } },
    }).state
    const live = { ...startTwoPlayerGame(3), nextIdSeq: 500 }

    const loaded = apply(live, { type: 'DEBUG_LOAD_STATE', engineState: preset }).state
    expect(loaded.players[0].fame).toBe(99)
    expect(loaded.nextIdSeq).toBeGreaterThanOrEqual(500)
  })

  it('restricts debug actions to the host seat', () => {
    const state = startTwoPlayerGame()
    const patch = { type: 'DEBUG_PATCH' as const, patch: { players: { 'player-1': { fame: 999 } } } }
    expect(applyAction(state, patch, seatCtx('player-1', false)).ok).toBe(false)
    expect(applyAction(state, patch, seatCtx('player-1', true)).ok).toBe(true)

    const load = { type: 'DEBUG_LOAD_STATE' as const, engineState: state }
    expect(applyAction(state, load, seatCtx('player-2', false)).ok).toBe(false)
    expect(applyAction(state, load, seatCtx('player-2', true)).ok).toBe(true)
  })

  it('rejects a preset that is not a game state', () => {
    const state = startTwoPlayerGame()
    const bad = { ...state, players: [] }
    expect(applyAction(state, { type: 'DEBUG_LOAD_STATE', engineState: bad }, ctx()).ok).toBe(false)
    expect(
      applyAction(state, { type: 'DEBUG_LOAD_STATE', engineState: null as never }, ctx()).ok
    ).toBe(false)
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
