import { EngineState } from './state.js'
import { GameAction, ActorSeat } from './actions.js'
import { getPlayableSongs } from '../game-logic/showdown/showdown.js'
import { areSpacesConnected } from '../game-logic/board/graphBuilder.js'
import { NEW_D4_COST, getUpgradeCost, getInspirationCost, INSPIRATION_SPEND } from '../data/draftCards.js'

export const MAX_SONGS_PER_COMBAT = 3
export const MAX_MOVES_PER_TURN = 2
export const MAX_FIGHTS_PER_TURN = 1

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
      if (state.phase !== 'main') return illegal('Movement only during the main phase')
      if (state.combat.isActive) return illegal('Cannot move during combat')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return illegal('Unknown player')
      if (player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.movesThisTurn >= MAX_MOVES_PER_TURN) return illegal('No moves left this turn')
      if (action.toSpaceId === player.position) return illegal('Already on that space')
      if (!state.spaces.some((s) => s.id === action.toSpaceId)) return illegal('Unknown space')
      if (action.inspirationTravel) {
        if (player.inspiration < INSPIRATION_SPEND) return illegal('Not enough Inspiration to travel')
      } else if (!areSpacesConnected(player.position, action.toSpaceId, state.spaces)) {
        return illegal('Spaces are not connected')
      }
      return ok
    }

    case 'START_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Combat only during the main phase')
      if (state.combat.isActive) return illegal('Combat already active')
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player || player.id !== currentPlayerId(state)) return illegal('Not this player\'s turn')
      if (player.fightsThisTurn >= MAX_FIGHTS_PER_TURN) return illegal('No fights left this turn')
      const space = state.spaces.find((s) => s.id === player.position)
      if (!space || space.monsters.length === 0) return illegal('No monsters here')
      return ok
    }

    case 'PLAY_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      if (state.combat.songsUsed.length >= MAX_SONGS_PER_COMBAT) return illegal('Song limit reached')
      if (state.combat.songsUsed.some((su) => su.songId === action.songId)) {
        return illegal('Song already played this combat')
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
      return ok
    }

    case 'REROLL_SONG': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      if (!state.combat.undoSnapshot || !state.combat.lastPlayedSongId) {
        return illegal('Nothing to reroll')
      }
      const fighter = state.players.find((p) => p.id === state.combat.playerId)
      if (!fighter || fighter.inspiration < INSPIRATION_SPEND) return illegal('Not enough Inspiration')
      if (state.combat.monsters.every((m) => m.currentHP <= 0)) return illegal('All monsters defeated')
      return ok
    }

    case 'END_COMBAT': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (!state.combat.isActive) return illegal('No active combat')
      const allDefeated = state.combat.monsters.every((m) => m.currentHP <= 0)
      if (allDefeated && !action.spreadGenre) {
        return illegal('Choose an element to radiate before claiming victory')
      }
      return ok
    }

    case 'END_TURN': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      if (state.phase !== 'main') return illegal('Turns only advance during the main phase')
      if (state.combat.isActive) return illegal('Finish combat before ending the turn')
      return ok
    }

    case 'BUY_DIE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      if (action.offerIndex < 0 || action.offerIndex >= state.elementOffers.length) {
        return illegal('No such element chip')
      }
      if (player.exp < NEW_D4_COST) return illegal('Not enough EXP')
      return ok
    }

    case 'UPGRADE_DIE': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
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

    case 'BUY_NAME': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const card = state.namePool.find((c) => c.id === action.cardId)
      if (!card) return illegal('No such name card')
      if (player.exp < card.cost) return illegal('Not enough EXP')
      return ok
    }

    case 'REFRESH_ELEMENT_OFFERS':
    case 'REFRESH_NAME_POOL': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player || player.inspiration < INSPIRATION_SPEND) return illegal('Not enough Inspiration')
      return ok
    }

    case 'SLOT_NAME_REWARD':
    case 'SLOT_DIE_REWARD': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
      const player = state.players[state.currentTurnPlayerIndex]
      if (!player) return illegal('No current player')
      const rewards = state.pendingRewards[player.id] ?? []
      const reward = rewards.find((r) => r.id === action.rewardId)
      if (!reward) return illegal('No such reward')
      const song = player.songs.find((s) => s.id === action.songId)
      if (!song) return illegal('No such song')
      if (action.type === 'SLOT_NAME_REWARD' && reward.kind !== 'name') {
        return illegal('Reward is not a song name')
      }
      if (action.type === 'SLOT_DIE_REWARD') {
        if (reward.kind !== 'die') return illegal('Reward is not a die')
        if (action.slotIndex < 0 || action.slotIndex >= song.slots.length) {
          return illegal('No such slot')
        }
      }
      return ok
    }

    case 'BUY_INSPIRATION': {
      const gate = requireCurrentTurn()
      if (!gate.ok) return gate
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
      if (!performer || performer.inspiration < INSPIRATION_SPEND) return illegal('Not enough Inspiration')
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
  }
}
