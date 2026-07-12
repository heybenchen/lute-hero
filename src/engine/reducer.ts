import {
  Player,
  Genre,
  Song,
  Monster,
  DraftCard,
  KillCredit,
  Rng,
  NewId,
} from '../types'
import { EngineState, EngineCombatState, createInitialEngineState, createInitialCombatState } from './state'
import { GameAction, ActorSeat, PlayerConfig } from './actions'
import { EngineEvent } from './events'
import { validateAction } from './validate'
import { createBoardGraph, addGenreTagsToBoard, addGenreTagToNeighbors } from '../game-logic/board/graphBuilder'
import { spawnMonstersFromTags, spawnInitialMonsters, clearSpace } from '../game-logic/combat/monsterSpawner'
import { rollSong, calculateAOEDamage, calculateDamage } from '../game-logic/combat/damageCalculator'
import {
  calculateFameEarned,
  calculateMonsterFameValue,
  calculateTotalMonsterExp,
  getNextPhase,
} from '../game-logic/fame/calculator'
import { calculateCoverFameSplit } from '../game-logic/fame/coverSongFame'
import { createStarterSongs } from '../data/startingData'
import { generateNameCard, createElementalDie, getInspirationCost, getUpgradeCost, NEW_D4_COST, INSPIRATION_SPEND } from '../data/draftCards'
import { createElementBag, drawFromBag, ELEMENT_OFFER_COUNT } from '../data/elementBag'
import {
  SHOWDOWN_TURNS,
  ShowdownPerformance,
  createShowdownBoss,
  getDominantGenre,
  computeBossAdaptation,
} from '../game-logic/showdown/showdown'
import { DICE_UPGRADE_PATH } from '../data/startingData'

export { MAX_SONGS_PER_COMBAT } from './validate'
export const MAX_SONGS = 3
export const NAME_POOL_SIZE = 3

export const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']
export const STARTING_POSITIONS = [0, 3, 12, 15] // 4x4 grid corners

export interface ActionCtx {
  rng: Rng
  actor: ActorSeat
  /** Unique per-action id scope (server: action seq). Falls back to state.nextIdSeq. */
  idSeed?: string
}

export type ApplyResult =
  | { ok: true; state: EngineState; events: EngineEvent[] }
  | { ok: false; code: 'forbidden' | 'illegal'; message: string }

/**
 * Validate and apply one atomic action. Pure: same state + action + rng
 * sequence always produces the same result on server and client.
 */
export function applyAction(state: EngineState, action: GameAction, ctx: ActionCtx): ApplyResult {
  const validation = validateAction(state, action, ctx.actor)
  if (!validation.ok) return validation

  const idScope = ctx.idSeed ?? String(state.nextIdSeq)
  let idCounter = 0
  const newId: NewId = (prefix) => `${prefix}-${idScope}-${idCounter++}`

  const events: EngineEvent[] = []
  const next = reduce({ ...state, nextIdSeq: state.nextIdSeq + 1 }, action, ctx.rng, newId, events)
  return { ok: true, state: next, events }
}

// ============================================================
// Reducer body
// ============================================================

function reduce(
  state: EngineState,
  action: GameAction,
  rng: Rng,
  newId: NewId,
  events: EngineEvent[]
): EngineState {
  switch (action.type) {
    case 'START_GAME':
      return startGame(state, action.playerConfigs, rng, newId)

    case 'MOVE': {
      const players = state.players.map((p) =>
        p.id === action.playerId
          ? {
              ...p,
              position: action.toSpaceId,
              movesThisTurn: p.movesThisTurn + 1,
              inspiration: action.inspirationTravel ? p.inspiration - INSPIRATION_SPEND : p.inspiration,
            }
          : p
      )
      // Entering a space re-spawns its monsters from the current tags
      const space = state.spaces.find((s) => s.id === action.toSpaceId)!
      const monsters = spawnMonstersFromTags(
        space.genreTags,
        action.toSpaceId,
        state.currentRound || 1,
        rng,
        newId
      )
      const spaces = state.spaces.map((s) => (s.id === action.toSpaceId ? { ...s, monsters } : s))
      return { ...state, players, spaces }
    }

    case 'START_COMBAT': {
      const player = state.players.find((p) => p.id === action.playerId)!
      const space = state.spaces.find((s) => s.id === player.position)!
      const players = state.players.map((p) =>
        p.id === player.id ? { ...p, fightsThisTurn: p.fightsThisTurn + 1 } : p
      )
      const combat: EngineCombatState = {
        ...createInitialCombatState(),
        isActive: true,
        playerId: player.id,
        spaceId: space.id,
        monsters: space.monsters,
      }
      return { ...state, players, combat }
    }

    case 'PLAY_SONG': {
      const owner = state.players.find((p) => p.id === action.ownerId)!
      const song = owner.songs.find((s) => s.id === action.songId)!
      const snapshot = {
        monsters: state.combat.monsters,
        songsUsed: state.combat.songsUsed,
        killCredits: state.combat.killCredits,
        totalDamage: state.combat.totalDamage,
      }
      const combat = performCombatPlay(state.combat, snapshot, song, owner.id, rng, events)
      return { ...state, combat: { ...combat, undoSnapshot: snapshot, lastPlayedSongId: song.id, lastPlayedOwnerId: owner.id } }
    }

    case 'REROLL_SONG': {
      const fighterId = state.combat.playerId!
      const ownerId = state.combat.lastPlayedOwnerId!
      const owner = state.players.find((p) => p.id === ownerId)!
      const song = owner.songs.find((s) => s.id === state.combat.lastPlayedSongId)!
      const players = state.players.map((p) =>
        p.id === fighterId ? { ...p, inspiration: p.inspiration - INSPIRATION_SPEND } : p
      )
      // Replay from the pre-play snapshot — a true reroll. The snapshot stays
      // put so the song can be rerolled again.
      const snapshot = state.combat.undoSnapshot!
      const combat = performCombatPlay(state.combat, snapshot, song, ownerId, rng, events)
      return { ...state, players, combat }
    }

    case 'END_COMBAT':
      return endCombat(state, action.spreadGenre ?? null, events)

    case 'END_TURN':
      return endTurn(state, rng, newId)

    case 'BUY_DIE': {
      const player = state.players[state.currentTurnPlayerIndex]
      const genre = state.elementOffers[action.offerIndex]
      const reward = { kind: 'die' as const, id: newId('reward'), dice: createElementalDie(genre, newId) }
      return {
        ...state,
        players: adjustExp(state.players, player.id, -NEW_D4_COST),
        elementOffers: state.elementOffers.filter((_, i) => i !== action.offerIndex),
        elementDiscard: [...state.elementDiscard, genre],
        pendingRewards: {
          ...state.pendingRewards,
          [player.id]: [...(state.pendingRewards[player.id] ?? []), reward],
        },
      }
    }

    case 'UPGRADE_DIE': {
      const player = state.players[state.currentTurnPlayerIndex]
      const genre = state.elementOffers[action.offerIndex]
      const die = player.songs
        .flatMap((s) => s.slots)
        .map((slot) => slot.dice)
        .find((d) => d?.id === action.diceId)!
      const cost = getUpgradeCost(die.type)!
      const players = adjustExp(state.players, player.id, -cost).map((p) => {
        if (p.id !== player.id) return p
        return {
          ...p,
          songs: p.songs.map((song) => ({
            ...song,
            slots: song.slots.map((slot) => {
              if (!slot.dice || slot.dice.id !== action.diceId) return slot
              const nextType = DICE_UPGRADE_PATH[slot.dice.type]
              if (!nextType) return slot
              return { ...slot, dice: { ...slot.dice, type: nextType } }
            }) as Song['slots'],
          })),
        }
      })
      return {
        ...state,
        players,
        elementOffers: state.elementOffers.filter((_, i) => i !== action.offerIndex),
        elementDiscard: [...state.elementDiscard, genre],
      }
    }

    case 'BUY_NAME': {
      const player = state.players[state.currentTurnPlayerIndex]
      const card = state.namePool.find((c) => c.id === action.cardId)!
      const reward = {
        kind: 'name' as const,
        id: newId('reward'),
        name: card.songName || 'New Song',
        effect: card.songEffect ?? null,
      }
      const exclude = usedSongNames(state.players, state.namePool)
      return {
        ...state,
        players: adjustExp(state.players, player.id, -card.cost),
        namePool: state.namePool.map((c) =>
          c.id === card.id ? generateNameCard(exclude, rng, newId) : c
        ),
        pendingRewards: {
          ...state.pendingRewards,
          [player.id]: [...(state.pendingRewards[player.id] ?? []), reward],
        },
      }
    }

    case 'REFRESH_ELEMENT_OFFERS': {
      const player = state.players[state.currentTurnPlayerIndex]
      const discard = [...state.elementDiscard, ...state.elementOffers]
      const { drawn, bag, discard: remaining } = drawFromBag(state.elementBag, discard, ELEMENT_OFFER_COUNT, rng)
      return {
        ...state,
        players: adjustInspiration(state.players, player.id, -INSPIRATION_SPEND),
        elementBag: bag,
        elementDiscard: remaining,
        elementOffers: drawn,
      }
    }

    case 'REFRESH_NAME_POOL': {
      const player = state.players[state.currentTurnPlayerIndex]
      return {
        ...state,
        players: adjustInspiration(state.players, player.id, -INSPIRATION_SPEND),
        namePool: freshNamePool(rng, newId, usedSongNames(state.players)),
      }
    }

    case 'SLOT_NAME_REWARD': {
      const player = state.players[state.currentTurnPlayerIndex]
      const reward = (state.pendingRewards[player.id] ?? []).find((r) => r.id === action.rewardId)!
      if (reward.kind !== 'name') return state
      const players = state.players.map((p) => {
        if (p.id !== player.id) return p
        return {
          ...p,
          songs: p.songs.map((s) =>
            s.id === action.songId ? { ...s, name: reward.name, effect: reward.effect } : s
          ),
        }
      })
      return { ...state, players, pendingRewards: removeReward(state.pendingRewards, player.id, reward.id) }
    }

    case 'SLOT_DIE_REWARD': {
      const player = state.players[state.currentTurnPlayerIndex]
      const reward = (state.pendingRewards[player.id] ?? []).find((r) => r.id === action.rewardId)!
      if (reward.kind !== 'die') return state
      const players = state.players.map((p) => {
        if (p.id !== player.id) return p
        return {
          ...p,
          songs: p.songs.map((song) => {
            if (song.id !== action.songId) return song
            const slots = [...song.slots] as Song['slots']
            slots[action.slotIndex] = { ...slots[action.slotIndex], dice: reward.dice }
            return { ...song, slots }
          }),
        }
      })
      return { ...state, players, pendingRewards: removeReward(state.pendingRewards, player.id, reward.id) }
    }

    case 'BUY_INSPIRATION': {
      const player = state.players[state.currentTurnPlayerIndex]
      const cost = getInspirationCost(player.inspirationBoughtThisTurn)
      const players = state.players.map((p) =>
        p.id === player.id
          ? {
              ...p,
              exp: p.exp - cost,
              inspiration: p.inspiration + 1,
              inspirationBoughtThisTurn: p.inspirationBoughtThisTurn + 1,
            }
          : p
      )
      return { ...state, players }
    }

    case 'PLAY_SHOWDOWN_SONG':
      return playShowdownSong(state, action.songId, rng, events)

    case 'REROLL_SHOWDOWN_SONG':
      return rerollShowdownSong(state, rng, events)

    case 'FINISH_SHOWDOWN_PERFORMANCE':
      return finishShowdownPerformance(state, events)

    case 'ADVANCE_TO_SUMMARY':
      return { ...state, phase: 'gameOver' }

    case 'RESET_GAME':
      return createInitialEngineState()

    case 'HOST_SKIP_TURN': {
      let working = state
      // Auto-retreat any combat the skipped player is stuck in
      if (working.combat.isActive) {
        working = endCombat(working, null, events)
      }
      return endTurn(working, rng, newId)
    }
  }
}

// ============================================================
// START_GAME
// ============================================================

function startGame(state: EngineState, configs: PlayerConfig[], rng: Rng, newId: NewId): EngineState {
  // 1. Fresh board
  let spaces = createBoardGraph()

  // 2. Players
  const players: Player[] = configs.map((config, index) => {
    const playerId = `player-${index + 1}`
    return {
      id: playerId,
      name: config.name,
      color: config.color || PLAYER_COLORS[index] || '#888888',
      starterGenre: config.starterGenre,
      position: STARTING_POSITIONS[index] || 0,
      songs: createStarterSongs(config.starterGenre, playerId),
      exp: 0,
      fame: 0,
      monstersDefeated: 0,
      isEliminated: false,
      totalBossDamage: 0,
      movesThisTurn: 0,
      fightsThisTurn: 0,
      hasShoppedThisTurn: false,
      inspiration: 1,
      inspirationBoughtThisTurn: 0,
    }
  })

  // 3. Seed each player's starter element onto their neighboring spaces
  for (const player of players) {
    const playerSpace = spaces.find((s) => s.id === player.position)
    if (!playerSpace) continue
    const starterGenre = player.songs[0].slots[0].dice?.genre || 'Ballad'
    spaces = spaces.map((s) =>
      playerSpace.connections.includes(s.id)
        ? { ...s, genreTags: [...s.genreTags, starterGenre] }
        : s
    )
  }

  // 4. One random tag everywhere, capped at 1 tag per space
  spaces = addGenreTagsToBoard(spaces, rng)
  spaces = spaces.map((s) => ({ ...s, genreTags: s.genreTags.slice(0, 1) }))

  // 5. Initial monsters
  spaces = spaces.map((space) => {
    if (space.genreTags.length === 0) return space
    return { ...space, monsters: spawnInitialMonsters(space.genreTags, space.id, 1, rng, newId) }
  })

  // 6. Shop
  const fullBag = createElementBag(configs.length, rng)
  const { drawn, bag, discard } = drawFromBag(fullBag, [], ELEMENT_OFFER_COUNT, rng)

  return {
    ...state,
    phase: 'main',
    currentRound: 1,
    currentTurnPlayerIndex: 0,
    pendingPhase: null,
    finalTurnGranted: false,
    spaces,
    players,
    namePool: freshNamePool(rng, newId, usedSongNames(players)),
    elementBag: bag,
    elementDiscard: discard,
    elementOffers: drawn,
    pendingRewards: {},
    combat: createInitialCombatState(),
  }
}

// ============================================================
// Combat helpers
// ============================================================

interface CombatSnapshot {
  monsters: Monster[]
  songsUsed: EngineCombatState['songsUsed']
  killCredits: KillCredit[]
  totalDamage: number
}

/** Perform a song against the combat monsters, starting from a snapshot. */
function performCombatPlay(
  combat: EngineCombatState,
  base: CombatSnapshot,
  song: Song,
  ownerId: string,
  rng: Rng,
  events: EngineEvent[]
): EngineCombatState {
  const isCover = ownerId !== combat.playerId
  const monstersBefore = base.monsters

  const { rolls } = rollSong(song, rng)
  const { damageCalculations, updatedMonsters } = calculateAOEDamage(song, rolls, monstersBefore)

  const newKillCredits: KillCredit[] = updatedMonsters
    .filter((m, i) => monstersBefore[i].currentHP > 0 && m.currentHP <= 0)
    .map((m) => ({ monsterId: m.id, songOwnerId: ownerId, isCover }))

  const totalDamageDealt = damageCalculations.reduce((sum, calc) => sum + calc.totalDamage, 0)

  events.push({ type: 'diceRolled', playerId: ownerId, songId: song.id, context: 'combat', rolls })
  events.push({
    type: 'damageDealt',
    calculations: damageCalculations,
    monstersBefore,
    monstersAfter: updatedMonsters,
  })

  return {
    ...combat,
    monsters: updatedMonsters,
    songsUsed: [...base.songsUsed, { songId: song.id, ownerId, isCover }],
    killCredits: [...base.killCredits, ...newKillCredits],
    currentSongId: song.id,
    rolls,
    totalDamage: base.totalDamage + totalDamageDealt,
    lastDamageCalculations: damageCalculations,
  }
}

/** Fame each participant earns from the current combat, by kill credits. */
export function computeCombatRewards(combat: {
  monsters: Monster[]
  killCredits: KillCredit[]
}): {
  totalFameEarned: number
  fighterFame: number
  coverFameByOwner: Map<string, number>
  totalExp: number
  monstersDefeatedCount: number
} {
  const defeated = combat.monsters.filter((m) => m.currentHP <= 0)
  const monstersDefeatedCount = defeated.length
  const totalExp = calculateTotalMonsterExp(combat.monsters)
  const totalFameEarned = calculateFameEarned(defeated.map((m) => m.level))

  const fameForKill = (monsterId: string) => {
    const level = combat.monsters.find((m) => m.id === monsterId)?.level ?? 1
    return calculateMonsterFameValue(level)
  }

  let fighterFame = combat.killCredits
    .filter((kc) => !kc.isCover)
    .reduce((sum, kc) => sum + fameForKill(kc.monsterId), 0)

  const coverTotals = new Map<string, number>()
  combat.killCredits
    .filter((kc) => kc.isCover)
    .forEach((kc) => {
      coverTotals.set(kc.songOwnerId, (coverTotals.get(kc.songOwnerId) || 0) + fameForKill(kc.monsterId))
    })

  const coverFameByOwner = new Map<string, number>()
  coverTotals.forEach((coverFame, ownerId) => {
    const splitShare = calculateCoverFameSplit(coverFame)
    if (splitShare > 0) coverFameByOwner.set(ownerId, splitShare)
    fighterFame += splitShare // fighter gets the other half of every cover kill
  })

  return { totalFameEarned, fighterFame, coverFameByOwner, totalExp, monstersDefeatedCount }
}

function endCombat(state: EngineState, spreadGenre: Genre | null, events: EngineEvent[]): EngineState {
  const combat = state.combat
  const fighterId = combat.playerId!
  const spaceId = combat.spaceId!
  const success = combat.monsters.every((m) => m.currentHP <= 0)
  const rewards = computeCombatRewards(combat)

  // EXP always awarded for the full encounter; fame per kill credit
  let players = adjustExp(state.players, fighterId, rewards.totalExp)
  if (rewards.monstersDefeatedCount > 0) {
    if (rewards.fighterFame > 0) {
      players = players.map((p) => (p.id === fighterId ? { ...p, fame: p.fame + rewards.fighterFame } : p))
    }
    rewards.coverFameByOwner.forEach((fame, ownerId) => {
      players = players.map((p) => (p.id === ownerId ? { ...p, fame: p.fame + fame } : p))
    })
    players = players.map((p) =>
      p.id === fighterId ? { ...p, monstersDefeated: p.monstersDefeated + rewards.monstersDefeatedCount } : p
    )
  }

  // Phase transition check (fires as pendingPhase; applied at round end).
  // Triggers when ANY single player reaches the threshold; latches once set.
  let pendingPhase = state.pendingPhase
  if (rewards.monstersDefeatedCount > 0 && !pendingPhase) {
    const nextPhase = getNextPhase(state.phase, players.map((p) => p.fame))
    if (nextPhase) pendingPhase = nextPhase
  }

  let spaces = state.spaces
  if (success) {
    spaces = spaces.map((s) => (s.id === spaceId ? clearSpace(s) : s))
    if (spreadGenre) {
      spaces = addGenreTagToNeighbors(spaces, spaceId, spreadGenre)
    }
  } else {
    // Retreat: remove tags for defeated monsters (level x vulnerability),
    // add tags back for the survivors
    const defeatedTags: Genre[] = combat.monsters
      .filter((m) => m.currentHP <= 0 && m.vulnerability !== null)
      .flatMap((m) => Array(m.level).fill(m.vulnerability!) as Genre[])
    if (defeatedTags.length > 0) {
      spaces = spaces.map((s) => {
        if (s.id !== spaceId) return s
        const remaining = [...s.genreTags]
        for (const genre of defeatedTags) {
          const idx = remaining.indexOf(genre)
          if (idx !== -1) remaining.splice(idx, 1)
        }
        return { ...s, genreTags: remaining }
      })
    }
    const survivingGenres = combat.monsters
      .filter((m) => m.currentHP > 0 && m.vulnerability !== null)
      .map((m) => m.vulnerability!)
    if (survivingGenres.length > 0) {
      spaces = spaces.map((s) =>
        s.id === spaceId ? { ...s, genreTags: [...s.genreTags, ...survivingGenres] } : s
      )
    }
  }

  events.push({
    type: 'combatEnded',
    playerId: fighterId,
    success,
    monstersDefeated: rewards.monstersDefeatedCount,
  })

  return { ...state, players, spaces, pendingPhase, combat: createInitialCombatState() }
}

// ============================================================
// END_TURN
// ============================================================

function endTurn(state: EngineState, rng: Rng, newId: NewId): EngineState {
  const current = state.players[state.currentTurnPlayerIndex]
  let players = state.players.map((p) =>
    p.id === current.id
      ? { ...p, movesThisTurn: 0, fightsThisTurn: 0, inspirationBoughtThisTurn: 0 }
      : p
  )

  let { phase, pendingPhase, finalTurnGranted, currentRound, currentTurnPlayerIndex, spaces } = state
  let showdownFields: Partial<EngineState> = {}

  if (state.currentTurnPlayerIndex >= state.players.length - 1) {
    // Round over: everyone resets, the board grows, pending phase applies.
    players = players.map((p) => ({ ...p, movesThisTurn: 0, fightsThisTurn: 0 }))
    spaces = addGenreTagsToBoard(spaces, rng)
    // Reaching the threshold grants one more full round ("Final Turn!") before
    // the phase actually flips — so the leaders can't be caught off guard.
    if (pendingPhase) {
      if (!finalTurnGranted) {
        finalTurnGranted = true
      } else {
        phase = pendingPhase
        pendingPhase = null
        finalTurnGranted = false
      }
    }
    currentRound = currentRound + 1
    currentTurnPlayerIndex = 0

    // Entering the showdown: start it right here so there is no client-side
    // auto-start race — every client just renders the started showdown.
    if (phase === 'finalBoss' && !state.showdownActive) {
      const playerIds = players.map((p) => p.id)
      showdownFields = {
        showdownActive: true,
        showdownComplete: false,
        showdownTurn: 1,
        showdownOrder: playerIds,
        showdownPerformerIdx: 0,
        showdownResistGenre: null,
        showdownWeakGenre: null,
        showdownSongsUsed: [],
        showdownCurrentFandom: 0,
        showdownCurrentGenre: null,
        showdownTurnPerformances: [],
        showdownHistory: [],
        showdownFandom: Object.fromEntries(playerIds.map((id) => [id, 0])),
        showdownBestHit: {},
        showdownCrits: Object.fromEntries(playerIds.map((id) => [id, 0])),
        showdownUndo: null,
      }
    }
  } else {
    currentTurnPlayerIndex = currentTurnPlayerIndex + 1
  }

  // Refill the shop for the next player: top up chips, deal fresh names
  let { elementBag, elementDiscard, elementOffers, namePool } = state
  const needed = ELEMENT_OFFER_COUNT - elementOffers.length
  if (needed > 0) {
    const { drawn, bag, discard } = drawFromBag(elementBag, elementDiscard, needed, rng)
    elementOffers = [...elementOffers, ...drawn]
    elementBag = bag
    elementDiscard = discard
  }
  namePool = freshNamePool(rng, newId, usedSongNames(players))

  return {
    ...state,
    players,
    spaces,
    phase,
    pendingPhase,
    finalTurnGranted,
    currentRound,
    currentTurnPlayerIndex,
    elementBag,
    elementDiscard,
    elementOffers,
    namePool,
    ...showdownFields,
  }
}

// ============================================================
// Showdown
// ============================================================

/** Roll a song against the adapted boss and derive the performance stats. */
function rollShowdownPlay(
  state: EngineState,
  song: Song,
  performerId: string,
  base: { currentFandom: number; fandomTotal: number; bestHit: { damage: number; songName: string } | undefined; crits: number },
  rng: Rng,
  events: EngineEvent[]
) {
  const boss = createShowdownBoss({
    resistGenre: state.showdownResistGenre,
    weakGenre: state.showdownWeakGenre,
  })
  const { rolls } = rollSong(song, rng)
  const calc = calculateDamage(song, rolls, boss)
  const fandom = Math.max(0, calc.totalDamage)
  const genre = getDominantGenre(song, rolls)
  const critCount = rolls.filter((r) => r.isCrit).length

  const songGenres = song.slots
    .map((slot) => slot.dice?.genre)
    .filter((g): g is Genre => g !== undefined)
  const hitWeakness = state.showdownWeakGenre !== null && songGenres.includes(state.showdownWeakGenre)
  const wasResisted = state.showdownResistGenre !== null && songGenres.includes(state.showdownResistGenre)

  const bestHit =
    !base.bestHit || fandom > base.bestHit.damage
      ? { damage: fandom, songName: song.name || 'Untitled' }
      : base.bestHit

  events.push({ type: 'diceRolled', playerId: performerId, songId: song.id, context: 'showdown', rolls })
  events.push({
    type: 'showdownPlay',
    playerId: performerId,
    songId: song.id,
    fandom,
    hadCrit: critCount > 0,
    hitWeakness,
    wasResisted,
    genre,
  })

  return {
    showdownCurrentFandom: base.currentFandom + fandom,
    showdownCurrentGenre: genre,
    showdownFandom: { ...state.showdownFandom, [performerId]: base.fandomTotal + fandom },
    showdownBestHit: { ...state.showdownBestHit, [performerId]: bestHit },
    showdownCrits: { ...state.showdownCrits, [performerId]: base.crits + critCount },
  }
}

function playShowdownSong(state: EngineState, songId: string, rng: Rng, events: EngineEvent[]): EngineState {
  const performerId = state.showdownOrder[state.showdownPerformerIdx]
  const performer = state.players.find((p) => p.id === performerId)!
  const song = performer.songs.find((s) => s.id === songId)!

  // Snapshot the performer's accumulators before this play, so it can be rerolled
  const base = {
    currentFandom: state.showdownCurrentFandom,
    fandomTotal: state.showdownFandom[performerId] || 0,
    bestHit: state.showdownBestHit[performerId],
    crits: state.showdownCrits[performerId] || 0,
  }
  const fields = rollShowdownPlay(state, song, performerId, base, rng, events)

  return {
    ...state,
    ...fields,
    showdownSongsUsed: [...state.showdownSongsUsed, songId],
    showdownUndo: {
      songId,
      performerId,
      currentFandom: base.currentFandom,
      fandomTotal: base.fandomTotal,
      bestHit: base.bestHit,
      crits: base.crits,
      songsUsed: state.showdownSongsUsed,
    },
  }
}

function rerollShowdownSong(state: EngineState, rng: Rng, events: EngineEvent[]): EngineState {
  const undo = state.showdownUndo!
  const performer = state.players.find((p) => p.id === undo.performerId)!
  const song = performer.songs.find((s) => s.id === undo.songId)!

  // Spend 1 Inspiration, then replay from the snapshot — the snapshot stays put
  // so the performance can be rerolled again.
  const players = adjustInspiration(state.players, undo.performerId, -INSPIRATION_SPEND)
  const fields = rollShowdownPlay(
    state,
    song,
    undo.performerId,
    { currentFandom: undo.currentFandom, fandomTotal: undo.fandomTotal, bestHit: undo.bestHit, crits: undo.crits },
    rng,
    events
  )
  return { ...state, players, ...fields }
}

function finishShowdownPerformance(state: EngineState, events: EngineEvent[]): EngineState {
  const performerId = state.showdownOrder[state.showdownPerformerIdx]

  const performance: ShowdownPerformance = {
    playerId: performerId,
    fandom: state.showdownCurrentFandom,
    genre: state.showdownCurrentGenre,
  }
  const turnPerformances = [...state.showdownTurnPerformances, performance]

  // More performers left this turn
  if (state.showdownPerformerIdx < state.showdownOrder.length - 1) {
    events.push({ type: 'showdownAdvance', advance: 'nextPerformer' })
    return {
      ...state,
      showdownTurnPerformances: turnPerformances,
      showdownPerformerIdx: state.showdownPerformerIdx + 1,
      showdownSongsUsed: [],
      showdownCurrentFandom: 0,
      showdownCurrentGenre: null,
      showdownUndo: null,
    }
  }

  const history = [...state.showdownHistory, turnPerformances]

  // Turn over — the boss adapts and the next verse begins
  if (state.showdownTurn < SHOWDOWN_TURNS) {
    const adaptation = computeBossAdaptation(turnPerformances)
    events.push({
      type: 'showdownAdvance',
      advance: 'bossAdapts',
      turnEnded: state.showdownTurn,
      recap: turnPerformances,
    })
    return {
      ...state,
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
    }
  }

  // Third verse complete — the boss falls. Bank fandom into fame.
  const players = state.players.map((p) => {
    const fandom = state.showdownFandom[p.id] || 0
    return { ...p, fame: p.fame + fandom, totalBossDamage: fandom }
  })

  events.push({ type: 'showdownAdvance', advance: 'showdownComplete', recap: turnPerformances })

  return {
    ...state,
    players,
    showdownHistory: history,
    showdownTurnPerformances: [],
    showdownSongsUsed: [],
    showdownCurrentFandom: 0,
    showdownCurrentGenre: null,
    showdownComplete: true,
    showdownUndo: null,
  }
}

// ============================================================
// Small shared helpers
// ============================================================

/** Song names already in play (on songs) plus a running exclude set, so the
 * shop never offers a duplicate name. */
function usedSongNames(players: Player[], extra: DraftCard[] = []): Set<string> {
  const used = new Set<string>()
  for (const p of players) {
    for (const s of p.songs) if (s.name) used.add(s.name)
  }
  for (const card of extra) if (card.songName) used.add(card.songName)
  return used
}

function freshNamePool(rng: Rng, newId: NewId, exclude: Set<string> = new Set()): DraftCard[] {
  const used = new Set(exclude)
  const pool: DraftCard[] = []
  for (let i = 0; i < NAME_POOL_SIZE; i++) {
    const card = generateNameCard(used, rng, newId)
    if (card.songName) used.add(card.songName)
    pool.push(card)
  }
  return pool
}

function adjustExp(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((p) => (p.id === playerId ? { ...p, exp: p.exp + delta } : p))
}

function adjustInspiration(players: Player[], playerId: string, delta: number): Player[] {
  return players.map((p) => (p.id === playerId ? { ...p, inspiration: p.inspiration + delta } : p))
}

function removeReward(
  pendingRewards: EngineState['pendingRewards'],
  playerId: string,
  rewardId: string
): EngineState['pendingRewards'] {
  return {
    ...pendingRewards,
    [playerId]: (pendingRewards[playerId] ?? []).filter((r) => r.id !== rewardId),
  }
}
