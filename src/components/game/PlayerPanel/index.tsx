import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { DraftShop } from '../DraftShop'
import { GenreBadge } from '@/components/ui/GenreBadge'
import { DiceShape } from '@/components/ui/DiceShape'
import { getMaxValue } from '@/game-logic/dice/roller'
import { describeTrackEffect } from '@/data/trackEffects'

export function PlayerPanel() {
  const [showDraftShop, setShowDraftShop] = useState(false)
  const [hoveredSong, setHoveredSong] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const players = useGameStore((state) => state.players)
  const spaces = useGameStore((state) => state.spaces)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const nextTurn = useGameStore((state) => state.nextTurn)
  const nextRound = useGameStore((state) => state.nextRound)
  const addGenreTags = useGameStore((state) => state.addGenreTags)
  const currentTurnPlayerIndex = useGameStore((state) => state.currentTurnPlayerIndex)
  const resetPlayerMoves = useGameStore((state) => state.resetPlayerMoves)
  const resetPlayerFights = useGameStore((state) => state.resetPlayerFights)
  const usePlayerFight = useGameStore((state) => state.usePlayerFight)
  const startCombat = useGameStore((state) => state.startCombat)
  const applyPendingPhase = useGameStore((state) => state.applyPendingPhase)
  const refillShopSlots = useGameStore((state) => state.refillShopSlots)
  const resetPlayerInspirationPurchases = useGameStore((state) => state.resetPlayerInspirationPurchases)

  if (!currentPlayer) return null

  const currentSpace = spaces.find((s) => s.id === currentPlayer.position)
  const hasMonsters = currentSpace && currentSpace.monsters.length > 0
  const canFight = hasMonsters && currentPlayer.fightsThisTurn < 1
  const handleEndTurn = () => {
    resetPlayerMoves(currentPlayer.id)
    resetPlayerFights(currentPlayer.id)
    // Inspiration buy cost escalates within a turn, then resets
    resetPlayerInspirationPurchases(currentPlayer.id)

    if (currentTurnPlayerIndex >= players.length - 1) {
      players.forEach((p) => {
        resetPlayerMoves(p.id)
        resetPlayerFights(p.id)
      })
      // Add 1 genre tag to all spaces once per round
      addGenreTags()
      // Apply any pending phase transition now that all players have had equal turns
      applyPendingPhase()
      nextRound()
    } else {
      nextTurn()
    }

    // Start the next player's turn with a full shop (fresh names, topped-up chips)
    refillShopSlots()
  }

  const handleFight = () => {
    if (currentSpace && canFight) {
      usePlayerFight(currentPlayer.id)
      startCombat(currentPlayer.id, currentSpace.id, currentSpace.monsters)
    }
  }

  return (
    <div className="card-ornate p-4 sm:p-5 lg:h-full flex flex-col">
      {/* All players */}
      <div className="flex gap-2">
        {players.map((player) => {
          const isCurrentTurn = player.id === currentPlayer.id
          return (
            <div
              key={player.id}
              className="p-2 rounded-lg transition-all duration-150 flex-1 min-w-0"
              style={{
                background: isCurrentTurn
                  ? 'rgba(100, 220, 100, 0.08)'
                  : 'rgba(61, 48, 32, 0.3)',
                border: isCurrentTurn
                  ? '1px solid rgba(100, 220, 100, 0.25)'
                  : '1px solid rgba(212, 168, 83, 0.08)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="player-avatar w-5 h-5 text-[9px] flex-shrink-0"
                  style={{ backgroundColor: player.color }}
                >
                  {player.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 truncate font-bold text-[10px] text-parchment-200">{player.name}</div>
              </div>
              <div className="text-[10px] text-parchment-400 flex gap-1.5 mt-1">
                <span title="Fame">&#x2B50;<span className="text-gold-400 font-bold ml-0.5">{player.fame}</span></span>
                <span title="EXP">&#x1F4D6;<span className="text-parchment-200 font-bold ml-0.5">{player.exp}</span></span>
                <span title="Inspiration">&#x2728;<span className="font-bold ml-0.5" style={{ color: '#d9c2ff' }}>{player.inspiration}</span></span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="divider-ornate mt-5" />

      {/* Current player */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div
            className="player-avatar w-12 h-12 text-xl"
            style={{ backgroundColor: currentPlayer.color }}
          >
            {currentPlayer.name.charAt(0)}
          </div>
          <div>
            <div className="font-medieval text-lg font-bold text-gold-300">{currentPlayer.name}</div>
            <div className="text-sm text-parchment-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              <span>Fame: <span className="text-gold-400 font-bold">{currentPlayer.fame}</span></span>
              <span>EXP: <span className="text-parchment-200 font-bold">{currentPlayer.exp}</span></span>
              <span title="Inspiration — spend to reroll a song, travel anywhere, or refresh the shop">
                &#x2728; <span className="font-bold" style={{ color: '#d9c2ff' }}>{currentPlayer.inspiration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Songs — right above the Moves/Fights trackers */}
        <div className="mb-3">
          <div className="flex flex-wrap justify-between gap-2">
            {currentPlayer.songs.map((song) => (
              <div
                key={song.id}
                className="rounded-lg p-1.5 flex-1 min-w-0 transition-all duration-150 hover:bg-tavern-600"
                style={{
                  background: 'rgba(61, 48, 32, 0.5)',
                  border: '1px solid rgba(212, 168, 83, 0.12)',
                }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  setTooltipPos({ x: rect.left, y: rect.bottom + 8 })
                  setHoveredSong(song.id)
                }}
                onMouseLeave={() => setHoveredSong(null)}
              >
                <div className="h-3.5 text-[10px] font-bold text-parchment-400 mb-0.5 truncate">
                  {song.name}
                </div>
                <div className="flex gap-0.5">
                  {song.slots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex-1 aspect-square rounded flex flex-col items-center justify-center text-[8px]"
                      style={{
                        background: slot.dice
                          ? 'rgba(212, 168, 83, 0.15)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: slot.dice
                          ? '1px solid rgba(212, 168, 83, 0.25)'
                          : '1px dashed rgba(212, 168, 83, 0.1)',
                      }}
                    >
                      {slot.dice ? (
                        <>
                          <div className="text-gold-400 text-[14px] leading-none">
                            <DiceShape type={slot.dice.type} />
                          </div>
                          <div className="font-bold text-[7px] text-parchment-300">
                            {slot.dice.genre}
                          </div>
                        </>
                      ) : (
                        <div className="text-parchment-500/30 text-[8px]">-</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Floating song tooltip */}
          {hoveredSong && currentPlayer.songs.find((s) => s.id === hoveredSong) && (
            <div
              className="fixed z-[100] p-3 rounded-lg shadow-2xl w-64 pointer-events-none animate-fade-in"
              style={{
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                background: 'linear-gradient(135deg, #2a2118, #1a1410)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
              }}
            >
              {(() => {
                const song = currentPlayer.songs.find((s) => s.id === hoveredSong)!
                return (
                  <>
                    <div className="font-medieval font-bold mb-2 text-gold-400">{song.name}</div>
                    <div className="space-y-2 text-sm">
                      {song.slots.map((slot, idx) => (
                        <div
                          key={`slot-${idx}`}
                          className="pb-1"
                          style={{ borderBottom: '1px solid rgba(212, 168, 83, 0.12)' }}
                        >
                          <div className="font-bold text-parchment-400 text-xs">Slot {idx + 1}</div>
                          {slot.dice ? (
                            <div className="mt-0.5">
                              <div className="flex items-center gap-1">
                                <span className="text-parchment-300 text-xs">{slot.dice.type}</span>
                                <GenreBadge genre={slot.dice.genre} className="text-[9px] px-1 py-0" />
                              </div>
                              <div className="text-xs text-parchment-400">
                                Roll: 1-{getMaxValue(slot.dice.type)} (2x on max)
                              </div>
                            </div>
                          ) : (
                            <div className="text-parchment-500 text-xs">Empty slot</div>
                          )}
                        </div>
                      ))}
                      {song.effect && (
                        <div className="pt-1">
                          <div className="font-bold text-parchment-400 text-xs mb-1">Effect</div>
                          <div className="text-classical text-xs">
                            &#x2728; {describeTrackEffect(song.effect)}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

      </div>

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        {hasMonsters && (
          <button
            onClick={handleFight}
            disabled={!canFight}
            className={`w-full py-2.5 px-4 font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-110 hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 ${canFight ? 'animate-danger-pulse' : ''}`}
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
            <span style={{ fontSize: '1.2em' }}>&#x2694;</span> Fight {currentSpace!.monsters.length} Monster{currentSpace!.monsters.length > 1 ? 's' : ''}
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
