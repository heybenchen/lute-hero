import {
  Player,
  Dice,
  Genre,
  Song,
  Monster,
  KillCredit,
  Rng,
  NewId,
  StyleId,
} from '../types/index.js'
import { EngineState, EngineCombatState, FeatureRequest, createInitialEngineState, createInitialCombatState, createInitialStudioState, normalizeEngineState } from './state.js'
import { GameAction, ActorSeat, PlayerConfig, DebugPatch, DebugDiceEdit } from './actions.js'
import { EngineEvent } from './events.js'
import { validateAction, roundEndChipsPerElement } from './validate.js'
import { d4CostFor, inspirationCostFor, pay, upgradeCostFor } from './economy.js'
import { createBoardGraph, addGenreTagToNeighbors, dealBalancedGenreTags, ensureStarterChips, addGenreTag, capGenreTags, scatterChipsRandomly } from '../game-logic/board/graphBuilder.js'
import { spawnMonstersFromTags, spawnInitialMonsters, clearSpace } from '../game-logic/combat/monsterSpawner.js'
import { calculateSingleTargetDamage, calculateDamage, rollSong } from '../game-logic/combat/damageCalculator.js'
import { PlayContext, StyleSpec, addRewards, conditionHolds, inspirationRules, specMultiplier } from '../game-logic/styles/specs.js'
import { specsOf, inspiredPlaySpec } from '../data/styleSpecs.js'
import {
  calculateFameEarned,
  calculateMonsterExp,
  calculateMonsterFameValue,
  calculateTotalMonsterExp,
  getNextPhase,
} from '../game-logic/fame/calculator.js'
import { createStarterSongs, ALL_DICE_TYPES } from '../data/startingData.js'
import { createElementalDie, inspirationSpend } from '../data/draftCards.js'
import { createElementBag, drawFromBag, elementOfferCount } from '../data/elementBag.js'
import {
  showdownTurns,
  ShowdownPerformance,
  createShowdownBoss,
  getDominantGenre,
  computeBossAdaptation,
  showdownElementSongs,
  mergeSongs,
} from '../game-logic/showdown/showdown.js'
import { DICE_UPGRADE_PATH } from '../data/startingData.js'
import { getTunables, withTunables, normalizeTunables } from '../data/tunables.js'
import { ALL_GENRES, playerColorFor } from '../data/genreTheme.js'
import { STYLES, drawStyleOffers, styleCost, styleOfferCount } from '../data/styles.js'
import { simulateRounds } from '../sim/bot.js'
import {
  StyleContext,
  rollSongWithStyles,
  holdsAllElements,
  elementCount,
  counterpointMultiplier,
  ONCE_PER_TURN,
  bravoFameFor,
} from '../game-logic/styles/styleEffects.js'

export { roundEndChipsPerElement } from './validate.js'

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
 *
 * Balance numbers come from `state.tunables` (the playtest debug panel edits
 * them). They are published to the module-level active set for the duration of
 * this call rather than threaded through every helper — `withTunables` restores
 * the previous set afterwards, and the reduce is synchronous, so nothing else
 * can observe the swap.
 */
export function applyAction(state: EngineState, action: GameAction, ctx: ActionCtx): ApplyResult {
  return withTunables(state.tunables, () => {
    const validation = validateAction(state, action, ctx.actor)
    if (validation.ok === false) return validation

    const idScope = ctx.idSeed ?? String(state.nextIdSeq)
    let idCounter = 0
    const newId: NewId = (prefix) => `${prefix}-${idScope}-${idCounter++}`

    const events: EngineEvent[] = []
    const next = reduce({ ...state, nextIdSeq: state.nextIdSeq + 1 }, action, ctx.rng, newId, events)
    return { ok: true, state: next, events }
  })
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
              // Trip-Hop's move to any space costs no regular move
              movesThisTurn: p.movesThisTurn + (action.anywhere ? 0 : 1),
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
      const mover = state.players.find((p) => p.id === action.playerId)!
      const moveTrail = [
        ...state.moveTrail,
        {
          playerId: action.playerId,
          fromSpaceId: mover.position,
          ...(action.anywhere ? { anywhere: true } : {}),
        },
      ]
      return { ...state, players, spaces, moveTrail, ...(action.anywhere ? { tripHopUsed: true } : {}) }
    }

    case 'UNDO_MOVE': {
      // Step back to where the last move started and refund it. The space
      // being left keeps its monsters; the one returned to never lost them.
      const step = state.moveTrail[state.moveTrail.length - 1]
      const players = state.players.map((p) =>
        p.id === step.playerId
          ? {
              ...p,
              position: step.fromSpaceId,
              movesThisTurn: step.anywhere ? p.movesThisTurn : Math.max(0, p.movesThisTurn - 1),
              inspiration: p.inspiration + (step.inspirationSpent ?? 0),
            }
          : p
      )
      return { ...state, players, moveTrail: state.moveTrail.slice(0, -1), ...(step.anywhere ? { tripHopUsed: false } : {}) }
    }

    case 'START_COMBAT': {
      const player = state.players.find((p) => p.id === action.playerId)!
      const space = state.spaces.find((s) => s.id === player.position)!
      // Pop (Muse's Favor): Inspiration before every concert
      const { ispiratoPerTurn: popGain, ispiratoMin: popFloor } = getTunables()
      const players = state.players.map((p) =>
        p.id !== player.id ? p : {
          ...p,
          fightsThisTurn: p.fightsThisTurn + 1,
          ...(p.styles.includes('ispirato') ? { inspiration: Math.max(p.inspiration + popGain, popFloor) } : {}),
        }
      )
      const combat: EngineCombatState = {
        ...createInitialCombatState(),
        isActive: true,
        playerId: player.id,
        spaceId: space.id,
        monsters: space.monsters,
      }
      // Fighting locks in this turn's movement: no taking moves back after
      return { ...state, players, combat, studio: createInitialStudioState(), moveTrail: [] }
    }

    case 'PLAY_SONG': {
      const fighter = state.players.find((p) => p.id === state.combat.playerId)!
      const song = fighter.songs.find((s) => s.id === action.songId)!
      const snapshot = {
        monsters: state.combat.monsters,
        songsUsed: state.combat.songsUsed,
        spentSongIds: state.combat.spentSongIds,
        killCredits: state.combat.killCredits,
        totalDamage: state.combat.totalDamage,
        stylesUsed: state.combat.stylesUsed,
        rallyReady: state.combat.rallyReady,
        specFired: state.combat.specFired,
        playLog: state.combat.playLog,
        specRewards: state.combat.specRewards,
        lastPlayResult: state.combat.lastPlayResult,
      }
      // Soul: paying once switches its bonus on for every song this concert.
      // Gospel's call rides on the play, and an encore replays it.
      const activateSoul = !!action.inspiredPlay && !state.combat.soulActive
      const soulActive = !!state.combat.soulActive || activateSoul
      const flags = { staccatoCall: !!action.staccatoCall }
      const players = activateSoul
        ? adjustInspiration(state.players, fighter.id, -getTunables().inspiredPlayCost)
        : state.players
      const extra = soulActive ? [inspiredPlaySpec()] : []
      const combat = performCombatPlay({ ...state.combat, soulActive }, snapshot, song, action.targetMonsterId, fighter, rng, events, state.players, extra, flags)
      return { ...state, players, combat: { ...combat, undoSnapshot: snapshot, lastPlayedSongId: song.id, lastPlayFlags: flags } }
    }

    case 'REROLL_SONG': {
      const fighterId = state.combat.playerId!
      const fighter = state.players.find((p) => p.id === fighterId)!
      const song = fighter.songs.find((s) => s.id === state.combat.lastPlayedSongId)!
      // Rubato's reroll is free; a style-lab spec may grant free Inspiration
      // rerolls each turn; otherwise it costs Inspiration
      const insp = inspirationRules(specsOf(fighter))
      const freeReroll = !action.rubato && state.combat.freeRerollsUsed < insp.freePerTurn
      const players = action.rubato || freeReroll
        ? state.players
        : state.players.map((p) =>
            p.id === fighterId ? { ...p, inspiration: p.inspiration - inspirationSpend() } : p
          )
      // Replay from the pre-play snapshot — a true reroll against the same
      // target. The snapshot stays put so the song can be rerolled again.
      const snapshot = state.combat.undoSnapshot!
      const targetId = state.combat.lastTargetMonsterId!
      const updatedFighter = players.find((p) => p.id === fighterId)!
      const rerollBonus: StyleSpec[] = !action.rubato && insp.bonus
        ? [{ id: '_reroll-bonus', name: '', rule: '', theme: '', cost: 0, roll: [{ flat: insp.bonus }] }]
        : []
      const flags = state.combat.lastPlayFlags ?? {}
      const replayed = state.combat.soulActive ? [...rerollBonus, inspiredPlaySpec()] : rerollBonus
      let combat = performCombatPlay(state.combat, snapshot, song, targetId, updatedFighter, rng, events, state.players, replayed, flags)
      // Keep-the-better rerolls (Nimble Fingers always, plus any style-lab spec that grants
      // it): if the new roll charms the target less, the old result stands
      let keptFirst = false
      if (action.rubato || insp.keepBetter) {
        const charmOn = (c: EngineCombatState) => {
          const before = snapshot.monsters.find((m) => m.id === targetId)?.currentHP ?? 0
          const after = c.monsters.find((m) => m.id === targetId)?.currentHP ?? 0
          return before - after
        }
        if (charmOn(combat) < charmOn(state.combat)) {
          combat = { ...state.combat }
          keptFirst = true
        }
      }
      combat = { ...combat, freeRerollsUsed: state.combat.freeRerollsUsed + (freeReroll ? 1 : 0) }
      // The snapshot predates Rubato, so carry its use across the replay
      // The snapshot predates this turn's Nimble Fingers uses: carry them across, plus this one
      const countRubato = (ids: StyleId[]) => ids.filter((id) => id === 'rubato').length
      const rubatoWanted = countRubato(state.combat.stylesUsed) + (action.rubato ? 1 : 0)
      const stylesUsed = [
        ...combat.stylesUsed,
        ...Array<StyleId>(Math.max(0, rubatoWanted - countRubato(combat.stylesUsed))).fill('rubato'),
      ]
      const styleNotes = action.rubato
        ? [keptFirst ? `${STYLES.rubato.name}: kept your higher first roll` : STYLES.rubato.name, ...combat.styleNotes]
        : combat.styleNotes
      return { ...state, players, combat: { ...combat, stylesUsed, styleNotes } }
    }

    case 'RALLY_SONG': {
      // Rallying Cry: refresh the chosen spent song. Also clear it from the
      // reroll snapshot, so rerolling an earlier play can't re-spend it.
      const unspend = (ids: string[]) => ids.filter((id) => id !== action.songId)
      // Gospel's call already spent the once-per-turn use
      const stylesUsed = state.combat.stylesUsed.includes('staccato')
        ? state.combat.stylesUsed
        : [...state.combat.stylesUsed, 'staccato' as const]
      const snapshot = state.combat.undoSnapshot
      return {
        ...state,
        combat: {
          ...state.combat,
          spentSongIds: unspend(state.combat.spentSongIds),
          stylesUsed,
          rallyReady: false,
          styleNotes: [STYLES.staccato.name],
          undoSnapshot: snapshot
            ? { ...snapshot, spentSongIds: unspend(snapshot.spentSongIds), stylesUsed, rallyReady: false }
            : snapshot,
        },
      }
    }

    case 'LINGER_SONG': {
      // Blues (Lingering Note): pay Inspiration to refresh a spent d20 song, once per turn.
      // Also clear it from the reroll snapshot, so an encore of an earlier play can't re-spend it.
      const fighterId = state.combat.playerId!
      const unspend = (ids: string[]) => ids.filter((id) => id !== action.songId)
      const stylesUsed = [...state.combat.stylesUsed, 'fermata' as const]
      const snapshot = state.combat.undoSnapshot
      return {
        ...state,
        players: adjustInspiration(state.players, fighterId, -getTunables().fermataInspirationCost),
        combat: {
          ...state.combat,
          spentSongIds: unspend(state.combat.spentSongIds),
          stylesUsed,
          styleNotes: [STYLES.fermata.name],
          undoSnapshot: snapshot ? { ...snapshot, spentSongIds: unspend(snapshot.spentSongIds), stylesUsed } : snapshot,
        },
      }
    }

    case 'PLAY_FEATURED_SONG':
      return playFeaturedSong(state, action, rng, events)

    case 'REQUEST_FEATURE': {
      const { guestPlayerId, songId, targetMonsterId } = action
      return { ...state, combat: { ...state.combat, featureRequest: { guestPlayerId, songId, targetMonsterId } } }
    }

    case 'ANSWER_FEATURE': {
      const request = state.combat.featureRequest!
      const cleared = { ...state, combat: { ...state.combat, featureRequest: null } }
      return action.accept ? playFeaturedSong(cleared, request, rng, events) : cleared
    }

    case 'SELECT_COMBAT_SPREAD':
      return { ...state, combat: { ...state.combat, selectedSpreadGenre: action.genre } }

    case 'END_COMBAT':
      return endCombat(
        state,
        action.spreadGenre ?? state.combat.selectedSpreadGenre,
        events
      )

    case 'END_TURN':
      return endTurn(state, rng, newId)

    case 'OPEN_STUDIO':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, hasShoppedThisTurn: true } : p
        ),
        studio: { ...createInitialStudioState(), playerId: action.playerId },
      }

    case 'CLOSE_STUDIO':
      return { ...state, studio: createInitialStudioState() }

    case 'SELECT_STUDIO_OFFER':
      return {
        ...state,
        studio: { ...state.studio, selectedOfferIdx: action.offerIndex },
      }

    case 'SELECT_STUDIO_REWARD':
      return {
        ...state,
        studio: { ...state.studio, activeRewardId: action.rewardId },
      }

    case 'BUY_DIE': {
      const player = state.players[state.currentTurnPlayerIndex]
      const genre = state.elementOffers[action.offerIndex]
      const destination = action.destination
      const paidPlayers = payFor(state.players, player.id, d4CostFor(player))
      const purchase = {
        ...state,
        players: paidPlayers,
        elementOffers: state.elementOffers.filter((_, i) => i !== action.offerIndex),
        elementDiscard: [...state.elementDiscard, genre],
        studio: { ...state.studio, selectedOfferIdx: null },
      }
      if (destination) {
        const dice = createElementalDie(genre, newId)
        return {
          ...purchase,
          players: paidPlayers.map((p) => p.id !== player.id ? p : {
            ...p,
            songs: p.songs.map((song) => song.id === destination.songId
              ? { ...song, slots: [{ dice }] } : song),
          }),
        }
      }
      const reward = { kind: 'die' as const, id: newId('reward'), dice: createElementalDie(genre, newId) }
      return {
        ...purchase,
        pendingRewards: {
          ...state.pendingRewards,
          [player.id]: [...(state.pendingRewards[player.id] ?? []), reward],
        },
        studio: {
          ...state.studio,
          selectedOfferIdx: null,
          activeRewardId: reward.id,
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
      const cost = upgradeCostFor(player, die)!
      const players = payFor(state.players, player.id, cost).map((p) => {
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
        studio: { ...state.studio, selectedOfferIdx: null },
      }
    }

    case 'REFRESH_ELEMENT_OFFERS': {
      const player = state.players[state.currentTurnPlayerIndex]
      const discard = [...state.elementDiscard, ...state.elementOffers]
      const { drawn, bag, discard: remaining } = drawFromBag(state.elementBag, discard, elementOfferCount(), rng)
      return {
        ...state,
        players: adjustInspiration(state.players, player.id, -inspirationSpend()),
        elementBag: bag,
        elementDiscard: remaining,
        elementOffers: drawn,
        styleOffers: drawStyleOffers(styleOfferCount(), [...player.styles, ...state.styleOffers], rng),
        studio: { ...state.studio, selectedOfferIdx: null },
      }
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
      return {
        ...state,
        players,
        pendingRewards: removeReward(state.pendingRewards, player.id, reward.id),
        studio: { ...state.studio, activeRewardId: null },
      }
    }

    case 'BUY_INSPIRATION': {
      const player = state.players[state.currentTurnPlayerIndex]
      const cost = inspirationCostFor(player)
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

    case 'BUY_STYLE':
      return buyStyle(state, action.offerIndex, action.replaceStyleId, newId, action.giveUpSongId)

    case 'REFRESH_STYLE_OFFERS': {
      const player = state.players[state.currentTurnPlayerIndex]
      return {
        ...state,
        players: adjustInspiration(state.players, player.id, -inspirationSpend()),
        styleOffers: drawStyleOffers(styleOfferCount(), [...player.styles, ...state.styleOffers], rng),
      }
    }

    case 'PLAY_SHOWDOWN_SONG':
      return playShowdownSong(state, action.songId, rng, events)

    case 'REROLL_SHOWDOWN_SONG':
      return rerollShowdownSong(state, !!action.rubato, rng, events)

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

    case 'DEBUG_PATCH':
      // Patches can teleport bards; a stale trail would undo to the wrong space
      return { ...applyDebugPatch(state, action.patch, rng, newId), moveTrail: [] }

    case 'DEBUG_LOAD_STATE':
      return loadDebugState(state, action.engineState)

    case 'DEBUG_SIMULATE':
      return simulateToRound(state, action.round, action.showdown, rng)
  }
}

// ============================================================
// Playtest debug mode
// ============================================================

/**
 * Apply a playtest patch. Only the fields present are touched, every number is
 * clamped to something the engine can keep running with, and unknown ids are
 * ignored rather than throwing — the panel is a blunt instrument by design.
 */
function applyDebugPatch(state: EngineState, patch: DebugPatch, rng: Rng, newId: NewId): EngineState {
  let next: EngineState = state

  if (patch.tunables) {
    next = { ...next, tunables: normalizeTunables({ ...next.tunables, ...patch.tunables }) }
  }

  if (patch.players) {
    const edits = patch.players
    next = {
      ...next,
      players: next.players.map((p) => {
        const edit = edits[p.id]
        if (!edit) return p
        return {
          ...p,
          fame: clampInt(edit.fame, p.fame, 0),
          exp: clampInt(edit.exp, p.exp, 0),
          inspiration: clampInt(edit.inspiration, p.inspiration, 0),
          position: clampPosition(edit.position, p.position, next.spaces),
          movesThisTurn: clampInt(edit.movesThisTurn, p.movesThisTurn, 0),
          fightsThisTurn: clampInt(edit.fightsThisTurn, p.fightsThisTurn, 0),
          monstersDefeated: clampInt(edit.monstersDefeated, p.monstersDefeated, 0),
        }
      }),
    }
  }

  if (patch.players) {
    for (const [playerId, edit] of Object.entries(patch.players)) {
      if (!edit.styles) continue
      const known = [...new Set(edit.styles.filter((id) => id in STYLES))]
      next = setPlayerStyles(next, playerId, known, newId)
    }
  }

  if (patch.dice) {
    next = { ...next, players: applyDiceEdits(next.players, patch.dice, newId) }
  }

  if (patch.flow) {
    const { phase, currentRound, currentTurnPlayerIndex, pendingPhase, finalTurnGranted } = patch.flow
    next = {
      ...next,
      phase: phase ?? next.phase,
      currentRound: clampInt(currentRound, next.currentRound, 1),
      currentTurnPlayerIndex:
        currentTurnPlayerIndex === undefined
          ? next.currentTurnPlayerIndex
          : Math.min(Math.max(Math.floor(currentTurnPlayerIndex), 0), Math.max(next.players.length - 1, 0)),
      pendingPhase: pendingPhase === undefined ? next.pendingPhase : pendingPhase,
      finalTurnGranted: finalTurnGranted ?? next.finalTurnGranted,
    }
  }

  if (patch.spaceTags) {
    const tagEdits = patch.spaceTags
    next = {
      ...next,
      spaces: next.spaces.map((s) => {
        const tags = tagEdits[s.id]
        if (!tags) return s
        return { ...s, genreTags: capGenreTags(tags) }
      }),
    }
  }

  if (patch.combatMonsterHp && next.combat.isActive) {
    const hpEdits = patch.combatMonsterHp
    next = {
      ...next,
      combat: {
        ...next.combat,
        monsters: next.combat.monsters.map((m) => {
          const hp = hpEdits[m.id]
          if (hp === undefined) return m
          return { ...m, currentHP: Math.min(Math.max(Math.floor(hp), 0), m.maxHP) }
        }),
      },
    }
  }

  // Re-derive rosters last, so it reflects any chip edits in this same patch.
  if (patch.respawnMonsters) {
    next = {
      ...next,
      spaces: next.spaces.map((s) => ({
        ...s,
        monsters: spawnMonstersFromTags(s.genreTags, s.id, next.currentRound || 1, rng, newId),
      })),
    }
  }

  return next
}

/**
 * Replace the whole engine state (restoring a saved playtest preset). Ids keep
 * advancing from whichever counter is further along, so freshly spawned
 * monsters can never collide with ids already present in the restored board.
 */
function loadDebugState(state: EngineState, incoming: EngineState): EngineState {
  const restored = normalizeEngineState(incoming)
  return { ...restored, nextIdSeq: Math.max(restored.nextIdSeq ?? 1, state.nextIdSeq) }
}

/**
 * Apply dice-slot edits from the playtest panel. An edit either sets the slot's
 * die (retyping / re-elementing it) or clears the slot with `dice: null`.
 * Editing an existing die keeps its id, so a song already rolled this combat
 * stays matched up with its rolls; a brand-new die gets a fresh id.
 * Unknown players, songs, slots and die types are skipped rather than throwing.
 */
function applyDiceEdits(players: Player[], edits: DebugDiceEdit[], newId: NewId): Player[] {
  const valid = edits.filter(
    (edit) => edit.dice === null || (ALL_DICE_TYPES.includes(edit.dice.type) && ALL_GENRES.includes(edit.dice.genre))
  )
  if (valid.length === 0) return players

  return players.map((player) => {
    const playerEdits = valid.filter((edit) => edit.playerId === player.id)
    if (playerEdits.length === 0) return player

    return {
      ...player,
      songs: player.songs.map((song) => {
        const songEdits = playerEdits.filter((edit) => edit.songId === song.id)
        if (songEdits.length === 0) return song

        const slots = [...song.slots] as Song['slots']
        for (const edit of songEdits) {
          if (edit.slotIndex < 0 || edit.slotIndex >= slots.length) continue
          const existing = slots[edit.slotIndex].dice
          slots[edit.slotIndex] = {
            ...slots[edit.slotIndex],
            dice: edit.dice
              ? { id: existing?.id ?? newId('die'), type: edit.dice.type, genre: edit.dice.genre }
              : null,
          }
        }
        return { ...song, slots }
      }),
    }
  })
}

function clampInt(value: number | undefined, fallback: number, min: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback
  return Math.max(Math.floor(value), min)
}

function clampPosition(value: number | undefined, fallback: number, spaces: EngineState['spaces']): number {
  if (value === undefined || !spaces.some((s) => s.id === value)) return fallback
  return value
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
      color: playerColorFor(config.starterGenre),
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
      inspiration: getTunables().startingInspiration,
      inspirationBoughtThisTurn: 0,
      styles: [],
    }
  })

  // 3. Deal the opening monster chips from an exactly balanced pool: the same
  //    number per element, shuffled, so every element shows up equally often
  //    but its placement is random. (This replaces the old starter-element
  //    seeding onto each bard's neighbours, which skewed the element counts.)
  const startingTags = getTunables().startingTagsPerSpace
  // Then swap chips so every bard's starting space holds a monster of their
  // own element (element totals stay balanced).
  const balanced = dealBalancedGenreTags(spaces.length, startingTags, rng)
  const dealt = ensureStarterChips(
    balanced,
    players.map((p) => ({ spaceId: spaces.findIndex((s) => s.id === p.position), genre: p.starterGenre })),
    rng
  )
  spaces = spaces.map((s, i) => ({ ...s, genreTags: dealt[i] }))

  // 4. Initial monsters — one per unique genre chip, matching the board
  spaces = spaces.map((space) => {
    if (space.genreTags.length === 0) return space
    return { ...space, monsters: spawnInitialMonsters(space.genreTags, space.id, 1, rng, newId) }
  })

  // 5. Shop
  const fullBag = createElementBag(configs.length, rng)
  const { drawn, bag, discard } = drawFromBag(fullBag, [], elementOfferCount(), rng)

  return {
    ...state,
    phase: 'main',
    currentRound: 1,
    currentTurnPlayerIndex: 0,
    pendingPhase: null,
    finalTurnGranted: false,
    spaces,
    players,
    elementBag: bag,
    elementDiscard: discard,
    elementOffers: drawn,
    pendingRewards: {},
    styleOffers: drawStyleOffers(styleOfferCount(), [], rng),
    combat: createInitialCombatState(),
    studio: createInitialStudioState(),
  }
}

// ============================================================
// Styles
// ============================================================

/** The 7th song Coda adds. Its id is fixed so it can be found again. */
const codaSongId = (playerId: string) => `${playerId}-coda`

/**
 * Buy an offered style. At the cap, the named style is given up (no refund).
 * Gaining Coda (New Age) adds a 7th empty song. Replacing it with that song in
 * use means giving up a song the bard names: its die is lost, and the 7th
 * song's die moves into its place so the six songs keep their ids.
 */
function buyStyle(state: EngineState, offerIndex: number, replaceStyleId: StyleId | undefined, newId: NewId, giveUpSongId?: string): EngineState {
  let player = state.players[state.currentTurnPlayerIndex]
  const styleId = state.styleOffers[offerIndex]
  const styles = replaceStyleId ? player.styles.map((id) => id === replaceStyleId ? styleId : id) : [...player.styles, styleId]
  let players = state.players
  const codaSong = player.songs.find((sg) => sg.id === codaSongId(player.id))
  if (replaceStyleId === 'coda' && codaSong?.slots[0]?.dice && giveUpSongId) {
    const kept = codaSong.slots[0].dice
    // Empty the 7th song, so losing New Age below leaves no reward behind
    const songs = player.songs.map((sg) =>
      sg.id === codaSong.id ? { ...sg, slots: [{ dice: null }] as Song['slots'] }
        : sg.id === giveUpSongId ? { ...sg, slots: [{ dice: kept }] as Song['slots'] }
        : sg)
    player = { ...player, songs }
    players = players.map((p) => (p.id === player.id ? player : p))
  }
  const paid = { ...state, players: payFor(players, player.id, styleCost(styleId)) }
  return {
    ...setPlayerStyles(paid, player.id, styles, newId),
    styleOffers: state.styleOffers.filter((_, i) => i !== offerIndex),
  }
}

/**
 * Give a bard exactly these styles. Gaining Coda adds a 7th empty song; losing
 * it removes that song and queues any die in it as an unclaimed reward, so
 * nothing is lost.
 */
function setPlayerStyles(state: EngineState, playerId: string, styles: StyleId[], newId: NewId): EngineState {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state
  let pendingRewards = state.pendingRewards
  let songs = player.songs
  const codaSong = songs.find((sg) => sg.id === codaSongId(playerId))
  if (styles.includes('coda') && !codaSong) {
    songs = [...songs, { id: codaSongId(playerId), slots: [{ dice: null }], used: false }]
  } else if (!styles.includes('coda') && codaSong) {
    const die = codaSong.slots[0]?.dice
    if (die) {
      pendingRewards = {
        ...pendingRewards,
        [playerId]: [...(pendingRewards[playerId] ?? []), { kind: 'die', id: newId('reward'), dice: die }],
      }
    }
    songs = songs.filter((sg) => sg.id !== codaSong.id)
  }
  return {
    ...state,
    pendingRewards,
    players: state.players.map((p) => (p.id === playerId ? { ...p, styles, songs } : p)),
  }
}

/**
 * A bard's turn begins: preserve the shared style shelf and fill only empty
 * slots, while Ispirato tops their Inspiration up to 1.
 */
// Muse's Favor and turn-start style rewards live here; keep songStyles.md in sync with any change.
function beginTurn(state: EngineState, rng: Rng): EngineState {
  const player = state.players[state.currentTurnPlayerIndex]
  if (!player) return state
  const withSpecs = applyTurnStartSpecs(state.players, player.id)
  const missingOffers = Math.max(0, styleOfferCount() - state.styleOffers.length)
  const styleOffers = missingOffers > 0
    ? [
        ...state.styleOffers,
        ...drawStyleOffers(missingOffers, [...player.styles, ...state.styleOffers], rng),
      ]
    : state.styleOffers
  // Soul checks the Inspiration a bard started their turn with
  const turnStartInspiration = withSpecs.find((p) => p.id === player.id)?.inspiration ?? 0
  return { ...state, players: withSpecs, styleOffers, turnStartInspiration, tripHopUsed: false }
}

/** Data-defined styles' start-of-turn rewards (conditions like trailing in Fame). */
function applyTurnStartSpecs(players: Player[], playerId: string): Player[] {
  const player = players.find((p) => p.id === playerId)
  const specs = specsOf(player)
  if (!player || !specs.length) return players
  const fames = players.map((p) => p.fame)
  const ctx: PlayContext = {
    showdown: false, playIndex: 0, lastElement: null, comboCount: 0, elementsPlayed: [], target: null,
    sharingSpace: players.some((p) => p.id !== playerId && p.position === player.position),
    trailingFame: player.fame <= Math.min(...fames),
    leadingFame: player.fame >= Math.max(...fames),
    inspiration: player.inspiration, starter: player.starterGenre, monstersInFight: 0, used: [],
  }
  const probe: Dice = { id: 'turn', type: 'd4', genre: player.starterGenre }
  let earned = {}
  for (const spec of specs) {
    for (const effect of spec.onTurnStart ?? []) {
      if (conditionHolds(effect.when, probe, ctx, spec.id)) earned = addRewards(earned, effect.reward)
    }
  }
  const r = earned as { fame?: number; exp?: number; inspiration?: number }
  return players.map((p) => p.id === playerId ? {
    ...p,
    fame: p.fame + (r.fame ?? 0),
    exp: p.exp + (r.exp ?? 0),
    inspiration: p.inspiration + (r.inspiration ?? 0),
  } : p)
}

// ============================================================
// Combat helpers
// ============================================================

/** Combat as it was before a play, so the play can be rerolled. */
type CombatSnapshot = NonNullable<EngineCombatState['undoSnapshot']>

/**
 * Perform a song against ONE chosen monster, starting from a snapshot. Songs are
 * single-target now, not AOE. Defeating the target returns the song's dice (the
 * song stays playable); damaging without defeating spends it for the combat.
 */
function performCombatPlay(
  combat: EngineCombatState,
  base: CombatSnapshot,
  song: Song,
  targetMonsterId: string,
  fighter: Player,
  rng: Rng,
  events: EngineEvent[],
  players: Player[] = [],
  extraSpecs: StyleSpec[] = [],
  flags: { staccatoCall?: boolean } = {}
): EngineCombatState {
  const monstersBefore = base.monsters
  const targetBefore = monstersBefore.find((m) => m.id === targetMonsterId)
  // Data-defined styles (style lab) and the play they apply to
  const specs = [...specsOf(fighter), ...extraSpecs]
  const die = song.slots.find((s) => s.dice)?.dice ?? null
  const play = specs.length ? combatPlayContext(fighter, players, combat, base, targetBefore ?? null, die?.genre ?? null) : undefined

  // The performing bard's styles shape every song they play.
  const styleCtx: StyleContext = {
    styles: fighter.styles,
    used: base.stylesUsed,
    firstRoll: base.songsUsed.length === 0, // one fight a turn: its first play is the turn's first roll
    allElements: holdsAllElements(fighter.songs),
    elementCount: elementCount(fighter.songs),
    inspiration: fighter.inspiration,
    ...(play ? { specs, play } : {}),
  }
  const { rolls, triggered, specFired, specApplied } = rollSongWithStyles(song, styleCtx, rng)
  const immuneMultiplier = counterpointMultiplier(styleCtx)
  const { damageCalculations, updatedMonsters } = calculateSingleTargetDamage(
    song,
    rolls,
    monstersBefore,
    targetMonsterId,
    {
      immuneMultiplier,
      ...(play ? { multiplierFor: (d: Dice, m: Monster, b: number) => specMultiplier(specs, d, m, play, b) } : {}),
    }
  )
  if (damageCalculations.some((c) => c.softenedImmunity)) triggered.push('counterpoint')

  const targetAfter = updatedMonsters.find((m) => m.id === targetMonsterId)
  const defeatedTarget = !!targetBefore && targetBefore.currentHP > 0 && !!targetAfter && targetAfter.currentHP <= 0

  const newKillCredits: KillCredit[] = defeatedTarget
    ? [{ monsterId: targetMonsterId }]
    : []

  const totalDamageDealt = damageCalculations.reduce((sum, calc) => sum + calc.totalDamage, 0)

  // Defeat → dice return (song stays playable); no kill → dice are spent,
  // unless Fermata holds a big die's song for one more play.
  // Data-defined styles: tame/miss rewards, and misses that keep the song
  let specRewards = base.specRewards ?? {}
  const firedNow = [...specFired]
  let keptBySpec = false
  if (play && die) {
    const firedCtx = { ...play, used: [...play.used, ...firedNow] }
    for (const spec of specs) {
      const effects = defeatedTarget ? spec.onTame ?? [] : spec.onMiss ?? []
      for (const effect of effects) {
        if (!conditionHolds(effect.when, die, firedCtx, spec.id)) continue
        // K-Pop: only a song that moved its monster earns its miss reward
        if (!defeatedTarget && 'ifCharmed' in effect && effect.ifCharmed && totalDamageDealt <= 0) continue
        if (effect.when?.oncePerTurn) firedNow.push(spec.id)
        specRewards = addRewards(specRewards, effect.reward)
        if (!defeatedTarget && 'keepSong' in effect && effect.keepSong) keptBySpec = true
      }
    }
  }

  let spentSongIds: string[]
  if (defeatedTarget || keptBySpec) {
    spentSongIds = base.spentSongIds.filter((id) => id !== song.id)
  } else {
    spentSongIds = base.spentSongIds.includes(song.id) ? base.spentSongIds : [...base.spentSongIds, song.id]
  }

  const onceUsed = triggered.filter((id) => ONCE_PER_TURN.includes(id) && !base.stylesUsed.includes(id))
  // Gospel (Rallying Cry): a call spends the once-per-turn use; if the called monster
  // is won over, the bard may refresh a spent song of their choice (RALLY_SONG)
  const called = !!flags.staccatoCall && !base.stylesUsed.includes('staccato')
  if (called) onceUsed.push('staccato')
  const rallyReady = base.rallyReady || (called && defeatedTarget)

  events.push({ type: 'diceRolled', playerId: fighter.id, songId: song.id, context: 'combat', rolls })
  events.push({
    type: 'damageDealt',
    calculations: damageCalculations,
    monstersBefore,
    monstersAfter: updatedMonsters,
  })

  return {
    ...combat,
    monsters: updatedMonsters,
    songsUsed: [...base.songsUsed, { songId: song.id }],
    spentSongIds,
    killCredits: [...base.killCredits, ...newKillCredits],
    currentSongId: song.id,
    lastTargetMonsterId: targetMonsterId,
    lockedTargetMonsterId: defeatedTarget
      ? null
      : totalDamageDealt > 0 ? targetMonsterId : combat.lockedTargetMonsterId,
    rolls,
    totalDamage: base.totalDamage + totalDamageDealt,
    lastDamageCalculations: damageCalculations,
    stylesUsed: [...base.stylesUsed, ...onceUsed],
    styleNotes: [
      ...[...new Set(triggered)].map((id) => STYLES[id].name),
      // Studio styles built from specs (lab-only specs have no Studio card)
      ...specApplied.flatMap((id) => (id in STYLES ? [STYLES[id as StyleId].name] : [])),
    ],
    rallyReady,
    lastPlayResult: defeatedTarget ? 'won' : totalDamageDealt > 0 ? 'moved' : 'missed',
    specFired: [...new Set([...(base.specFired ?? []), ...firedNow])],
    playLog: die ? [...(base.playLog ?? []), die.genre] : base.playLog ?? [],
    specRewards,
  }
}

/** What data-defined style conditions see for one combat play. */
function combatPlayContext(
  fighter: Player,
  players: Player[],
  combat: EngineCombatState,
  base: CombatSnapshot,
  target: Monster | null,
  genre: Genre | null
): PlayContext {
  const log = base.playLog ?? []
  let combo = 0
  for (let i = log.length - 1; i >= 0 && log[i] === genre; i--) combo++
  const fames = players.map((p) => p.fame)
  return {
    showdown: false,
    playIndex: base.songsUsed.length,
    lastElement: log[log.length - 1] ?? null,
    comboCount: combo,
    elementsPlayed: [...new Set(log)],
    target,
    sharingSpace: players.some((p) => p.id !== fighter.id && p.position === combat.spaceId),
    trailingFame: fames.length > 0 && fighter.fame <= Math.min(...fames),
    leadingFame: fames.length > 0 && fighter.fame >= Math.max(...fames),
    inspiration: fighter.inspiration,
    starter: fighter.starterGenre,
    monstersInFight: base.monsters.filter((m) => m.currentHP > 0).length,
    // Every monster the concert started with stays in the list (won-over ones at 0 Resolve)
    monstersAtStart: base.monsters.length,
    spentSongs: base.spentSongIds.length,
    lastPlayResult: base.lastPlayResult ?? null,
    // Unspent songs left, counting the one being played (Emo)
    songsLeft: fighter.songs.filter((sg) => sg.slots.some((sl) => sl.dice) && !base.spentSongIds.includes(sg.id)).length,
    used: base.specFired ?? [],
  }
}

/**
 * A featured song: one song borrowed from another bard sharing the space.
 * It rolls plain (neither bard's styles apply), each guest is featured at
 * most once a fight, and it costs the fighter nothing — no song is spent, and
 * a miss simply leaves its damage on the monster. A tame is credited to the
 * guest too, who splits that monster's Fame and EXP (computeCombatRewards).
 * A featured play can't be rerolled.
 */
function playFeaturedSong(state: EngineState, feature: FeatureRequest, rng: Rng, events: EngineEvent[]): EngineState {
  const combat = state.combat
  const guest = state.players.find((p) => p.id === feature.guestPlayerId)!
  const song = guest.songs.find((s) => s.id === feature.songId)!
  const monstersBefore = combat.monsters
  const targetBefore = monstersBefore.find((m) => m.id === feature.targetMonsterId)

  const rolls = rollSong(song, rng)
  const { damageCalculations, updatedMonsters } = calculateSingleTargetDamage(
    song,
    rolls,
    monstersBefore,
    feature.targetMonsterId
  )
  const targetAfter = updatedMonsters.find((m) => m.id === feature.targetMonsterId)
  const defeatedTarget = !!targetBefore && targetBefore.currentHP > 0 && !!targetAfter && targetAfter.currentHP <= 0
  const damage = damageCalculations.reduce((sum, calc) => sum + calc.totalDamage, 0)

  events.push({ type: 'diceRolled', playerId: guest.id, songId: song.id, context: 'combat', rolls })
  events.push({ type: 'damageDealt', calculations: damageCalculations, monstersBefore, monstersAfter: updatedMonsters })

  return {
    ...state,
    combat: {
      ...combat,
      monsters: updatedMonsters,
      killCredits: defeatedTarget
        ? [...combat.killCredits, { monsterId: feature.targetMonsterId, featuredPlayerId: guest.id }]
        : combat.killCredits,
      featuredPlayerIds: [...combat.featuredPlayerIds, guest.id],
      // A guest song counts as the previous song for "after a miss" genres
      lastPlayResult: defeatedTarget ? 'won' : damage > 0 ? 'moved' : 'missed',
      currentSongId: song.id,
      lastTargetMonsterId: feature.targetMonsterId,
      lockedTargetMonsterId: defeatedTarget
        ? null
        : damage > 0 ? feature.targetMonsterId : combat.lockedTargetMonsterId,
      rolls,
      totalDamage: combat.totalDamage + damage,
      lastDamageCalculations: damageCalculations,
      styleNotes: [],
      undoSnapshot: null,
      lastPlayedSongId: null,
    },
  }
}

/** Fame and EXP a featured bard earns from the current combat. */
export interface GuestReward {
  fame: number
  exp: number
}

/**
 * Rewards from the current combat. `fighterFame` / `totalExp` are the active
 * bard's; a monster tamed by a featured song splits its Fame and EXP with that
 * guest (`guestRewards`), the fighter keeping the larger half of an odd split.
 */
// Crowd Favorite's Fame is paid here; keep songStyles.md in sync with any change.
export function computeCombatRewards(combat: {
  monsters: Monster[]
  killCredits: KillCredit[]
}, fighterStyles: StyleId[] = []): {
  totalFameEarned: number
  fighterFame: number
  totalExp: number
  monstersDefeatedCount: number
  bravoFame: number
  guestRewards: Record<string, GuestReward>
} {
  const defeated = combat.monsters.filter((m) => m.currentHP <= 0)
  const monstersDefeatedCount = defeated.length
  // EXP is paid only for monsters the bard actually hurt: every one on a
  // victory, but on a retreat the untouched ones pay nothing.
  const wounded = combat.monsters.filter((m) => m.currentHP < m.maxHP)
  const totalExp = calculateTotalMonsterExp(wounded)
  const totalFameEarned = calculateFameEarned(defeated.map((m) => m.level))
  const creditedLevels = combat.killCredits.flatMap((credit) => {
    const monster = combat.monsters.find((m) => m.id === credit.monsterId)
    return monster ? [monster.level] : []
  })
  const creditedFame = calculateFameEarned(creditedLevels)

  const guestRewards: Record<string, GuestReward> = {}
  for (const credit of combat.killCredits) {
    if (!credit.featuredPlayerId) continue
    const monster = combat.monsters.find((m) => m.id === credit.monsterId)
    if (!monster) continue
    const share = guestRewards[credit.featuredPlayerId] ?? { fame: 0, exp: 0 }
    share.fame += Math.floor(calculateMonsterFameValue(monster.level) / 2)
    share.exp += Math.floor(calculateMonsterExp(monster.level) / 2)
    guestRewards[credit.featuredPlayerId] = share
  }
  const guestFame = Object.values(guestRewards).reduce((sum, r) => sum + r.fame, 0)
  const guestExp = Object.values(guestRewards).reduce((sum, r) => sum + r.exp, 0)

  // Bravo: the crowd cheers every monster the fighter's performance tamed
  const bravoFame = defeated.reduce((sum, m) => sum + (fighterStyles.includes('bravo') ? bravoFameFor(m.level) : 0), 0)
  const fighterFame = creditedFame - guestFame + bravoFame

  return {
    totalFameEarned: totalFameEarned + bravoFame,
    fighterFame,
    totalExp: totalExp - guestExp,
    monstersDefeatedCount,
    bravoFame,
    guestRewards,
  }
}

function endCombat(state: EngineState, spreadGenre: Genre | null, events: EngineEvent[]): EngineState {
  const combat = state.combat
  const fighterId = combat.playerId!
  const spaceId = combat.spaceId!
  const success = combat.monsters.every((m) => m.currentHP <= 0)
  const fighterStyles = state.players.find((p) => p.id === fighterId)?.styles ?? []
  const rewards = computeCombatRewards(combat, fighterStyles)

  // EXP for every wounded monster; fame per kill credit
  let players = adjustExp(state.players, fighterId, rewards.totalExp)
  // Featured bards take their half of the monsters their songs tamed
  players = players.map((p) => {
    const share = rewards.guestRewards[p.id]
    return share ? { ...p, fame: p.fame + share.fame, exp: p.exp + share.exp } : p
  })
  // Clearing every monster on a space earns the victor 1 Inspiration.
  if (success) {
    players = players.map((p) => (p.id === fighterId ? { ...p, inspiration: p.inspiration + 1 } : p))
  }
  // K-Pop: Fame for winning over 3, or 4+, monsters in one concert (guest songs' wins don't count)
  if (fighterStyles.includes('k-pop')) {
    const wins = combat.killCredits.filter((k) => !k.featuredPlayerId).length
    const { kPopFame3, kPopFame4 } = getTunables()
    const bonus = wins >= 4 ? kPopFame4 : wins === 3 ? kPopFame3 : 0
    if (bonus) players = players.map((p) => (p.id === fighterId ? { ...p, fame: p.fame + bonus } : p))
  }
  // Data-defined styles: rewards earned in the fight, plus clear / take-a-bow rewards
  const fighterSpecs = specsOf(state.players.find((p) => p.id === fighterId))
  if (fighterSpecs.length) {
    let earned = combat.specRewards ?? {}
    for (const spec of fighterSpecs) earned = addRewards(earned, success ? spec.onClear : spec.onRetreat)
    players = players.map((p) => p.id === fighterId ? {
      ...p,
      fame: Math.max(0, p.fame + (earned.fame ?? 0)),
      exp: Math.max(0, p.exp + (earned.exp ?? 0)),
      inspiration: Math.max(0, p.inspiration + (earned.inspiration ?? 0)),
    } : p)
  }
  if (rewards.monstersDefeatedCount > 0) {
    if (rewards.fighterFame > 0) {
      players = players.map((p) => (p.id === fighterId ? { ...p, fame: p.fame + rewards.fighterFame } : p))
    }
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
    // Ended early: remove tags for defeated monsters (level x vulnerability),
    // and every monster that was moved (wounded) but not won over levels up
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
      .filter((m) => m.currentHP > 0 && m.vulnerability !== null && (m.currentHP < m.maxHP || getTunables().retreatLevelsUpAll > 0))
      .map((m) => m.vulnerability!)
    if (survivingGenres.length > 0) {
      spaces = spaces.map((s) =>
        s.id === spaceId
          ? { ...s, genreTags: survivingGenres.reduce(addGenreTag, s.genreTags) }
          : s
      )
    }
  }

  events.push({
    type: 'combatEnded',
    playerId: fighterId,
    success,
    monstersDefeated: rewards.monstersDefeatedCount,
  })

  return {
    ...state,
    players,
    spaces,
    pendingPhase,
    combat: createInitialCombatState(),
    // Deliberately does NOT open the Studio: the player stays on the board and
    // the Studio button hints instead (PlayerPanel flashes it until they visit).
    studio: createInitialStudioState(),
  }
}

// ============================================================
// END_TURN
// ============================================================

function endTurn(state: EngineState, rng: Rng, newId: NewId): EngineState {
  // Moves can only be taken back within the turn they were made
  state = { ...state, moveTrail: [] }
  const current = state.players[state.currentTurnPlayerIndex]
  let players = state.players.map((p) =>
    p.id === current.id
      ? { ...p, movesThisTurn: 0, fightsThisTurn: 0, inspirationBoughtThisTurn: 0, hasShoppedThisTurn: false }
      : p
  )

  // Mid-round: just pass play to the next bard and refill their shop.
  if (state.currentTurnPlayerIndex < state.players.length - 1) {
    let { elementBag, elementDiscard, elementOffers } = state
    const needed = elementOfferCount() - elementOffers.length
    if (needed > 0) {
      const { drawn, bag, discard } = drawFromBag(elementBag, elementDiscard, needed, rng)
      elementOffers = [...elementOffers, ...drawn]
      elementBag = bag
      elementDiscard = discard
    }
    return beginTurn({
      ...state,
      players,
      currentTurnPlayerIndex: state.currentTurnPlayerIndex + 1,
      elementBag,
      elementDiscard,
      elementOffers,
      studio: createInitialStudioState(),
    }, rng)
  }

  // Round over: everyone's per-turn counters reset.
  players = players.map((p) => ({ ...p, movesThisTurn: 0, fightsThisTurn: 0, hasShoppedThisTurn: false }))
  const working = { ...state, players }

  // Reinforcements: every bard contributes a balanced hand of chips, scattered
  // at random across distinct spaces. Skipped when this round-end flips straight
  // to the Final Showdown — the board is about to stop mattering.
  const flippingToBoss = !!state.pendingPhase && state.finalTurnGranted
  const reinforced = flippingToBoss
    ? working
    : { ...working, spaces: scatterChipsRandomly(working.spaces, roundEndChips(working), rng) }

  return finishRound(reinforced, rng, newId)
}

/**
 * Round-over bookkeeping: latch the phase transition, grow the round counter,
 * respawn every space's monsters from its (reinforced) tags, refill the shop,
 * and — when entering the Final Showdown — start it.
 */
function finishRound(state: EngineState, rng: Rng, newId: NewId): EngineState {
  let { phase, pendingPhase, finalTurnGranted, currentRound } = state
  let showdownFields: Partial<EngineState> = {}

  // Reaching the threshold grants one more full round ("Final Turn!") before the
  // phase actually flips — so the leaders can't be caught off guard.
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

  // Re-derive every space's monsters from its current tags so the roster on a
  // space a player is already standing on matches the board.
  const spaces = state.spaces.map((s) => ({
    ...s,
    monsters: spawnMonstersFromTags(s.genreTags, s.id, currentRound, rng, newId),
  }))

  // Entering the showdown: start it right here so there is no client-side
  // auto-start race — every client just renders the started showdown.
  if (phase === 'finalBoss' && !state.showdownActive) {
    showdownFields = startShowdownFields(state.players.map((p) => p.id))
  }

  // Refill the shop for the first player of the new round.
  let { elementBag, elementDiscard, elementOffers } = state
  const needed = elementOfferCount() - elementOffers.length
  if (needed > 0) {
    const { drawn, bag, discard } = drawFromBag(elementBag, elementDiscard, needed, rng)
    elementOffers = [...elementOffers, ...drawn]
    elementBag = bag
    elementDiscard = discard
  }

  const next: EngineState = {
    ...state,
    spaces,
    phase,
    pendingPhase,
    finalTurnGranted,
    currentRound,
    currentTurnPlayerIndex: 0,
    elementBag,
    elementDiscard,
    elementOffers,
    studio: createInitialStudioState(),
    ...showdownFields,
  }
  // The board phase continues: the first bard's turn begins
  return next.phase === 'main' ? beginTurn(next, rng) : next
}

/** Fresh showdown fields: verse 1, everyone at zero fandom, no adaptation yet. */
function startShowdownFields(playerIds: string[]): Partial<EngineState> {
  return {
    showdownActive: true,
    showdownComplete: false,
    showdownTurn: 1,
    showdownOrder: playerIds,
    showdownPerformerIdx: 0,
    showdownResistGenre: null,
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

/**
 * Playtest jump: replay this table (same bards, elements and tunables) from a
 * fresh deal with bots playing every turn, until `round` rounds are complete.
 * Everything — board chips, positions, dice, styles, Fame, EXP, Inspiration,
 * the shop — comes out of real play, so it is realistic and self-consistent.
 * A bot game can reach the showdown before the requested round; then a few
 * more games are tried, and the one that got furthest is used. With
 * `showdown`, the Final Showdown starts from that state.
 */
function simulateToRound(state: EngineState, round: number, showdown: boolean, rng: Rng): EngineState {
  const playerConfigs = state.players.map((p) => ({ name: p.name, starterGenre: p.starterGenre }))
  const target = Math.min(Math.max(1, round), MAX_SIMULATED_ROUND)
  let best: { state: EngineState; completed: number } | null = null
  for (let attempt = 0; attempt < SIMULATION_ATTEMPTS; attempt++) {
    const dealt = applyAction(
      { ...createInitialEngineState(), tunables: state.tunables },
      { type: 'START_GAME', playerConfigs },
      { rng, actor: { kind: 'hotseat' } }
    )
    if (!dealt.ok) return state
    const result = simulateRounds(dealt.state, target, rng)
    if (!best || result.completed > best.completed) best = result
    if (best.completed >= target) break
  }
  const played = best!.state
  if (!showdown) return played
  return {
    ...played,
    phase: 'finalBoss',
    pendingPhase: null,
    finalTurnGranted: false,
    combat: createInitialCombatState(),
    studio: createInitialStudioState(),
    moveTrail: [],
    ...startShowdownFields(played.players.map((p) => p.id)),
  }
}

/** Bot games tried before settling for the one that got furthest. */
const SIMULATION_ATTEMPTS = 12
/** Simulated games rarely run longer; this caps the work a single action does. */
export const MAX_SIMULATED_ROUND = 30

// ============================================================
// Round-end reinforcements
// ============================================================

/**
 * The chips the board gains at round end: `roundEndChipsPerElement` of every
 * element, per bard — so reinforcements stay elementally balanced and scale
 * with the size of the table.
 */
export function roundEndChips(state: EngineState): Genre[] {
  const per = roundEndChipsPerElement()
  return state.players.flatMap(() => ALL_GENRES.flatMap((genre) => Array<Genre>(per).fill(genre)))
}

// ============================================================
// Showdown
// ============================================================

/**
 * Roll a performance — every song in it, as one throw — against the adapted
 * boss and derive the performance stats.
 */
function rollShowdownPlay(
  state: EngineState,
  songs: Song[],
  performerId: string,
  base: { currentFandom: number; fandomTotal: number; bestHit: { damage: number } | undefined; crits: number },
  rng: Rng,
  events: EngineEvent[],
  extraSpecs: StyleSpec[] = []
) {
  const boss = createShowdownBoss({
    resistGenre: state.showdownResistGenre,
  })
  // Styles apply in the showdown too. Each performance is the bard's whole
  // turn, so it is always their first roll and once-per-turn styles are fresh.
  const performer = state.players.find((p) => p.id === performerId)!
  const styleCtx: StyleContext = {
    styles: performer.styles,
    used: [],
    firstRoll: true,
    allElements: holdsAllElements(performer.songs),
    elementCount: elementCount(performer.songs),
  }
  // Data-defined styles (style lab) apply to showdown dice too
  const specs = [...specsOf(performer), ...extraSpecs]
  const fames = state.players.map((p) => p.fame)
  const play: PlayContext | undefined = specs.length ? {
    showdown: true, playIndex: 0, lastElement: null, comboCount: 0, elementsPlayed: [], target: boss,
    sharingSpace: false, trailingFame: performer.fame <= Math.min(...fames), leadingFame: performer.fame >= Math.max(...fames),
    inspiration: performer.inspiration, starter: performer.starterGenre, monstersInFight: 1, used: [],
  } : undefined
  if (play) {
    styleCtx.specs = specs
    styleCtx.play = play
  }
  const song = mergeSongs(songs)
  const songIds = songs.map((s) => s.id)
  const { rolls } = rollSongWithStyles(song, styleCtx, rng)
  const calc = calculateDamage(song, rolls, boss, {
    immuneMultiplier: counterpointMultiplier(styleCtx),
    ...(play ? { multiplierFor: (d: Dice, m: Monster, b: number) => specMultiplier(specs, d, m, play, b) } : {}),
  })
  const fandom = Math.max(0, calc.totalDamage)
  const genre = getDominantGenre(song, rolls)
  const critCount = rolls.filter((r) => r.isCrit).length

  const songGenres = song.slots
    .map((slot) => slot.dice?.genre)
    .filter((g): g is Genre => g !== undefined)
  const wasResisted = state.showdownResistGenre !== null && songGenres.includes(state.showdownResistGenre)

  const bestHit =
    !base.bestHit || fandom > base.bestHit.damage
      ? { damage: fandom }
      : base.bestHit

  events.push({ type: 'diceRolled', playerId: performerId, songId: song.id, songIds, context: 'showdown', rolls })
  events.push({
    type: 'showdownPlay',
    playerId: performerId,
    songId: song.id,
    songIds,
    fandom,
    hadCrit: critCount > 0,
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

/** Perform the tapped song's element: every die of that element rolls together. */
function playShowdownSong(state: EngineState, songId: string, rng: Rng, events: EngineEvent[]): EngineState {
  const performerId = state.showdownOrder[state.showdownPerformerIdx]
  const performer = state.players.find((p) => p.id === performerId)!
  const songs = showdownElementSongs(performer.songs, songId)
  const songIds = songs.map((s) => s.id)

  // Snapshot the performer's accumulators before this play, so it can be rerolled
  const base = {
    currentFandom: state.showdownCurrentFandom,
    fandomTotal: state.showdownFandom[performerId] || 0,
    bestHit: state.showdownBestHit[performerId],
    crits: state.showdownCrits[performerId] || 0,
  }
  const fields = rollShowdownPlay(state, songs, performerId, base, rng, events)

  return {
    ...state,
    ...fields,
    showdownSongsUsed: [...state.showdownSongsUsed, ...songIds],
    showdownUndo: {
      songId: songIds[0],
      songIds,
      performerId,
      currentFandom: base.currentFandom,
      fandomTotal: base.fandomTotal,
      bestHit: base.bestHit,
      crits: base.crits,
      songsUsed: state.showdownSongsUsed,
    },
  }
}

function rerollShowdownSong(state: EngineState, rubato: boolean, rng: Rng, events: EngineEvent[]): EngineState {
  const undo = state.showdownUndo!
  const performer = state.players.find((p) => p.id === undo.performerId)!
  const songs = performer.songs.filter((s) => undo.songIds.includes(s.id))

  // Spend 1 Inspiration (or Rubato's / a style-lab spec's free reroll), then
  // replay from the snapshot — it stays put so the performance can be rerolled again.
  const insp = inspirationRules(specsOf(performer))
  const free = !rubato && (undo.freeRerollsUsed ?? 0) < insp.freePerTurn
  const players = rubato || free ? state.players : adjustInspiration(state.players, undo.performerId, -inspirationSpend())
  const bonus: StyleSpec[] = !rubato && insp.bonus
    ? [{ id: '_reroll-bonus', name: '', rule: '', theme: '', cost: 0, roll: [{ flat: insp.bonus }] }]
    : []
  let fields = rollShowdownPlay(
    state,
    songs,
    undo.performerId,
    { currentFandom: undo.currentFandom, fandomTotal: undo.fandomTotal, bestHit: undo.bestHit, crits: undo.crits },
    rng,
    events,
    bonus
  )
  // Keep-the-better rerolls: the old performance stands if it was louder
  if ((rubato || insp.keepBetter) && fields.showdownCurrentFandom < state.showdownCurrentFandom) {
    fields = {
      showdownCurrentFandom: state.showdownCurrentFandom,
      showdownCurrentGenre: state.showdownCurrentGenre,
      showdownFandom: state.showdownFandom,
      showdownBestHit: state.showdownBestHit,
      showdownCrits: state.showdownCrits,
    }
  }
  const showdownUndo = {
    ...undo,
    ...(rubato ? { rubatoUsed: true } : {}),
    ...(free ? { freeRerollsUsed: (undo.freeRerollsUsed ?? 0) + 1 } : {}),
  }
  return { ...state, players, ...fields, showdownUndo }
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
  if (state.showdownTurn < showdownTurns()) {
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
      showdownUndo: null,
    }
  }

  // Third verse complete — the boss falls. Bank fandom into fame.
  const players = state.players.map((p) => {
    // Data-defined styles may add an encore: flat fans, or fans per unspent Inspiration
    const encore = specsOf(p).reduce((sum, spec) =>
      sum + (spec.showdownEnd?.flat ?? 0) + (spec.showdownEnd?.perInspiration ?? 0) * p.inspiration, 0)
    const fandom = (state.showdownFandom[p.id] || 0) + encore
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

/** Pay a Studio price (EXP, or Inspiration standing in for it under a style-lab spec). */
function payFor(players: Player[], playerId: string, cost: number): Player[] {
  return players.map((p) => (p.id === playerId ? pay(p, cost) : p))
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
