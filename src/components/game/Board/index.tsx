import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'

// Static tile grid: rows of space IDs arranged to roughly mirror the board graph.
// null = empty grid cell.
const TILE_ROWS: (number | null)[][] = [
  [0, 1, 2, 6, 7],
  [13, 3, 4, 5, 8],
  [null, 12, 11, 10, 9],
]

// Corner flourish for the map frame
function Corner({ position }: { position: string }) {
  return (
    <div
      className={`absolute w-8 h-8 pointer-events-none ${position}`}
      style={{
        borderColor: 'rgba(212, 168, 83, 0.35)',
        borderStyle: 'solid',
        borderWidth: position.includes('top') ? '2px 0 0' : '0 0 2px',
        ...(position.includes('left')
          ? { borderLeftWidth: '2px' }
          : { borderRightWidth: '2px' }),
      }}
    />
  )
}

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)

  const [hoveredSpaceId, setHoveredSpaceId] = useState<number | null>(null)

  if (!currentPlayer) return null

  // Allow moves if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  const hoveredSpace = hoveredSpaceId !== null ? spaces.find((s) => s.id === hoveredSpaceId) : null

  const handleSpaceClick = (spaceId: number) => {
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
      className="relative w-full h-full rounded-xl overflow-auto flex items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(212, 168, 83, 0.04) 0%, transparent 45%),
          radial-gradient(ellipse at 70% 80%, rgba(139, 111, 71, 0.05) 0%, transparent 45%),
          linear-gradient(135deg, #1e1812 0%, #16120d 50%, #1e1812 100%)
        `,
      }}
    >
      {/* Warm vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(13, 10, 7, 0.6) 100%)',
        }}
      />

      <div className="relative p-8">
        {/* Map frame corners */}
        <Corner position="top-0 left-0" />
        <Corner position="top-0 right-0" />
        <Corner position="bottom-0 left-0" />
        <Corner position="bottom-0 right-0" />

        {/* Map title decoration */}
        <div className="flex items-center justify-center gap-3 mb-5 pointer-events-none">
          <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.3))' }} />
          <div className="font-display text-xl text-gold-500 opacity-40 tracking-widest text-center">
            The Bardic Realm
          </div>
          <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
        </div>

        {/* Tile grid */}
        <div className="flex flex-col gap-4" onMouseLeave={() => setHoveredSpaceId(null)}>
          {TILE_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-4">
              {row.map((spaceId, colIdx) => {
                if (spaceId === null) {
                  return <div key={colIdx} className="w-[104px] h-[104px]" />
                }

                const space = spaces.find((s) => s.id === spaceId)
                if (!space) return <div key={colIdx} className="w-[104px] h-[104px]" />

                // Stagger tile entrance across the grid
                const flatIndex = rowIdx * 5 + colIdx

                return (
                  <div
                    key={colIdx}
                    className="animate-tile-in"
                    style={{ animationDelay: `${flatIndex * 40}ms` }}
                    // Hover handled on the wrapper: disabled tile buttons swallow mouse events
                    onMouseEnter={() => setHoveredSpaceId(space.id)}
                    onMouseLeave={() => setHoveredSpaceId(null)}
                  >
                    <BoardSpaceComponent
                      space={space}
                      players={players}
                      isCurrentPlayer={currentPlayer.position === space.id}
                      canMoveTo={validMoves.some((s) => s.id === space.id)}
                      isLinkedToHovered={
                        hoveredSpace !== null &&
                        hoveredSpace !== undefined &&
                        hoveredSpace.connections.includes(space.id)
                      }
                      onClick={() => handleSpaceClick(space.id)}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Hover hint */}
        <div className="mt-4 text-center text-xs text-parchment-500 pointer-events-none h-4">
          {hoveredSpace
            ? `${hoveredSpace.name} — paths to ${hoveredSpace.connections.map((id) => spaces.find((s) => s.id === id)?.name).filter(Boolean).join(', ')}`
            : canMove
            ? 'Glowing tiles are within reach'
            : ''}
        </div>
      </div>
    </div>
  )
}
