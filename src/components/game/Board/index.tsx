import { useState } from 'react'
import { useGameStore, selectCurrentPlayer, selectCanAct } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getReachableMoves } from '@/game-logic/board/graphBuilder'
import { movesFor } from '@/engine/economy'
import realmMap from '@/imports/board-background.jpg'
import realmMapMobile from '@/imports/board-background-mobile.jpg'
import { Footprints, Map as MapIcon, Undo2 } from 'lucide-react'

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanAct)
  const moveTrail = useGameStore((state) => state.moveTrail)
  const combatActive = useGameStore((state) => state.isActive)
  const studioOpen = useGameStore((state) => state.studio.playerId !== null)

  const [hoveredSpaceId, setHoveredSpaceId] = useState<number | null>(null)
  // True while a multi-step trip is being taken, so a second click can't start another
  const [travelling, setTravelling] = useState(false)

  if (!currentPlayer) return null

  // Every space within the moves the bard has left (not just the next door ones)
  const movesLeft = Math.max(0, movesFor(currentPlayer) - currentPlayer.movesThisTurn)
  const canMove = canAct && movesLeft > 0 && !travelling
  const reachable = canMove ? getReachableMoves(currentPlayer.position, spaces, movesLeft) : []
  const reachableById = new Map(reachable.map((r) => [r.space.id, r]))

  // The last move this turn can be taken back (refunding the move) until the
  // bard starts a fight.
  const lastStep = moveTrail[moveTrail.length - 1]
  const canUndoMove = canAct && !combatActive && !studioOpen && lastStep?.playerId === currentPlayer.id
  const backtrackSpaceId = canUndoMove ? lastStep.fromSpaceId : null
  const undoMove = () => {
    if (!canUndoMove) return
    dispatch({ type: 'UNDO_MOVE', playerId: currentPlayer.id })
  }

  const hoveredSpace = hoveredSpaceId !== null ? spaces.find((s) => s.id === hoveredSpaceId) : null

  const handleSpaceClick = async (spaceId: number) => {
    // Stepping back onto the space you just came from takes the move back
    if (spaceId === backtrackSpaceId) {
      undoMove()
      return
    }

    if (!canMove) return

    const trip = reachableById.get(spaceId)
    if (!trip) return

    // One engine MOVE per step (each spends a move and spawns that space's monsters),
    // waiting for each to land; stop if one is refused.
    setTravelling(true)
    try {
      for (const toSpaceId of trip.path) {
        const result = await dispatch({ type: 'MOVE', playerId: currentPlayer.id, toSpaceId })
        if (!result.ok) break
      }
    } finally {
      setTravelling(false)
    }
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
          className="realm-map-drift absolute inset-0 h-full w-full object-cover pointer-events-none opacity-20 mix-blend-luminosity"
        />
      </picture>

      <div className="relative z-20 flex items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="board-title-icon">
            <MapIcon size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="font-medieval font-bold text-sm sm:text-base text-parchment-100">The Resonant Realm</div>
            <div className="flex items-center gap-1.5 text-[10px] text-parchment-500">
              <Footprints size={11} aria-hidden="true" />
              {movesLeft} move{movesLeft === 1 ? '' : 's'} remaining
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
        {canUndoMove && (
          <button
            onClick={undoMove}
            className="travel-token"
            title="Take back your last move"
          >
            <Undo2 size={14} aria-hidden="true" />
            <span>Undo move</span>
          </button>
        )}
        </div>
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center px-2 pb-2 sm:p-5 lg:p-6">
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
                  canMoveTo={space.id === backtrackSpaceId || reachableById.has(space.id)}
                  moveCost={space.id === backtrackSpaceId ? 1 : reachableById.get(space.id)?.steps ?? 1}
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

      <div className="relative z-20 hidden sm:flex items-center justify-center gap-4 px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-parchment-500">
        <span className="flex items-center gap-1.5"><i className="legend-swatch legend-swatch-current" /> Your tile</span>
        <span className="flex items-center gap-1.5"><i className="legend-swatch legend-swatch-move" /> In range (a number shows the moves it costs)</span>
      </div>
    </div>
  )
}
