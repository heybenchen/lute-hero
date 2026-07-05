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

      {/* Player indicator — top-left corner */}
      {playersHere.length > 0 && (
        <div className="absolute top-1 left-1 z-20 flex -space-x-1.5">
          {playersHere.map((player) => (
            <div
              key={player.id}
              className={`player-avatar w-6 h-6 text-[10px] ${isCurrentPlayer ? 'animate-token-bob' : ''}`}
              style={{
                backgroundColor: player.color,
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
              title={player.name}
            >
              {player.name.charAt(0)}
            </div>
          ))}
        </div>
      )}

      {/* Space name */}
      <div className="text-[9px] font-medieval font-bold text-center leading-tight text-gold-300 opacity-80 truncate w-full">
        {space.name}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden">
        {/* Monster indicator */}
        {hasMonsters && (
          <div className="flex items-center gap-1 group relative">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0"
              style={{ background: 'rgba(232, 32, 64, 0.2)', border: '1px solid rgba(232, 32, 64, 0.5)', color: '#ff7070' }}
            >
              &#x2620;
            </div>
            <div className="text-red-400 font-bold text-xs leading-none">
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
          <div className="flex items-center gap-1 opacity-70">
            <span className="text-amber-400 text-sm leading-none">&#x26A0;</span>
            <span className="text-amber-400 font-bold text-xs leading-none">
              {potentialMonsters}
            </span>
          </div>
        )}

        {/* Genre tags — compact color-coded beads with counts */}
        {genreEntries.length > 0 && (
          <div className="flex flex-wrap gap-x-1 gap-y-0.5 justify-center max-w-full mt-0.5">
            {genreEntries.map(([genre, count]) => {
              const { color } = GENRE_THEME[genre]
              return (
                <div
                  key={genre}
                  className="flex items-center gap-0.5 rounded-md pl-1 pr-1.5 py-0.5 leading-none"
                  style={{
                    background: `linear-gradient(135deg, ${color}33, ${color}14)`,
                    border: `1px solid ${color}66`,
                    boxShadow: `inset 0 0 4px ${color}22`,
                  }}
                  title={`${genre}: ${count} tag${count > 1 ? 's' : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: color,
                      boxShadow: `0 0 5px ${color}, inset 0 0 1px rgba(255,255,255,0.5)`,
                    }}
                  />
                  <span
                    className="text-[9px] font-bold tabular-nums"
                    style={{ color, textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
                  >
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Move indicator glow */}
      {canMoveTo && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-ring-pulse"
        />
      )}
    </button>
  )
}
