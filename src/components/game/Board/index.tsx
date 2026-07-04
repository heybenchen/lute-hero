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

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)

  if (!currentPlayer) return null

  // Allow moves if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

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
        background: 'linear-gradient(135deg, #1e1812 0%, #16120d 50%, #1e1812 100%)',
      }}
    >
      {/* Warm vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(13, 10, 7, 0.6) 100%)',
        }}
      />

      <div className="relative p-6">
        {/* Map title decoration */}
        <div className="font-display text-xl text-gold-500 opacity-25 tracking-widest text-center mb-4">
          The Bardic Realm
        </div>

        {/* Tile grid */}
        <div className="flex flex-col gap-4">
          {TILE_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex gap-4">
              {row.map((spaceId, colIdx) => {
                if (spaceId === null) {
                  return <div key={colIdx} className="w-[100px] h-[100px]" />
                }

                const space = spaces.find((s) => s.id === spaceId)
                if (!space) return <div key={colIdx} className="w-[100px] h-[100px]" />

                return (
                  <BoardSpaceComponent
                    key={colIdx}
                    space={space}
                    players={players}
                    isCurrentPlayer={currentPlayer.position === space.id}
                    canMoveTo={validMoves.some((s) => s.id === space.id)}
                    onClick={() => handleSpaceClick(space.id)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
