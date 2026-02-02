import { useState } from 'react'
import { useGameStore, selectCurrentPlayer, selectCollectiveFame } from '@/store'
import { FAME_THRESHOLDS } from '@/data/startingData'
import { DraftShop } from '../DraftShop'

export function PlayerPanel() {
  const [showDraftShop, setShowDraftShop] = useState(false)
  const players = useGameStore((state) => state.players)
  const spaces = useGameStore((state) => state.spaces)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const collectiveFame = useGameStore(selectCollectiveFame)
  const phase = useGameStore((state) => state.phase)
  const currentRound = useGameStore((state) => state.currentRound)
  const nextTurn = useGameStore((state) => state.nextTurn)
  const nextRound = useGameStore((state) => state.nextRound)
  const addGenreTags = useGameStore((state) => state.addGenreTags)
  const currentTurnPlayerIndex = useGameStore((state) => state.currentTurnPlayerIndex)
  const resetPlayerMoves = useGameStore((state) => state.resetPlayerMoves)
  const resetPlayerFights = useGameStore((state) => state.resetPlayerFights)
  const incrementPlayerFights = useGameStore((state) => state.incrementPlayerFights)
  const startCombat = useGameStore((state) => state.startCombat)

  if (!currentPlayer) return null

  const movesRemaining = 2 - currentPlayer.movesThisTurn
  const fightsRemaining = 2 - currentPlayer.fightsThisTurn
  const currentSpace = spaces.find((s) => s.id === currentPlayer.position)
  const hasMonsters = currentSpace && currentSpace.monsters.length > 0
  const canFight = hasMonsters && fightsRemaining > 0

  const handleEndTurn = () => {
    // Reset moves and fights for current player
    resetPlayerMoves(currentPlayer.id)
    resetPlayerFights(currentPlayer.id)

    if (currentTurnPlayerIndex >= players.length - 1) {
      // End of round - reset moves and fights for all players
      players.forEach((p) => {
        resetPlayerMoves(p.id)
        resetPlayerFights(p.id)
      })
      nextRound()
      addGenreTags()
    } else {
      // Next player's turn
      nextTurn()
    }
  }

  const handleFight = () => {
    if (currentSpace && canFight) {
      incrementPlayerFights(currentPlayer.id)
      startCombat(currentPlayer.id, currentSpace.id, currentSpace.monsters)
    }
  }

  return (
    <div className="card p-6">
      {/* Game info */}
      <div className="mb-6 text-center">
        <h2 className="font-medieval text-2xl text-wood-600 mb-2">
          Round {currentRound} - {phase.toUpperCase()} Phase
        </h2>
        <div className="text-lg">
          <strong>Collective Fame:</strong> {collectiveFame} / {FAME_THRESHOLDS.undergroundScene}
        </div>
      </div>

      {/* Current player */}
      <div className="mb-6 p-4 bg-wood-100 rounded-lg">
        <h3 className="font-medieval text-xl mb-3">Current Turn</h3>
        <div className="flex items-center gap-4 mb-3">
          <div
            className="w-16 h-16 rounded-full border-4 border-wood-600 flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: currentPlayer.color }}
          >
            {currentPlayer.name.charAt(0)}
          </div>
          <div>
            <div className="text-xl font-bold">{currentPlayer.name}</div>
            <div className="text-sm">
              Fame: {currentPlayer.fame} | EXP: {currentPlayer.exp} | Monsters: {currentPlayer.monstersDefeated}
            </div>
          </div>
        </div>

        {/* Action trackers */}
        <div className="bg-parchment-200 p-2 rounded-lg space-y-2">
          {/* Movement tracker */}
          <div>
            <div className="text-xs font-bold text-wood-600 mb-1">
              Moves Remaining:
            </div>
            <div className="flex gap-2">
              {[1, 2].map((move) => (
                <div
                  key={move}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    move <= movesRemaining
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  {move}
                </div>
              ))}
            </div>
          </div>

          {/* Fight tracker */}
          <div>
            <div className="text-xs font-bold text-wood-600 mb-1">
              Fights Remaining:
            </div>
            <div className="flex gap-2">
              {[1, 2].map((fight) => (
                <div
                  key={fight}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                    fight <= fightsRemaining
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-300 text-gray-500'
                  }`}
                >
                  ⚔️
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All players */}
      <div className="mb-6">
        <h3 className="font-medieval text-lg mb-2">All Players</h3>
        <div className="space-y-2">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg ${
                player.id === currentPlayer.id
                  ? 'bg-green-100 border-2 border-green-500'
                  : 'bg-parchment-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full border-2 border-wood-600 flex items-center justify-center font-bold"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{player.name}</div>
                  <div className="text-xs">
                    Fame: {player.fame} | EXP: {player.exp} | Songs: {player.songs.length}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Fight button - only show if monsters on current space and fights remaining */}
        {hasMonsters && (
          <button
            onClick={handleFight}
            disabled={!canFight}
            className="btn-primary w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⚔️ Fight {currentSpace.monsters.length} Monster{currentSpace.monsters.length > 1 ? 's' : ''}
            {!canFight && ' (No fights left)'}
          </button>
        )}

        <button
          onClick={() => setShowDraftShop(true)}
          className="btn-secondary w-full"
        >
          🎪 Open Draft Shop ({currentPlayer.exp} EXP)
        </button>
        <button onClick={handleEndTurn} className="btn-primary w-full">
          End Turn
        </button>
      </div>

      {/* Draft shop modal */}
      {showDraftShop && (
        <DraftShop
          playerId={currentPlayer.id}
          onClose={() => setShowDraftShop(false)}
        />
      )}
    </div>
  )
}
