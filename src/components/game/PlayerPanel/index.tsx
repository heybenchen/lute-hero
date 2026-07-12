import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { DraftShop } from '../DraftShop'
import { SongCard } from '../SongCard'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'

export function PlayerPanel() {
  const [showDraftShop, setShowDraftShop] = useState(false)
  const players = useGameStore((state) => state.players)
  const spaces = useGameStore((state) => state.spaces)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const nextTurn = useGameStore((state) => state.nextTurn)
  const nextRound = useGameStore((state) => state.nextRound)
  const addGenreTags = useGameStore((state) => state.addGenreTags)
  const currentTurnPlayerIndex = useGameStore((state) => state.currentTurnPlayerIndex)
  const resetPlayerMoves = useGameStore((state) => state.resetPlayerMoves)
  const resetPlayerFights = useGameStore((state) => state.resetPlayerFights)
  const consumePlayerFight = useGameStore((state) => state.consumePlayerFight)
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
      consumePlayerFight(currentPlayer.id)
      startCombat(currentPlayer.id, currentSpace.id, currentSpace.monsters)
    }
  }

  return (
    <div className="card-ornate p-4 sm:p-5 lg:h-full flex flex-col">
      {/* All players */}
      <div className="flex gap-2">
        {players.map((player) => {
          const isCurrentTurn = player.id === currentPlayer.id
          const genreColor = GENRE_THEME[player.starterGenre]?.color ?? player.color
          return (
            <div
              key={player.id}
              className={`rounded-lg transition-all duration-300 flex-1 min-w-0 overflow-hidden ${isCurrentTurn ? 'animate-active-glow -translate-y-0.5' : ''}`}
              style={{
                border: isCurrentTurn
                  ? '2px solid rgba(255, 215, 130, 0.9)'
                  : '1px solid rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                className="px-2 py-1 truncate font-bold text-[10px]"
                style={{ background: genreColor, color: readableTextColor(genreColor) }}
              >
                {player.name}
              </div>
              <div className="text-[10px] text-parchment-300 flex flex-nowrap whitespace-nowrap overflow-hidden gap-1.5 px-2 py-1" style={{ background: 'rgba(20, 16, 10, 0.85)' }}>
                <span title="Fame" className="flex-1 text-center">&#x2B50;<span className="text-gold-400 font-bold ml-0.5">{player.fame}</span></span>
                <span title="EXP" className="flex-1 text-center">&#x1F4D6;<span className="text-parchment-100 font-bold ml-0.5">{player.exp}</span></span>
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
            <div className="text-sm text-parchment-200 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
              <span title="Fame">&#x2B50; FAME: <span className="font-bold">{currentPlayer.fame}</span></span>
              <span title="EXP">&#x1F4D6; EXP: <span className="font-bold">{currentPlayer.exp}</span></span>
              <span title="Inspiration — spend to reroll a song, travel anywhere, or refresh the shop">
                &#x2728; INS: <span className="font-bold">{currentPlayer.inspiration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Songs — right above the Moves/Fights trackers */}
        <div className="mb-3">
          <div className="flex flex-row lg:flex-col gap-2">
            {currentPlayer.songs.map((song) => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        </div>

      </div>

      {/* Actions */}
      <div className="space-y-2 mt-auto">
        {hasMonsters && (
          <button
            onClick={handleFight}
            disabled={!canFight}
            className={`w-full py-1.5 px-2.5 text-sm sm:py-2.5 sm:px-4 sm:text-base font-medieval font-bold rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:brightness-110 hover:enabled:-translate-y-0.5 active:enabled:translate-y-0 ${canFight ? 'animate-danger-pulse' : ''}`}
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
            <span className="text-[1.2em]">&#x2694;</span> Fight {currentSpace!.monsters.length} Monster{currentSpace!.monsters.length > 1 ? 's' : ''}
            {!canFight && ' (No fights left)'}
          </button>
        )}

        <button
          onClick={() => setShowDraftShop(true)}
          className="btn-secondary w-full text-sm py-1.5 px-3 sm:text-base sm:py-2.5 sm:px-5"
        >
          Studio ({currentPlayer.exp} EXP)
        </button>
        <button
          onClick={handleEndTurn}
          disabled={canFight}
          title={canFight ? 'Fight the monster here before ending your turn' : undefined}
          className="btn-primary w-full text-sm py-1.5 px-3 sm:text-base sm:py-2.5 sm:px-5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
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
