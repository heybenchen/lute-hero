import { BoardSpace as BoardSpaceType, Player } from '@/types'
import { GenreBadge } from '@/components/ui/GenreBadge'

interface BoardSpaceProps {
  space: BoardSpaceType
  players: Player[]
  isCurrentPlayer: boolean
  canMoveTo: boolean
  onClick: () => void
}

export function BoardSpace({
  space,
  players,
  isCurrentPlayer,
  canMoveTo,
  onClick,
}: BoardSpaceProps) {
  const playersHere = players.filter((p) => p.position === space.id)
  const hasMonsters = space.monsters.length > 0
  const potentialMonsters = Math.floor(space.genreTags.length / 2)

  return (
    <button
      onClick={onClick}
      disabled={!canMoveTo}
      className={`
        card relative p-3 w-[140px] h-[140px] transition-all duration-200
        flex flex-col justify-between
        ${canMoveTo
          ? 'hover:scale-110 hover:shadow-2xl cursor-pointer ring-3 ring-blue-400 hover:ring-blue-500'
          : 'opacity-70 cursor-not-allowed'
        }
        ${isCurrentPlayer ? 'ring-4 ring-green-500 shadow-2xl scale-105' : ''}
        ${hasMonsters ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500' : ''}
        ${potentialMonsters > 0 && !hasMonsters ? 'bg-gradient-to-br from-yellow-50 to-orange-50' : ''}
      `}
      title={space.name}
    >
      {/* Edge indicator */}
      {space.isEdge && (
        <div className="absolute -top-2 -right-2 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white text-sm">
          🏠
        </div>
      )}

      {/* Space ID badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-wood-500 text-parchment-100 rounded-full flex items-center justify-center text-xs font-bold border-2 border-parchment-200">
        {space.id}
      </div>

      {/* Space name */}
      <div className="text-[10px] font-medieval font-bold text-center leading-tight mb-1 text-wood-600">
        {space.name}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        {/* Monster indicator */}
        {hasMonsters && (
          <div className="flex flex-col items-center">
            <div className="text-3xl">👹</div>
            <div className="text-red-600 font-bold text-lg">
              ×{space.monsters.length}
            </div>
          </div>
        )}

        {/* Potential monsters indicator */}
        {!hasMonsters && potentialMonsters > 0 && (
          <div className="flex flex-col items-center opacity-50">
            <div className="text-2xl">⚠️</div>
            <div className="text-orange-600 font-bold text-sm">
              {potentialMonsters} spawn
            </div>
          </div>
        )}

        {/* Genre tags */}
        {space.genreTags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {space.genreTags.slice(0, 4).map((genre, idx) => (
              <GenreBadge key={idx} genre={genre} className="text-xs" />
            ))}
            {space.genreTags.length > 4 && (
              <span className="text-xs text-wood-500">+{space.genreTags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Players on this space */}
      {playersHere.length > 0 && (
        <div className="flex gap-1 justify-center flex-wrap">
          {playersHere.map((player) => (
            <div
              key={player.id}
              className="w-8 h-8 rounded-full border-2 border-wood-600 flex items-center justify-center text-xs font-bold shadow-lg"
              style={{ backgroundColor: player.color }}
              title={player.name}
            >
              {player.name.charAt(0)}
            </div>
          ))}
        </div>
      )}

      {/* Move indicator */}
      {canMoveTo && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-6xl opacity-20">→</div>
        </div>
      )}
    </button>
  )
}
