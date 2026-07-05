import { BoardSpace as BoardSpaceType, Player, Genre } from '@/types'
import { GENRE_THEME } from '@/data/genreTheme'

interface BoardSpaceProps {
  space: BoardSpaceType
  players: Player[]
  isCurrentPlayer: boolean
  canMoveTo: boolean
  isLinkedToHovered?: boolean
  onClick: () => void
}

export function BoardSpace({
  space,
  players,
  isCurrentPlayer,
  canMoveTo,
  isLinkedToHovered = false,
  onClick,
}: BoardSpaceProps) {
  const playersHere = players.filter((p) => p.position === space.id)
  const hasMonsters = space.monsters.length > 0
  const potentialMonsters = Math.floor(space.genreTags.length / 2)

  // Group genre tags by type for compact chip display
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
        relative hover:z-40 w-full aspect-square rounded-lg sm:rounded-xl
        flex flex-col justify-between p-1.5 sm:p-2
        transition-all duration-200 ease-out
        ${canMoveTo
          ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110'
          : 'cursor-default'
        }
        ${hasMonsters && canMoveTo ? 'animate-danger-pulse' : ''}
      `}
      style={{
        background: hasMonsters
          ? 'linear-gradient(135deg, rgba(232, 32, 64, 0.16) 0%, rgba(139, 30, 30, 0.22) 100%)'
          : potentialMonsters > 0
          ? 'linear-gradient(135deg, rgba(255, 157, 27, 0.1) 0%, rgba(180, 100, 20, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(42, 33, 24, 0.9) 0%, rgba(61, 48, 32, 0.9) 100%)',
        border: isCurrentPlayer
          ? '2px solid rgba(100, 220, 100, 0.65)'
          : canMoveTo
          ? '2px solid rgba(212, 168, 83, 0.55)'
          : isLinkedToHovered
          ? '1px dashed rgba(212, 168, 83, 0.5)'
          : hasMonsters
          ? '1px solid rgba(232, 32, 64, 0.4)'
          : space.isEdge
          ? '1px solid rgba(212, 168, 83, 0.3)'
          : '1px solid rgba(212, 168, 83, 0.15)',
        boxShadow: isCurrentPlayer
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(100, 220, 100, 0.22), 0 4px 8px rgba(0,0,0,0.3)'
          : canMoveTo
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 12px rgba(212, 168, 83, 0.15), 0 4px 8px rgba(0,0,0,0.3)'
          : isLinkedToHovered
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 10px rgba(212, 168, 83, 0.12), 0 2px 6px rgba(0,0,0,0.3)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)',
      }}
      title={space.name}
    >
      {/* Dim overlay for out-of-reach tiles (kept off the container so
          tooltips inside stay at full opacity) */}
      {!canMoveTo && !isCurrentPlayer && (
        <div className="absolute inset-0 rounded-xl bg-black/25 pointer-events-none z-10" />
      )}

      {/* Edge/starting space indicator */}
      {space.isEdge && (
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
          style={{
            background: 'linear-gradient(135deg, #2d6e30, #1e4820)',
            border: '1px solid rgba(100, 220, 100, 0.4)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            color: '#a0f0a4',
          }}
          title="Starting space"
        >
          S
        </div>
      )}

      {/* Space ID badge */}
      <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
        style={{
          background: 'linear-gradient(135deg, #4e3d2a, #3d3020)',
          border: '1px solid rgba(212, 168, 83, 0.3)',
          color: '#d4a853',
        }}
        title={`Space ${space.id}`}
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
              style={{ background: 'rgba(232, 32, 64, 0.2)', border: '1px solid rgba(232, 32, 64, 0.5)', color: '#ff7070' }}
            >
              &#x2620;
            </div>
            <div className="text-red-400 font-bold text-[10px] leading-tight">
              &times;{space.monsters.length}
            </div>
            {/* Hover tooltip */}
            <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-52 rounded-lg p-2.5 shadow-xl text-sm pointer-events-none animate-fade-in"
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

        {/* Genre tags — grouped color-coded chips with counts */}
        {genreEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center mt-0.5">
            {genreEntries.map(([genre, count]) => {
              const { color } = GENRE_THEME[genre]
              return (
                <div
                  key={genre}
                  className="flex items-center gap-1 rounded-full px-1.5 py-0.5"
                  style={{
                    background: `${color}1f`,
                    border: `1px solid ${color}55`,
                  }}
                  title={`${genre}: ${count} tag${count > 1 ? 's' : ''}`}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 4px ${color}aa`,
                    }}
                  />
                  {count > 1 && (
                    <span
                      className="text-[8px] font-bold leading-none"
                      style={{ color }}
                    >
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Players on this space */}
      {playersHere.length > 0 && (
        <div className="flex justify-center -space-x-1.5">
          {playersHere.map((player) => {
            const isActiveToken = isCurrentPlayer && playersHere.length > 0
            return (
              <div
                key={player.id}
                className={`player-avatar w-6 h-6 text-[10px] ${isActiveToken ? 'animate-token-bob' : ''}`}
                style={{
                  backgroundColor: player.color,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
                title={player.name}
              >
                {player.name.charAt(0)}
              </div>
            )
          })}
        </div>
      )}

      {/* Move indicator glow */}
      {canMoveTo && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-ring-pulse"
        />
      )}
    </button>
  )
}
