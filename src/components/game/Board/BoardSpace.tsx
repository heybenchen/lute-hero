import { BoardSpace as BoardSpaceType, Player, Genre } from '@/types'

const genreEmojis: Record<Genre, string> = {
  Ballad: '🔥',
  Folk: '🌿',
  Hymn: '💨',
  Shanty: '🌊',
}

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
        relative w-[100px] h-[100px] rounded-lg transition-all duration-200
        flex flex-col justify-between p-2
        ${canMoveTo
          ? 'cursor-pointer hover:scale-110'
          : 'cursor-not-allowed'
        }
        ${isCurrentPlayer ? 'scale-105' : ''}
        ${!canMoveTo && !isCurrentPlayer ? 'opacity-60' : ''}
      `}
      style={{
        background: hasMonsters
          ? 'linear-gradient(135deg, rgba(232, 32, 64, 0.15) 0%, rgba(139, 30, 30, 0.2) 100%)'
          : potentialMonsters > 0
          ? 'linear-gradient(135deg, rgba(255, 157, 27, 0.1) 0%, rgba(180, 100, 20, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(42, 33, 24, 0.9) 0%, rgba(61, 48, 32, 0.9) 100%)',
        border: isCurrentPlayer
          ? '2px solid rgba(100, 220, 100, 0.6)'
          : canMoveTo
          ? '2px solid rgba(212, 168, 83, 0.5)'
          : hasMonsters
          ? '1px solid rgba(232, 32, 64, 0.4)'
          : '1px solid rgba(212, 168, 83, 0.15)',
        boxShadow: isCurrentPlayer
          ? '0 0 15px rgba(100, 220, 100, 0.2), 0 4px 8px rgba(0,0,0,0.3)'
          : canMoveTo
          ? '0 0 12px rgba(212, 168, 83, 0.15), 0 4px 8px rgba(0,0,0,0.3)'
          : '0 2px 6px rgba(0,0,0,0.3)',
      }}
      title={space.name}
    >
      {/* Edge indicator */}
      {space.isEdge && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            color: '#d4ffd6',
          }}
        >
          S
        </div>
      )}

      {/* Space ID badge */}
      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
        style={{
          background: 'linear-gradient(135deg, #4e3d2a, #3d3020)',
          border: '1px solid rgba(212, 168, 83, 0.3)',
          color: '#d4a853',
        }}
      >
        {space.id}
      </div>

      {/* Space name */}
      <div className="text-[9px] font-medieval font-bold text-center leading-tight text-gold-300 opacity-80 truncate w-full">
        {space.name}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        {/* Monster indicator */}
        {hasMonsters && (
          <div className="flex flex-col items-center group relative">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              style={{ background: 'rgba(232, 32, 64, 0.25)', border: '1px solid rgba(232, 32, 64, 0.5)', color: '#ff6b6b' }}
            >
              &#x1F479;
            </div>
            <div className="text-red-400 font-bold text-xs">
              x{space.monsters.length}
            </div>
            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-52 rounded-lg p-2.5 shadow-xl text-sm pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #2a2118, #1a1410)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
              }}
            >
              {space.monsters.map((monster, idx) => (
                <div key={monster.id} className={`${idx > 0 ? 'mt-2 pt-2 border-t border-gold-500/20' : ''}`}>
                  <div className="font-bold text-gold-400">{monster.name}</div>
                  <div className="text-xs mt-1 text-parchment-300">
                    <div>HP: {monster.currentHP}/{monster.maxHP}</div>
                    {monster.vulnerability && (
                      <div className="text-green-400">Weak: {monster.vulnerability}</div>
                    )}
                    {monster.resistance && (
                      <div className="text-red-400">Resist: {monster.resistance}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Potential monsters indicator */}
        {!hasMonsters && potentialMonsters > 0 && (
          <div className="flex flex-col items-center opacity-60">
            <div className="text-amber-400 text-sm">&#x26A0;</div>
            <div className="text-amber-400 font-bold text-[10px]">
              {potentialMonsters}
            </div>
          </div>
        )}

        {/* Genre tags */}
        {space.genreTags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 justify-center">
            {space.genreTags.slice(0, 4).map((genre, idx) => (
              <span key={idx} className="text-xs" title={genre}>
                {genreEmojis[genre]}
              </span>
            ))}
            {space.genreTags.length > 4 && (
              <span className="text-[9px] text-gold-500">+{space.genreTags.length - 4}</span>
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
              className="player-avatar w-6 h-6 text-[10px]"
              style={{ backgroundColor: player.color }}
              title={player.name}
            >
              {player.name.charAt(0)}
            </div>
          ))}
        </div>
      )}

      {/* Move indicator glow */}
      {canMoveTo && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none animate-glow-pulse"
          style={{ boxShadow: '0 0 14px rgba(212, 168, 83, 0.4)' }}
        />
      )}
    </button>
  )
}
