import { EngineCombatState, EngineState } from './state.js'
import { GameAction, ActorSeat } from './actions.js'
import { getPlayableSongs, mergeSongs } from '../game-logic/showdown/showdown.js'
import { areSpacesConnected } from '../game-logic/board/graphBuilder.js'
import { inspirationSpend } from '../data/draftCards.js'
import { getTunables } from '../data/tunables.js'
import { inspirationRules } from '../game-logic/styles/specs.js'
import { specsOf } from '../data/styleSpecs.js'
import { canAfford, d4CostFor, inspirationCostFor, movesFor, upgradeCostFor } from './economy.js'
import { STYLES, styleCost, maxStyles } from '../data/styles.js'
import { fermataCanRefresh, rubatoCanReroll, rubatoUsesLeft, staccatoCanRefresh } from '../game-logic/styles/styleEffects.js'

export function maxMovesPerTurn(): number {
  return getTunables().maxMovesPerTurn
}
export function maxFightsPerTurn(): number {
  return getTunables().maxFightsPerTurn
}

/** Chips of EACH element every bard is dealt at round end. */
export function roundEndChipsPerElement(): number {
  return getTunables().roundEndChipsPerElement
}

/**
 * Can the fighter play this featured song? The guest must share the fight's
 * space, not have been featured yet this fight, and own a song with a die.
 */
function validateFeature(
  state: EngineState,
  feature: { guestPlayerId: string; songId: string; targetMonsterId: string }
): ValidationResult {
  const combat = state.combat
  if (!combat.isActive) return illegal('No concert in progress')
  const guest = state.players.find((p) => p.id === feature.guestPlayerId)
  if (!guest || guest.id === combat.playerId) return illegal('Choose another bard to borrow from')
  if (guest.position !== combat.spaceId) return illegal('That bard is not on this space')
  if (combat.featuredPlayerIds.includes(guest.id)) return illegal('You already borrowed a song from that bard this concert')
  const song = guest.songs.find((sg) => sg.id === feature.songId)
  if (!song?.slots.some((slot) => slot.dice)) return illegal('Choose one of their songs with a die')
  return validateCombatTarget(combat, feature.targetMonsterId)
}

function validateCombatTarget(combat: EngineCombatState, targetId: string | null): ValidationResult {
  const target = combat.monsters.find((m) => m.id === targetId)
  if (!target) return illegal('Choose a monster to target')
  if (target.currentHP <= 0) return illegal('That monster is already won over')
  const lockedTarget = combat.monsters.find((m) => m.id === combat.lockedTargetMonsterId)
  if (lockedTarget && lockedTarget.currentHP > 0 && lockedTarget.id !== target.id) {
    return illegal('Win over the monster you moved, or end the concert')
  }
  return ok
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: 'forbidden' | 'illegal'; message: string }

const ok: ValidationResult = { ok: true }
const forbidden = (message: string): ValidationResult => ({ ok: false, code: 'forbidden', message })
const illegal = (message: string): ValidationResult => ({ ok: false, code: 'illegal', message })

function currentPlayerId(state: EngineState): string | null {
  return state.players[state.currentTurnPlayerIndex]?.id ?? null
}

function currentPerformerId(state: EngineState): string | null {
  return state.showdownOrder[state.showdownPerformerIdx] ?? null
}

/**
 * Seat authorization + rule legality for an action. Hotseat actors skip the
 * seat checks (one screen drives every player) but rule legality always holds.
 */
export function validateAction(
  state: EngineState,
  action: GameAction,
  actor: ActorSeat
): ValidationResult {
  const isSeat = actor.kind === 'seat'
  const seatPlayerId = isSeat ? actor.playerId : null
  const isHost = actor.kind === 'hotseat' || (isSeat && actor.isHost)

  // Seat gate: most actions belong to the current-turn player
  const requireCurrentTurn = (): ValidationResult => {
    if (isSeat && seatPlayerId !== currentPlayerId(state)) {
      return forbidden('Not your turn')
    }
    return ok
  }

  const requireOpenStudio = (): ValidationResult => {
    if (state.studio.playerId !== currentPlayerId(state)) {
      return illegal('Studio is not open for the current player')
    }
    return ok
  }

  switch (action.type) {
    case 'START_GAME': {
      if (!isHost) return forbidden('Only the host can start the game')
      if (state.phase !== 'setup') return illegal('Game already started')
      if (action.playerConfigs.length < 1 || action.playerConfigs.length > 4) {
        return illegal('1-4 players required')
      }
      const elements = action.playerConfigs.map((c) => c.starterGenre)
      if (new Set(elements).size !== elements.length) {
        return illegal('Each bard needs a different starting element')
      }
      return ok
    }

    case 'MOVE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Movement only during the main phase')
      if (state.combat.isActive) return illegal('Cannot move during a concert')
      if (state.studio.playerId) return illegal('Close the Studio before moving')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return illegal('Unknown player')
      if (player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.movesThisTurn >= movesFor(player)) return illegal('No moves left this turn')
      if (action.toSpaceId === player.position) return illegal('Already on that space')
      if (!state.spaces.some((s) => s.id === action.toSpaceId)) return illegal('Unknown space')
      if (!areSpacesConnected(player.position, action.toSpaceId, state.spaces)) {
        return illegal('Spaces are not connected')
      }
      return ok
    }

    case 'UNDO_MOVE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Movement only during the main phase')
      if (state.combat.isActive) return illegal('Cannot move during a concert')
      if (state.studio.playerId) return illegal('Close the Studio before moving')
      if (action.playerId !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      const last = state.moveTrail[state.moveTrail.length - 1]
      if (!last || last.playerId !== action.playerId) return illegal('No move to take back')
      return ok
    }

    case 'START_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Concerts only during the main phase')
      if (state.combat.isActive) return illegal('A concert is already in progress')
      if (state.studio.playerId) return illegal('Close the Studio before a concert')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player || player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.fightsThisTurn >= maxFightsPerTurn()) return illegal('No concerts left this turn')
      const space = state.spaces.find((s) => s.id === player.position)
      if (!space || space.monsters.length === 0) return illegal('No monsters here')
      return ok
    }

    case 'PLAY_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      if (state.combat.featureRequest) return illegal('Waiting for an answer about a guest song')
      // A song whose dice are spent (it damaged without defeating) can't replay.
      if (state.combat.spentSongIds.includes(action.songId)) {
        return illegal('That song\'s dice are spent this combat')
      }
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter) return illegal('No performing bard')
      const song = fighter.songs.find((s) => s.id === action.songId)
      if (!song) return illegal('Unknown song')
      if (!song.slots.some((slot) => slot.dice)) return illegal('Song has no dice')
      if (action.inspiredPlay) {
        // Soul: needs enough Inspiration at the start of the turn, and pays for each use
        const t = getTunables()
        if (!fighter.styles.includes('inspired-play')) return illegal(`${STYLES['inspired-play'].name} is not one of your genres`)
        if ((state.turnStartInspiration ?? 0) < t.inspiredPlayMin) return illegal(`${STYLES['inspired-play'].name} needs ${t.inspiredPlayMin}+ Inspiration at the start of your turn`)
        if (fighter.inspiration < t.inspiredPlayCost) return illegal('Not enough Inspiration')
      }
      if (action.staccatoCall) {
        if (!fighter.styles.includes('staccato')) return illegal(`${STYLES.staccato.name} is not one of your genres`)
        if (state.combat.stylesUsed.includes('staccato')) return illegal(`${STYLES.staccato.name} is already used this turn`)
      }
      return validateCombatTarget(state.combat, action.targetMonsterId)
    }

    case 'REROLL_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      if (state.combat.featureRequest) return illegal('Waiting for an answer about a guest song')
      if (!state.combat.undoSnapshot || !state.combat.lastPlayedSongId) {
        return illegal('Nothing to encore')
      }
      // Only a SPENT song can be rerolled. A song that landed the kill refreshed
      // instead, and replaying it would re-resolve against a dead target.
      if (!state.combat.spentSongIds.includes(state.combat.lastPlayedSongId)) {
        return illegal('That song won its monster over — play it again instead')
      }
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter) return illegal('No performing bard')
      if (action.rubato) {
        if (!fighter.styles.includes('rubato')) return illegal(`${STYLES.rubato.name} is not one of your genres`)
        if (rubatoUsesLeft(state.combat.stylesUsed) <= 0) return illegal(`${STYLES.rubato.name} is used up this turn`)
        const song = fighter.songs.find((sg) => sg.id === state.combat.lastPlayedSongId)
        if (!song || !rubatoCanReroll(song)) return illegal(`${STYLES.rubato.name} can't encore a die that large`)
      } else if (
        fighter.inspiration < inspirationSpend() &&
        state.combat.freeRerollsUsed >= inspirationRules(specsOf(fighter)).freePerTurn
      ) {
        return illegal('Not enough Inspiration')
      }
      return validateCombatTarget(state.combat, state.combat.lastTargetMonsterId)
    }

    case 'RALLY_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      if (state.combat.featureRequest) return illegal('Waiting for an answer about a guest song')
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter?.styles.includes('staccato')) return illegal(`${STYLES.staccato.name} is not one of your genres`)
      if (!state.combat.rallyReady) return illegal('Call a monster and win it over first')
      if (!fighter.songs.some((sg) => sg.id === action.songId)) return illegal('Choose one of your own songs')
      if (!state.combat.spentSongIds.includes(action.songId)) return illegal('That song is not spent')
      const rallied = fighter.songs.find((sg) => sg.id === action.songId)
      if (!rallied || !staccatoCanRefresh(rallied)) return illegal(`${STYLES.staccato.name} cannot refresh a die that large`)
      return ok
    }

    case 'LINGER_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      if (state.combat.featureRequest) return illegal('Waiting for an answer about a guest song')
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter?.styles.includes('fermata')) return illegal(`${STYLES.fermata.name} is not one of your genres`)
      if (state.combat.stylesUsed.includes('fermata')) return illegal(`${STYLES.fermata.name} is already used this turn`)
      const song = fighter.songs.find((sg) => sg.id === action.songId)
      if (!song) return illegal('Choose one of your own songs')
      if (!state.combat.spentSongIds.includes(action.songId)) return illegal('That song is not spent')
      if (!fermataCanRefresh(song)) return illegal(`${STYLES.fermata.name} only refreshes a d20 song`)
      if (fighter.inspiration < getTunables().fermataInspirationCost) return illegal('Not enough Inspiration')
      return ok
    }

    case 'PLAY_FEATURED_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      // Online the guest must agree first: ask with REQUEST_FEATURE
      if (isSeat) return forbidden('Ask that bard to lend their song first')
      if (state.combat.featureRequest) return illegal('Waiting for an answer about a guest song')
      return validateFeature(state, action)
    }

    case 'REQUEST_FEATURE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.combat.featureRequest) return illegal('Already waiting for an answer')
      return validateFeature(state, action)
    }

    case 'ANSWER_FEATURE': {
      const request = state.combat.featureRequest
      if (!state.combat.isActive || !request) return illegal('No guest song request to answer')
      if (action.accept) {
        // Only the guest can agree to feature their own song
        if (isSeat && seatPlayerId !== request.guestPlayerId) return forbidden('Only that bard can agree')
        return validateFeature(state, request)
      }
      // Declining: the guest, or the fighter withdrawing the ask
      if (isSeat && seatPlayerId !== request.guestPlayerId && seatPlayerId !== state.combat.playerId) {
        return forbidden('Not your request to answer')
      }
      return ok
    }

    case 'SELECT_COMBAT_SPREAD': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      if (!state.combat.monsters.every((m) => m.currentHP <= 0)) {
        return illegal('Win over every monster before choosing an element')
      }
      return ok
    }

    case 'END_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No concert in progress')
      const allDefeated = state.combat.monsters.every((m) => m.currentHP <= 0)
      if (allDefeated && !action.spreadGenre && !state.combat.selectedSpreadGenre) {
        return illegal('Choose an element to radiate before finishing the concert')
      }
      return ok
    }

    case 'END_TURN': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Turns only advance during the main phase')
      if (state.combat.isActive) return illegal('Finish the concert before ending the turn')
      if (state.studio.playerId) return illegal('Close the Studio before ending the turn')
      return ok
    }

    case 'OPEN_STUDIO': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      if (state.phase !== 'main') return illegal('Studio only opens during the main phase')
      if (state.combat.isActive) return illegal('Finish the concert before opening the Studio')
      if (action.playerId !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      return ok
    }

    case 'CLOSE_STUDIO': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      return requireOpenStudio()
    }

    case 'SELECT_STUDIO_OFFER': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      if (
        action.offerIndex !== null &&
        (action.offerIndex < 0 || action.offerIndex >= state.elementOffers.length)
      ) {
        return illegal('No such element cube')
      }
      return ok
    }

    case 'SELECT_STUDIO_REWARD': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const playerId = currentPlayerId(state)
      if (
        action.rewardId !== null &&
        !(state.pendingRewards[playerId ?? ''] ?? []).some((reward) => reward.id === action.rewardId)
      ) {
        return illegal('No such reward')
      }
      return ok
    }

    case 'BUY_DIE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      if (action.offerIndex < 0 || action.offerIndex >= state.elementOffers.length) {
        return illegal('No such element cube')
      }
      if (action.destination !== undefined) {
        const destination = action.destination
        const slot = player.songs.find((song) => song.id === destination?.songId)?.slots[0]
        if (!slot || state.elementOffers[action.offerIndex] !== destination.genre ||
          (slot.dice?.id ?? null) !== destination.previousDieId) return illegal('The selected die or offer changed')
        if (slot.dice && player.songs.some((song) => !song.slots[0].dice)) return illegal('Use an empty slot first')
      }
      if (!canAfford(player, d4CostFor(player))) return illegal('Not enough EXP')
      return ok
    }

    case 'UPGRADE_DIE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      if (action.offerIndex < 0 || action.offerIndex >= state.elementOffers.length) {
        return illegal('No such element cube')
      }
      const die = player.songs
        .flatMap((s) => s.slots)
        .map((slot) => slot.dice)
        .find((d) => d?.id === action.diceId)
      if (!die) return illegal('You do not own that die')
      if (die.genre !== state.elementOffers[action.offerIndex]) {
        return illegal('Die element does not match the cube')
      }
      const cost = upgradeCostFor(player, die)
      if (cost === null) return illegal('Die is already at max tier')
      if (!canAfford(player, cost)) return illegal('Not enough EXP')
      return ok
    }

    case 'REFRESH_ELEMENT_OFFERS': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player || player.inspiration < inspirationSpend()) return illegal('Not enough Inspiration')
      return ok
    }

    case 'SLOT_DIE_REWARD': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const rewards = state.pendingRewards[player.id] ?? []
      const reward = rewards.find((r) => r.id === action.rewardId)
      if (!reward) return illegal('No such reward')
      const song = player.songs.find((s) => s.id === action.songId)
      if (!song) return illegal('No such song')
      if (reward.kind !== 'die') return illegal('Reward is not a die')
      if (action.slotIndex < 0 || action.slotIndex >= song.slots.length) {
        return illegal('No such slot')
      }
      if (song.slots[action.slotIndex].dice) return illegal('Slot already contains a die')
      return ok
    }

    case 'BUY_INSPIRATION': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const cost = inspirationCostFor(player)
      if (player.exp < cost) return illegal('Not enough EXP')
      return ok
    }

    case 'BUY_STYLE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const styleId = state.styleOffers[action.offerIndex]
      if (!styleId || (action.expectedStyleId && action.expectedStyleId !== styleId)) return illegal('No such genre on offer')
      if (player.styles.includes(styleId)) return illegal('You already play that genre')
      if (!canAfford(player, styleCost(styleId))) return illegal('Not enough EXP')
      if (player.styles.length >= maxStyles()) {
        if (!action.replaceStyleId || !player.styles.includes(action.replaceStyleId)) {
          return illegal(`You can hold ${maxStyles()} genres — choose one to replace`)
        }
      } else if (action.replaceStyleId) {
        return illegal('You have room for another genre')
      }
      return ok
    }

    case 'REFRESH_STYLE_OFFERS': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player || player.inspiration < inspirationSpend()) return illegal('Not enough Inspiration')
      return ok
    }

    case 'PLAY_SHOWDOWN_SONG': {
      if (state.phase !== 'finalBoss' || !state.showdownActive) return illegal('No active showdown')
      if (state.showdownComplete) return illegal('Showdown is over')
      const performerId = currentPerformerId(state)
      if (isSeat && seatPlayerId !== performerId) return forbidden('Not your performance')
      if (state.showdownSongsUsed.length >= 1) return illegal('One song per verse')
      const performer = state.players.find((p) => p.id === performerId)
      if (!performer) return illegal('No performer')
      const song = getPlayableSongs(performer.songs).find((s) => s.id === action.songId)
      if (!song) return illegal('Song is not playable')
      return ok
    }

    case 'REROLL_SHOWDOWN_SONG': {
      if (state.phase !== 'finalBoss' || !state.showdownActive) return illegal('No active showdown')
      if (state.showdownComplete) return illegal('Showdown is over')
      const performerId = currentPerformerId(state)
      if (isSeat && seatPlayerId !== performerId) return forbidden('Not your performance')
      if (!state.showdownUndo) return illegal('Nothing to encore')
      const performer = state.players.find((p) => p.id === performerId)
      if (!performer) return illegal('No performer')
      if (action.rubato) {
        if (!performer.styles.includes('rubato')) return illegal(`${STYLES.rubato.name} is not one of your genres`)
        if (state.showdownUndo.rubatoUsed) return illegal('Rubato is already used this verse')
        const undo = state.showdownUndo
        const songs = performer.songs.filter((sg) => (undo.songIds ?? [undo.songId]).includes(sg.id))
        if (!songs.length || !rubatoCanReroll(mergeSongs(songs))) return illegal(`${STYLES.rubato.name} can't encore a die that large`)
      } else if (
        performer.inspiration < inspirationSpend() &&
        (state.showdownUndo.freeRerollsUsed ?? 0) >= inspirationRules(specsOf(performer)).freePerTurn
      ) {
        return illegal('Not enough Inspiration')
      }
      return ok
    }

    case 'FINISH_SHOWDOWN_PERFORMANCE': {
      if (state.phase !== 'finalBoss' || !state.showdownActive) return illegal('No active showdown')
      if (state.showdownComplete) return illegal('Showdown is over')
      const performerId = currentPerformerId(state)
      if (isSeat && seatPlayerId !== performerId) return forbidden('Not your performance')
      const performer = state.players.find((p) => p.id === performerId)
      const playable = performer ? getPlayableSongs(performer.songs) : []
      if (playable.length > 0 && state.showdownSongsUsed.length === 0) {
        return illegal('Play a song first')
      }
      return ok
    }

    case 'ADVANCE_TO_SUMMARY': {
      if (state.phase !== 'finalBoss' || !state.showdownComplete) {
        return illegal('The showdown is not finished')
      }
      return ok
    }

    case 'RESET_GAME': {
      if (!isHost) return forbidden('Only the host can reset the game')
      return ok
    }

    case 'HOST_SKIP_TURN': {
      if (!isHost) return forbidden('Only the host can skip a turn')
      if (state.phase !== 'main') return illegal('Turns only advance during the main phase')
      if (action.targetPlayerId !== currentPlayerId(state)) {
        return illegal('Can only skip the current player')
      }
      return ok
    }

    // Playtest tooling. Restricted to the host seat: it can rewrite any value,
    // so a non-host seat must never be able to reach it in an online game.
    case 'DEBUG_PATCH': {
      if (!isHost) return forbidden('Only the host can use debug mode')
      if (!action.patch || typeof action.patch !== 'object') return illegal('Missing debug patch')
      return ok
    }

    case 'DEBUG_SIMULATE': {
      if (!isHost) return forbidden('Only the host can use debug mode')
      if (!Number.isInteger(action.round) || action.round < 1) return illegal('Choose a round of 1 or more')
      if (state.players.length === 0) return illegal('Start a game first')
      return ok
    }

    case 'DEBUG_LOAD_STATE': {
      if (!isHost) return forbidden('Only the host can load a playtest preset')
      const incoming = action.engineState
      if (!incoming || typeof incoming !== 'object') return illegal('Missing engine state')
      if (!Array.isArray(incoming.players) || !Array.isArray(incoming.spaces)) {
        return illegal('Preset is not a valid game state')
      }
      if (incoming.players.length === 0) return illegal('Preset has no players')
      return ok
    }
  }
}
