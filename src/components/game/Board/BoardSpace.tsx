import { BoardSpace as BoardSpaceType, Player, Genre } from '@/types'

const genreColors: Record<Genre, string> = {
  Ballad: '#e82040',
  Folk: '#4caf50',
  Hymn: '#00b8d4',
  Shanty: '#2979ff',
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

  // Group genre tags by type for compact display
  const genreTagCounts = space.genreTags.reduce<Partial<Record<Genre, number>>>((acc, g) => {
    acc[g] = (acc[g] || 0) + 1
    return acc
  }, {})
  const genreEntries = Object.entries(genreTagCounts) as [Genre, number][]

  return (
    <button
      onClick={onClick}
      disabled={!canMoveTo}
      className={`
        relative w-[90px] h-[90px] rounded-lg transition-all duration-200
        flex flex-col justify-between p-2
        ${canMoveTo ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
        ${isCurrentPlayer ? 'scale-105' : ''}
        ${!canMoveTo && !isCurrentPlayer ? 'opacity-60' : ''}
      `}
      style={{
        background: hasMonsters
          ? 'linear-gradient(135deg, rgba(232, 32, 64, 0.15) 0%, rgba(139, 30, 30, 0.22) 100%)'
          : potentialMonsters > 0
          ? 'linear-gradient(135deg, rgba(255, 157, 27, 0.1) 0%, rgba(180, 100, 20, 0.12) 100%)'
          : 'linear-gradient(135deg, rgba(42, 33, 24, 0.93) 0%, rgba(61, 48, 32, 0.93) 100%)',
        border: isCurrentPlayer
          ? '2px solid rgba(100, 220, 100, 0.65)'
          : canMoveTo
          ? '2px solid rgba(212, 168, 83, 0.55)'
          : hasMonsters
          ? '1px solid rgba(232, 32, 64, 0.4)'
          : space.isEdge
          ? '1px solid rgba(212, 168, 83, 0.28)'
          : '1px solid rgba(212, 168, 83, 0.13)',
        boxShadow: isCurrentPlayer
          ? '0 0 16px rgba(100, 220, 100, 0.25), 0 4px 10px rgba(0,0,0,0.4)'
          : canMoveTo
          ? '0 0 14px rgba(212, 168, 83, 0.18), 0 4px 10px rgba(0,0,0,0.4)'
          : '0 2px 6px rgba(0,0,0,0.35)',
      }}
      title={space.name}
    >
      {/* Edge/starting space indicator — green dot badge */}
      {space.isEdge && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #2d6e30, #1e4820)',
            border: '1px solid rgba(100,220,100,0.4)',
            fontSize: '7px',
            fontWeight: 'bold',
            color: '#a0f0a4',
          }}
          title="Starting space"
        >
          S
        </div>
      )}

      {/* Space ID badge */}
      <div
        className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #4e3d2a, #3d3020)',
          border: '1px solid rgba(212, 168, 83, 0.3)',
          fontSize: '7px',
          fontWeight: 'bold',
          color: '#d4a853',
        }}
      >
        {space.id}
      </div>

      {/* Space name */}
      <div className="text-[8px] font-medieval font-bold text-center leading-tight text-gold-300 opacity-90 truncate w-full pt-0.5">
        {space.name}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0.5">
        {/* Monster indicator */}
        {hasMonsters && (
          <div className="flex flex-col items-center group relative">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              style={{
                background: 'rgba(232, 32, 64, 0.2)',
                border: '1px solid rgba(232, 32, 64, 0.5)',
                color: '#ff7070',
              }}
            >
              ☠
            </div>
            <div className="text-red-400 font-bold text-[10px] leading-tight">
              ×{space.monsters.length}
            </div>
            {/* Hover tooltip */}
            <div
              className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-48 rounded-lg p-2 shadow-xl text-xs pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #2a2118, #1a1410)',
                border: '1px solid rgba(212, 168, 83, 0.3)',
              }}
            >
              {space.monsters.map((monster, idx) => (
                <div key={monster.id} className={idx > 0 ? 'mt-2 pt-2 border-t border-gold-500/20' : ''}>
                  <div className="font-bold text-gold-400">{monster.name}</div>
                  <div className="text-[10px] mt-0.5 text-parchment-300">
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

        {/* Potential monster warning */}
        {!hasMonsters && potentialMonsters > 0 && (
          <div className="flex items-center gap-0.5 opacity-75">
            <span className="text-amber-400 text-xs">⚠</span>
            <span className="text-amber-400 font-bold text-[9px]">{potentialMonsters}</span>
          </div>
        )}

        {/* Genre tags — grouped colored dots with count */}
        {genreEntries.length > 0 && (
          <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
            {genreEntries.map(([genre, count]) => (
              <div
                key={genre}
                className="flex items-center gap-0.5 rounded-full px-1 py-px"
                style={{
                  background: `${genreColors[genre]}20`,
                  border: `1px solid ${genreColors[genre]}50`,
                }}
                title={`${genre}: ${count} tag${count > 1 ? 's' : ''}`}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: genreColors[genre] }}
                />
                {count > 1 && (
                  <span
                    className="text-[6px] font-bold leading-none"
                    style={{ color: genreColors[genre] }}
                  >
                    {count}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Players on this space */}
      {playersHere.length > 0 && (
        <div className="flex gap-0.5 justify-center flex-wrap">
          {playersHere.map((player) => (
            <div
              key={player.id}
              className="player-avatar w-5 h-5 text-[9px]"
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
          style={{ boxShadow: '0 0 16px rgba(212, 168, 83, 0.45)' }}
        />
      )}
    </button>
  )
}
