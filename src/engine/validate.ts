import { EngineState } from './state.js'
import { GameAction, ActorSeat } from './actions.js'
import { getPlayableSongs } from '../game-logic/showdown/showdown.js'
import { areSpacesConnected, maxGenreTags } from '../game-logic/board/graphBuilder.js'
import { newD4Cost, getUpgradeCost, getInspirationCost, inspirationSpend } from '../data/draftCards.js'
import { getTunables } from '../data/tunables.js'

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

  // Normal turn actions are blocked while round-end reinforcements are running.
  const currentPlacerId = (): string | null => {
    if (!state.redistribution.active || state.players.length === 0) return null
    return state.players[state.redistribution.placerIdx]?.id ?? null
  }
  const blockedByRedistribution = (): ValidationResult =>
    state.redistribution.active ? illegal('Round-end reinforcements in progress') : ok

  switch (action.type) {
    case 'START_GAME': {
      if (!isHost) return forbidden('Only the host can start the game')
      if (state.phase !== 'setup') return illegal('Game already started')
      if (action.playerConfigs.length < 1 || action.playerConfigs.length > 4) {
        return illegal('1-4 players required')
      }
      return ok
    }

    case 'MOVE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const notRedist = blockedByRedistribution()
      if (!notRedist.ok) return notRedist
      if (state.phase !== 'main') return illegal('Movement only during the main phase')
      if (state.combat.isActive) return illegal('Cannot move during combat')
      if (state.studio.playerId) return illegal('Close the Studio before moving')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return illegal('Unknown player')
      if (player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.movesThisTurn >= maxMovesPerTurn()) return illegal('No moves left this turn')
      if (action.toSpaceId === player.position) return illegal('Already on that space')
      if (!state.spaces.some((s) => s.id === action.toSpaceId)) return illegal('Unknown space')
      if (action.inspirationTravel) {
        if (player.inspiration < inspirationSpend()) return illegal('Not enough Inspiration to travel')
      } else if (!areSpacesConnected(player.position, action.toSpaceId, state.spaces)) {
        return illegal('Spaces are not connected')
      }
      return ok
    }

    case 'START_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const notRedist = blockedByRedistribution()
      if (!notRedist.ok) return notRedist
      if (state.phase !== 'main') return illegal('Combat only during the main phase')
      if (state.combat.isActive) return illegal('Combat already active')
      if (state.studio.playerId) return illegal('Close the Studio before combat')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player || player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.fightsThisTurn >= maxFightsPerTurn()) return illegal('No fights left this turn')
      const space = state.spaces.find((s) => s.id === player.position)
      if (!space || space.monsters.length === 0) return illegal('No monsters here')
      return ok
    }

    case 'PLAY_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      // A song whose dice are spent (it damaged without defeating) can't replay.
      if (state.combat.spentSongIds.includes(action.songId)) {
        return illegal('That song\'s dice are spent this combat')
      }
      const owner = state.players.find((p) => p.id === action.ownerId)
      if (!owner) return illegal('Unknown song owner')
      // Cover songs: the owner must share the space with the fighting player
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter) return illegal('No fighting player')
      if (owner.id !== fighter.id && (owner.position !== fighter.position || owner.isEliminated)) {
        return illegal('Song owner is not at this space')
      }
      const song = owner.songs.find((s) => s.id === action.songId)
      if (!song) return illegal('Unknown song')
      if (!song.slots.some((slot) => slot.dice)) return illegal('Song has no dice')
      // Single-target: a live monster must be chosen
      const target = state.combat.monsters.find((m) => m.id === action.targetMonsterId)
      if (!target) return illegal('Choose a monster to target')
      if (target.currentHP <= 0) return illegal('That monster is already defeated')
      return ok
    }

    case 'REROLL_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      if (!state.combat.undoSnapshot || !state.combat.lastPlayedSongId) {
        return illegal('Nothing to reroll')
      }
      // Only a SPENT song can be rerolled. A song that landed the kill refreshed
      // instead, and replaying it would re-resolve against a dead target.
      if (!state.combat.spentSongIds.includes(state.combat.lastPlayedSongId)) {
        return illegal('That song defeated its target — play it again instead')
      }
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter || fighter.inspiration < inspirationSpend()) return illegal('Not enough Inspiration')
      if (state.combat.monsters.every((m) => m.currentHP <= 0)) return illegal('All monsters defeated')
      return ok
    }

    case 'SELECT_COMBAT_SPREAD': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      if (!state.combat.monsters.every((m) => m.currentHP <= 0)) {
        return illegal('Defeat every monster before choosing an element')
      }
      return ok
    }

    case 'END_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      const allDefeated = state.combat.monsters.every((m) => m.currentHP <= 0)
      if (allDefeated && !action.spreadGenre && !state.combat.selectedSpreadGenre) {
        return illegal('Choose an element to radiate before claiming victory')
      }
      return ok
    }

    case 'END_TURN': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const notRedist = blockedByRedistribution()
      if (!notRedist.ok) return notRedist
      if (state.phase !== 'main') return illegal('Turns only advance during the main phase')
      if (state.combat.isActive) return illegal('Finish combat before ending the turn')
      if (state.studio.playerId) return illegal('Close the Studio before ending the turn')
      return ok
    }

    case 'OPEN_STUDIO': {
      const gate = requireCurrentTurn()
      if (gate.ok === false) return gate
      const notRedist = blockedByRedistribution()
      if (!notRedist.ok) return notRedist
      if (state.phase !== 'main') return illegal('Studio only opens during the main phase')
      if (state.combat.isActive) return illegal('Finish combat before opening the Studio')
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
        return illegal('No such element chip')
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
        return illegal('No such element chip')
      }
      if (player.exp < newD4Cost()) return illegal('Not enough EXP')
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
        return illegal('No such element chip')
      }
      const die = player.songs
        .flatMap((s) => s.slots)
        .map((slot) => slot.dice)
        .find((d) => d?.id === action.diceId)
      if (!die) return illegal('You do not own that die')
      if (die.genre !== state.elementOffers[action.offerIndex]) {
        return illegal('Die element does not match the chip')
      }
      const cost = getUpgradeCost(die.type)
      if (cost === null) return illegal('Die is already at max tier')
      if (player.exp < cost) return illegal('Not enough EXP')
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
      return ok
    }

    case 'BUY_INSPIRATION': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const studioGate = requireOpenStudio()
      if (studioGate.ok === false) return studioGate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const cost = getInspirationCost(player.inspirationBoughtThisTurn)
      if (player.exp < cost) return illegal('Not enough EXP')
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
      if (!state.showdownUndo) return illegal('Nothing to reroll')
      const performer = state.players.find((p) => p.id === performerId)
      if (!performer || performer.inspiration < inspirationSpend()) return illegal('Not enough Inspiration')
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
      const notRedist = blockedByRedistribution()
      if (!notRedist.ok) return notRedist
      if (state.phase !== 'main') return illegal('Turns only advance during the main phase')
      if (action.targetPlayerId !== currentPlayerId(state)) {
        return illegal('Can only skip the current player')
      }
      return ok
    }

    case 'PLACE_REDISTRIBUTION_CHIP': {
      const placerId = currentPlacerId()
      if (!placerId) return illegal('Not placing chips right now')
      if (isSeat && seatPlayerId !== placerId) return forbidden('Not your chips to place')
      if (state.redistribution.chipsToPlace.length === 0) return illegal('No chips left to place')
      const space = state.spaces.find((s) => s.id === action.spaceId)
      if (!space) return illegal('Unknown space')
      // A bard spreads their own hand out — one chip per tile
      if (state.redistribution.placedSpaceIds.includes(action.spaceId)) {
        return illegal('You already placed a chip on that tile')
      }
      if (space.genreTags.length >= maxGenreTags()) return illegal('That tile is full')
      return ok
    }

    // Playtest tooling. Restricted to the host seat: it can rewrite any value,
    // so a non-host seat must never be able to reach it in an online game.
    case 'DEBUG_PATCH': {
      if (!isHost) return forbidden('Only the host can use debug mode')
      if (!action.patch || typeof action.patch !== 'object') return illegal('Missing debug patch')
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
