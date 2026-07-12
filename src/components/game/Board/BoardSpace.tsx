import { BoardSpace as BoardSpaceType, Player, Genre } from '@/types'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'
import { SPACE_ILLUSTRATIONS } from '@/data/boardIllustrations'

interface BoardSpaceProps {
  space: BoardSpaceType
  players: Player[]
  isCurrentPlayer: boolean
  canMoveTo: boolean
  isTravelTarget?: boolean
  isLinkedToHovered?: boolean
  onClick: () => void
}

export function BoardSpace({
  space,
  players,
  isCurrentPlayer,
  canMoveTo,
  isTravelTarget = false,
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
  const illustration = SPACE_ILLUSTRATIONS[space.name]

  return (
    <button
      onClick={onClick}
      disabled={!canMoveTo && !isTravelTarget}
      className={`
        relative sm:hover:z-40 w-full aspect-square rounded-lg sm:rounded-xl
        flex flex-col justify-between p-1.5 sm:p-2
        transition-all duration-200 ease-out
        ${canMoveTo || isTravelTarget
          ? 'cursor-pointer sm:hover:-translate-y-1 sm:hover:brightness-110'
          : 'cursor-default'
        }
        ${hasMonsters && (canMoveTo || isTravelTarget) ? 'animate-danger-pulse' : ''}
      `}
      style={{
        background: hasMonsters
          ? 'linear-gradient(135deg, rgba(232, 32, 64, 0.16) 0%, rgba(139, 30, 30, 0.22) 100%)'
          : potentialMonsters > 0
          ? 'linear-gradient(135deg, rgba(255, 157, 27, 0.1) 0%, rgba(180, 100, 20, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(42, 33, 24, 0.9) 0%, rgba(61, 48, 32, 0.9) 100%)',
        border: isCurrentPlayer
          ? '2px solid rgba(100, 220, 100, 0.65)'
          : isTravelTarget
          ? '2px solid rgba(176, 124, 255, 0.7)'
          : canMoveTo
          ? '2px solid rgba(212, 168, 83, 0.55)'
          : isLinkedToHovered
          ? '1px dashed rgba(212, 168, 83, 0.5)'
          : hasMonsters
          ? '1px solid rgba(232, 32, 64, 0.4)'
          : '1px solid rgba(212, 168, 83, 0.15)',
        boxShadow: isCurrentPlayer
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(100, 220, 100, 0.22), 0 4px 8px rgba(0,0,0,0.3)'
          : isTravelTarget
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(176, 124, 255, 0.3), 0 4px 8px rgba(0,0,0,0.3)'
          : canMoveTo
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 12px rgba(212, 168, 83, 0.15), 0 4px 8px rgba(0,0,0,0.3)'
          : isLinkedToHovered
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 10px rgba(212, 168, 83, 0.12), 0 2px 6px rgba(0,0,0,0.3)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)',
      }}
      title={space.name}
    >
      {/* Hand-drawn map illustration behind the tile content */}
      {illustration && (
        <img
          src={illustration}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="absolute inset-0 z-0 h-full w-full rounded-lg sm:rounded-xl object-cover opacity-90 pointer-events-none"
        />
      )}

      {/* Dim overlay for out-of-reach tiles (kept off the container so
          tooltips inside stay at full opacity) */}
      {!canMoveTo && !isCurrentPlayer && !isTravelTarget && (
        <div className="absolute inset-0 rounded-xl bg-black/25 pointer-events-none z-10" />
      )}

      {/* Space name — dark banner keeps the label legible over the light map art */}
      <div className="relative z-10 w-full rounded px-1 py-0.5 bg-black/60 text-[9px] lg:text-sm font-medieval font-bold text-center leading-tight text-gold-200 line-clamp-2">
        {space.name}
      </div>

      {playersHere.length > 0 && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex -space-x-1.5 z-20 pointer-events-none">
          {playersHere.map((player) => (
            <div
              key={player.id}
              className={`player-avatar w-5 h-5 sm:w-6 sm:h-6 text-[9px] sm:text-[10px] ${isCurrentPlayer ? 'animate-token-bob' : ''}`}
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

      {/* Content area */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center gap-0.5 lg:gap-1.5 overflow-hidden">
        {/* Genre tags — compact color-coded beads with counts */}
        {genreEntries.length > 0 && (
          <div className="flex flex-wrap gap-x-1 gap-y-0.5 lg:gap-x-1.5 lg:gap-y-1 justify-center max-w-full mt-0.5">
            {genreEntries.map(([genre, count]) => {
              const { color } = GENRE_THEME[genre]
              return (
                <div
                  key={genre}
                  className="flex items-center justify-center rounded-md px-1.5 py-0.5 lg:px-2 lg:py-1 leading-none"
                  style={{
                    background: color,
                    border: '1px solid rgba(0, 0, 0, 0.35)',
                    boxShadow: `0 0 6px ${color}80, 0 1px 2px rgba(0,0,0,0.4)`,
                  }}
                  title={`${genre}: ${count} tag${count > 1 ? 's' : ''}`}
                >
                  <span
                    className="text-[9px] lg:text-xs font-bold tabular-nums"
                    style={{ color: readableTextColor(color) }}
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
      {(canMoveTo || isTravelTarget) && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none animate-ring-pulse"
        />
      )}
    </button>
  )
}
