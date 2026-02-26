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
  const usePlayerFight = useGameStore((state) => state.usePlayerFight)
  const startCombat = useGameStore((state) => state.startCombat)

  if (!currentPlayer) return null

  const movesRemaining = 2 - currentPlayer.movesThisTurn
  const fightsRemaining = 1 - currentPlayer.fightsThisTurn
  const currentSpace = spaces.find((s) => s.id === currentPlayer.position)
  const hasMonsters = currentSpace && currentSpace.monsters.length > 0
  const canFight = hasMonsters && fightsRemaining > 0
  const currentThreshold = phase === 'main'
    ? FAME_THRESHOLDS.undergroundScene
    : FAME_THRESHOLDS.finalBoss
  const fameProgress = Math.min((collectiveFame / currentThreshold) * 100, 100)

  const handleEndTurn = () => {
    resetPlayerMoves(currentPlayer.id)
    resetPlayerFights(currentPlayer.id)

    if (currentTurnPlayerIndex >= players.length - 1) {
      players.forEach((p) => {
        resetPlayerMoves(p.id)
        resetPlayerFights(p.id)
      })
      // Add 1 genre tag to all spaces once per round
      addGenreTags()
      nextRound()
    } else {
      nextTurn()
    }
  }

  const handleFight = () => {
    if (currentSpace && canFight) {
      usePlayerFight(currentPlayer.id)
      startCombat(currentPlayer.id, currentSpace.id, currentSpace.monsters)
    }
  }

  return (
    <div className="card-ornate p-5 h-full flex flex-col">
      {/* Game info header */}
      <div className="text-center mb-4">
        <div className="font-display text-xl text-gold-400 mb-1">
          Round {currentRound}
        </div>
        <div className="text-sm text-parchment-400 uppercase tracking-widest font-medieval">
          {phase} Phase
        </div>

        {/* Fame progress bar */}
        {(phase === 'main' || phase === 'underground') && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-parchment-400 mb-1">
              <span>{phase === 'main' ? 'Fame to Underground' : 'Fame to Final Boss'}</span>
              <span className="text-gold-400 font-bold">{collectiveFame} / {currentThreshold}</span>
            </div>
            <div className="hp-bar h-2">
              <div
                className="hp-fill rounded-full"
                style={{
                  width: `${fameProgress}%`,
                  background: 'linear-gradient(90deg, #b8922e, #f0d78c)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="divider-ornate" />

      {/* Current player */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="player-avatar w-12 h-12 text-xl"
            style={{ backgroundColor: currentPlayer.color }}
          >
            {currentPlayer.name.charAt(0)}
          </div>
          <div>
            <div className="font-medieval text-lg font-bold text-gold-300">{currentPlayer.name}</div>
            <div className="text-sm text-parchment-400 flex gap-3 mt-0.5">
              <span>Fame: <span className="text-gold-400 font-bold">{currentPlayer.fame}</span></span>
              <span>EXP: <span className="text-parchment-200 font-bold">{currentPlayer.exp}</span></span>
            </div>
          </div>
        </div>

        {/* Move and Action trackers */}
        <div className="grid grid-cols-2 gap-2">
          {/* Movement tracker */}
          <div className="rounded-lg p-2" style={{ background: 'rgba(61, 48, 32, 0.4)', border: '1px solid rgba(212, 168, 83, 0.1)' }}>
            <div className="text-xs font-medieval text-parchment-400 mb-1.5 text-center">
              Moves
            </div>
            <div className="flex gap-1.5 justify-center">
              {[1, 2].map((move) => (
                <div
                  key={move}
                  className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs transition-all duration-200"
                  style={{
                    background: move <= movesRemaining
                      ? 'linear-gradient(135deg, #3d8c40, #2d6e30)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: move <= movesRemaining
                      ? '1px solid rgba(100, 220, 100, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    color: move <= movesRemaining ? '#d4ffd6' : 'rgba(255,255,255,0.15)',
                    boxShadow: move <= movesRemaining ? '0 0 8px rgba(100, 220, 100, 0.15)' : 'none',
                  }}
                >
                  {move}
                </div>
              ))}
            </div>
          </div>

          {/* Fight tracker */}
          <div className="rounded-lg p-2" style={{ background: 'rgba(61, 48, 32, 0.4)', border: '1px solid rgba(212, 168, 83, 0.1)' }}>
            <div className="text-xs font-medieval text-parchment-400 mb-1.5 text-center">
              Fights
            </div>
            <div className="flex gap-1.5 justify-center">
              {[1].map((fight) => (
                <div
                  key={fight}
                  className="w-8 h-8 rounded flex items-center justify-center font-bold text-xs transition-all duration-200"
                  style={{
                    background: fight <= fightsRemaining
                      ? 'linear-gradient(135deg, #c43030, #8c2020)'
                      : 'rgba(255, 255, 255, 0.05)',
                    border: fight <= fightsRemaining
                      ? '1px solid rgba(232, 80, 80, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    color: fight <= fightsRemaining ? '#ffd4d4' : 'rgba(255,255,255,0.15)',
                    boxShadow: fight <= fightsRemaining ? '0 0 8px rgba(232, 80, 80, 0.15)' : 'none',
                  }}
                >
                  &#x2694;
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="divider-ornate" />

      {/* All players */}
      <div className="flex-1 min-h-0 overflow-auto mb-4">
        <div className="text-xs font-medieval text-parchment-400 uppercase tracking-wider mb-2">
          All Players
        </div>
        <div className="space-y-2">
          {players.map((player) => {
            const playerSpace = spaces.find((s) => s.id === player.position)
            const playerFameProgress = Math.min((player.fame / currentThreshold) * 100, 100)
            const diceCount = player.songs.reduce((n, s) => n + s.slots.filter((sl) => sl.dice).length, 0)
            const isCurrentTurn = player.id === currentPlayer.id
            return (
              <div
                key={player.id}
                className="p-2.5 rounded-lg transition-all duration-150"
                style={{
                  background: isCurrentTurn
                    ? 'rgba(100, 220, 100, 0.08)'
                    : 'rgba(61, 48, 32, 0.3)',
                  border: isCurrentTurn
                    ? '1px solid rgba(100, 220, 100, 0.25)'
                    : '1px solid rgba(212, 168, 83, 0.08)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="player-avatar w-8 h-8 text-xs flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="font-bold text-sm text-parchment-200 truncate">{player.name}</div>
                      {isCurrentTurn && (
                        <span className="text-xs font-medieval text-green-400 shrink-0">▶ Turn</span>
                      )}
                    </div>
                    <div className="text-xs text-parchment-500 truncate">
                      {playerSpace?.name ?? '—'}
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-2 text-xs mb-1.5">
                  <span className="text-gold-400 font-bold">⭐ {player.fame}</span>
                  <span className="text-parchment-400">{player.exp} EXP</span>
                  <span className="text-parchment-500">{player.songs.length} songs · {diceCount} dice</span>
                </div>

                {/* Mini fame progress */}
                <div className="hp-bar h-1">
                  <div
                    className="hp-fill rounded-full"
                    style={{
                      width: `${playerFameProgress}%`,
                      background: 'linear-gradient(90deg, #b8922e, #f0d78c)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        {hasMonsters && (
          <button
            onClick={handleFight}
            disabled={!canFight}
            className="w-full py-2.5 px-4 font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canFight
                ? 'linear-gradient(135deg, #c43030, #8c2020)'
                : 'rgba(100, 30, 30, 0.3)',
              border: '1px solid rgba(232, 80, 80, 0.4)',
              color: '#ffd4d4',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)',
              boxShadow: canFight ? '0 0 12px rgba(232, 32, 64, 0.2)' : 'none',
            }}
          >
            &#x2694; Fight {currentSpace!.monsters.length} Monster{currentSpace!.monsters.length > 1 ? 's' : ''}
            {!canFight && ' (No fights left)'}
          </button>
        )}

        <button
          onClick={() => setShowDraftShop(true)}
          className="btn-secondary w-full"
        >
          Studio ({currentPlayer.exp} EXP)
        </button>
        <button onClick={handleEndTurn} className="btn-primary w-full">
          End Turn
        </button>
      </div>

      {/* Studio modal */}
      {showDraftShop && (
        <DraftShop
          playerId={currentPlayer.id}
          onClose={() => setShowDraftShop(false)}
        />
      )}
    </div>
  )
}
