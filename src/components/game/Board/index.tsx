import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'
import realmMap from '@/assets/board/realm-map.png'

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)
  const spendInspiration = useGameStore((state) => state.spendInspiration)

  const [hoveredSpaceId, setHoveredSpaceId] = useState<number | null>(null)
  const [travelMode, setTravelMode] = useState(false)

  if (!currentPlayer) return null

  // Allow moves if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  // Travel spends 1 Inspiration and 1 movement, so it needs a move available
  const canTravel = currentPlayer.inspiration > 0 && canMove
  const hoveredSpace = hoveredSpaceId !== null ? spaces.find((s) => s.id === hoveredSpaceId) : null

  const handleSpaceClick = (spaceId: number) => {
    // Inspiration travel: hop to any space (not the current one) for 1 Inspiration + 1 move
    if (travelMode) {
      if (spaceId === currentPlayer.position || !canMove) return
      if (!spendInspiration(currentPlayer.id, 1)) return
      // movePlayer consumes a movement (and sets position, ignoring adjacency)
      movePlayer(currentPlayer.id, spaceId)
      spawnMonstersAtSpace(spaceId)
      setTravelMode(false)
      return
    }

    if (!canMove) return

    const isValidMove = validMoves.some((s) => s.id === spaceId)
    if (!isValidMove) return

    // Move player to space (consumes a move, not an action)
    movePlayer(currentPlayer.id, spaceId)

    // Spawn monsters (but don't auto-trigger combat)
    spawnMonstersAtSpace(spaceId)
  }

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        // Warm coffee-brown matching the map image's torn-paper border texture
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(212, 168, 83, 0.06) 0%, transparent 45%),
          radial-gradient(ellipse at 70% 80%, rgba(139, 111, 71, 0.07) 0%, transparent 45%),
          linear-gradient(160deg, #3b3125 0%, #322817 50%, #3b3125 100%)
        `,
      }}
    >
      {/* Parchment realm map background */}
      <img
        src={realmMap}
        alt=""
        aria-hidden="true"
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain pointer-events-none"
      />

      {/* Subtle dot-grid map texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(212, 168, 83, 0.08) 0.8px, transparent 0.8px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Inspiration travel toggle */}
      {(canTravel || travelMode) && (
        <button
          onClick={() => setTravelMode((m) => !m)}
          disabled={!canTravel && !travelMode}
          className="absolute top-3 right-3 z-30 text-xs sm:text-sm font-medieval font-bold rounded-lg px-3 py-1.5 transition-all duration-150 disabled:opacity-40 hover:enabled:-translate-y-0.5"
          style={{
            background: travelMode ? 'rgba(176, 124, 255, 0.28)' : 'rgba(176, 124, 255, 0.12)',
            border: `1px solid rgba(176, 124, 255, ${travelMode ? 0.8 : 0.45})`,
            color: '#e6d9ff',
            boxShadow: travelMode ? '0 0 14px rgba(176, 124, 255, 0.35)' : undefined,
          }}
          title="Spend 1 Inspiration and 1 move to travel to any space"
        >
          {travelMode ? '✖ Cancel Travel' : `✨ Travel (1)`}
        </button>
      )}

      <div className="relative w-full p-2 sm:p-6 lg:p-8 max-w-[calc(50dvh_-_6rem)] lg:max-w-[calc(100dvh_-_5rem)]">
        {/* Map title decoration — hidden on mobile to save vertical space */}
        <div className="hidden sm:flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-5 pointer-events-none">
          <div className="h-px w-8 sm:w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.3))' }} />
          <div className="font-display text-base sm:text-xl text-gold-500 opacity-45 tracking-[0.2em] sm:tracking-[0.25em] text-center select-none">
            The Bardic Realm
          </div>
          <div className="h-px w-8 sm:w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
        </div>

        {/* 4x4 tile grid — space ids are row-major grid positions */}
        <div
          className="grid grid-cols-4 gap-2 sm:gap-3"
          onMouseLeave={() => setHoveredSpaceId(null)}
        >
          {spaces.map((space) => (
            <div
              key={space.id}
              className="animate-tile-in"
              style={{ animationDelay: `${space.id * 35}ms` }}
              // Hover handled on the wrapper: disabled tile buttons swallow mouse events
              onMouseEnter={() => setHoveredSpaceId(space.id)}
              onMouseLeave={() => setHoveredSpaceId(null)}
            >
              <BoardSpaceComponent
                space={space}
                players={players}
                isCurrentPlayer={currentPlayer.position === space.id}
                canMoveTo={validMoves.some((s) => s.id === space.id)}
                isTravelTarget={travelMode && space.id !== currentPlayer.position}
                isLinkedToHovered={
                  hoveredSpace !== null &&
                  hoveredSpace !== undefined &&
                  hoveredSpace.connections.includes(space.id)
                }
                onClick={() => handleSpaceClick(space.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
