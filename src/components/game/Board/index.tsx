import { useState } from 'react'
import { useGameStore, selectCurrentPlayer, selectCanAct } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'
import realmMap from '@/imports/board-background.jpg'
import realmMapMobile from '@/imports/board-background-mobile.jpg'
import { Footprints, Map, Sparkles } from 'lucide-react'

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)

  const [hoveredSpaceId, setHoveredSpaceId] = useState<number | null>(null)
  const [travelMode, setTravelMode] = useState(false)

  if (!currentPlayer) return null

  // Allow moves if it's this client's turn and moves remain
  const canMove = canAct && currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  // Travel spends 1 Inspiration and 1 movement, so it needs a move available
  const canTravel = currentPlayer.inspiration > 0 && canMove
  const hoveredSpace = hoveredSpaceId !== null ? spaces.find((s) => s.id === hoveredSpaceId) : null

  const handleSpaceClick = (spaceId: number) => {
    // Inspiration travel: hop to any space (not the current one) for 1 Inspiration + 1 move
    if (travelMode) {
      if (spaceId === currentPlayer.position || !canMove) return
      if (currentPlayer.inspiration < 1) return
      dispatch({ type: 'MOVE', playerId: currentPlayer.id, toSpaceId: spaceId, inspirationTravel: true })
      setTravelMode(false)
      return
    }

    if (!canMove) return

    const isValidMove = validMoves.some((s) => s.id === spaceId)
    if (!isValidMove) return

    // Move to the space; the engine spawns monsters from its tags
    dispatch({ type: 'MOVE', playerId: currentPlayer.id, toSpaceId: spaceId, inspirationTravel: false })
  }

  return (
    <div className="tabletop-board relative w-full h-full overflow-hidden flex flex-col">
      {/* Parchment realm map background — a lighter 1x image loads on mobile */}
      <picture>
        <source media="(max-width: 640px)" srcSet={realmMapMobile} />
        <img
          src={realmMap}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover pointer-events-none opacity-20 mix-blend-luminosity"
        />
      </picture>

      <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="board-title-icon">
            <Map size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-medieval font-bold text-sm sm:text-base text-parchment-100">The Resonant Realm</div>
            <div className="flex items-center gap-1.5 text-[10px] text-parchment-500">
              <Footprints size={11} aria-hidden="true" />
              {Math.max(0, 2 - currentPlayer.movesThisTurn)} moves remaining
            </div>
          </div>
        </div>

        {(canTravel || travelMode) && (
          <button
            onClick={() => setTravelMode((m) => !m)}
            disabled={!canTravel && !travelMode}
            className={`travel-token ${travelMode ? 'travel-token-active' : ''}`}
            title="Spend 1 Inspiration and 1 move to travel to any space"
          >
            <Sparkles size={14} aria-hidden="true" />
            <span>{travelMode ? 'Cancel' : 'Travel'}</span>
            {!travelMode && <strong>1</strong>}
          </button>
        )}
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center p-3 sm:p-5 lg:p-6">
        <div className="tile-tray w-full max-w-[min(100%,42rem)]">
          {/* 4x4 tile grid — space ids are row-major grid positions */}
          <div
            className="board-tile-grid grid grid-cols-4 gap-1.5 sm:gap-2.5"
            onMouseLeave={() => setHoveredSpaceId(null)}
          >
            {spaces.map((space) => (
              <div
                key={space.id}
                className="board-tile-slot animate-tile-in"
                style={{ animationDelay: `${space.id * 35}ms` }}
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

      <div className="relative z-20 flex items-center justify-center gap-4 px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-parchment-500">
        <span className="flex items-center gap-1.5"><i className="legend-swatch legend-swatch-current" /> Your tile</span>
        <span className="flex items-center gap-1.5"><i className="legend-swatch legend-swatch-move" /> In range</span>
        <span className="hidden sm:flex items-center gap-1.5"><i className="legend-swatch legend-swatch-danger" /> Threat</span>
      </div>
    </div>
  )
}
