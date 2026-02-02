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
        card relative p-2 w-[90px] h-[90px] transition-all duration-200
        flex flex-col justify-between
        ${canMoveTo
          ? 'hover:scale-110 hover:shadow-2xl cursor-pointer ring-2 ring-blue-400 hover:ring-blue-500'
          : 'opacity-70 cursor-not-allowed'
        }
        ${isCurrentPlayer ? 'ring-3 ring-green-500 shadow-2xl scale-105' : ''}
        ${hasMonsters ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-500' : ''}
        ${potentialMonsters > 0 && !hasMonsters ? 'bg-gradient-to-br from-yellow-50 to-orange-50' : ''}
      `}
      title={space.name}
    >
      {/* Edge indicator */}
      {space.isEdge && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg border border-white text-[10px]">
          🏠
        </div>
      )}

      {/* Space ID badge */}
      <div className="absolute -top-1 -left-1 w-5 h-5 bg-wood-500 text-parchment-100 rounded-full flex items-center justify-center text-[10px] font-bold border border-parchment-200">
        {space.id}
      </div>

      {/* Space name */}
      <div className="text-[8px] font-medieval font-bold text-center leading-tight mb-0.5 text-wood-600">
        {space.name}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        {/* Monster indicator */}
        {hasMonsters && (
          <div className="flex flex-col items-center group relative">
            <div className="text-xl">👹</div>
            <div className="text-red-600 font-bold text-sm">
              ×{space.monsters.length}
            </div>
            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 bg-wood-700 text-parchment-100 rounded-lg p-2 shadow-xl border-2 border-wood-500 text-xs pointer-events-none">
              {space.monsters.map((monster, idx) => (
                <div key={monster.id} className={`${idx > 0 ? 'mt-2 pt-2 border-t border-wood-500' : ''}`}>
                  <div className="font-bold text-yellow-300">{monster.name}</div>
                  <div className="text-[10px] mt-1">
                    <div>HP: {monster.currentHP}/{monster.maxHP}</div>
                    {monster.vulnerability && (
                      <div className="text-green-300">Weak: {monster.vulnerability}</div>
                    )}
                    {monster.resistance && (
                      <div className="text-red-300">Resist: {monster.resistance}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential monsters indicator */}
        {!hasMonsters && potentialMonsters > 0 && (
          <div className="flex flex-col items-center opacity-50">
            <div className="text-base">⚠️</div>
            <div className="text-orange-600 font-bold text-[10px]">
              {potentialMonsters}
            </div>
          </div>
        )}

        {/* Genre tags */}
        {space.genreTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {space.genreTags.slice(0, 3).map((genre, idx) => (
              <GenreBadge key={idx} genre={genre} className="text-[8px]" />
            ))}
            {space.genreTags.length > 3 && (
              <span className="text-[8px] text-wood-500">+{space.genreTags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Players on this space */}
      {playersHere.length > 0 && (
        <div className="flex gap-0.5 justify-center flex-wrap">
          {playersHere.map((player) => (
            <div
              key={player.id}
              className="w-5 h-5 rounded-full border border-wood-600 flex items-center justify-center text-[10px] font-bold shadow-lg"
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
          <div className="text-4xl opacity-20">→</div>
        </div>
      )}
    </button>
  )
}
