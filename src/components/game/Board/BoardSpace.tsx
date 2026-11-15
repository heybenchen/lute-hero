import { BoardSpace as BoardSpaceType, Player, Genre } from '@/types'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'
import { SPACE_ILLUSTRATIONS } from '@/data/boardIllustrations'
import { Skull } from 'lucide-react'

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

  // Group genre tags by type for compact chip display
  const genreTagCounts = space.genreTags.reduce<Partial<Record<Genre, number>>>((acc, g) => {
    acc[g] = (acc[g] || 0) + 1
    return acc
  }, {})
  const genreEntries = Object.entries(genreTagCounts) as [Genre, number][]
  const illustration = SPACE_ILLUSTRATIONS[space.id]
  // Spaces the player can act on this turn (reachable / current / travel target)
  const isReachable = canMoveTo || isTravelTarget || isCurrentPlayer

  return (
    <button
      onClick={onClick}
      disabled={!canMoveTo && !isTravelTarget}
      className={`
        board-space-tile relative sm:hover:z-40 w-full aspect-square
        flex flex-col justify-between p-1.5 sm:p-2
        transition-all duration-200 ease-out
        ${canMoveTo || isTravelTarget
          ? 'cursor-pointer sm:hover:-translate-y-1.5'
          : 'cursor-default'
        }
        ${hasMonsters && (canMoveTo || isTravelTarget) ? 'animate-danger-pulse' : ''}
      `}
      style={{
        border: isCurrentPlayer
          ? '2px solid rgba(116, 225, 139, 0.9)'
          : isTravelTarget
          ? '2px solid rgba(176, 124, 255, 0.7)'
          : canMoveTo
          ? '2px solid rgba(240, 200, 110, 0.95)'
          : isLinkedToHovered
          ? '1px dashed rgba(212, 168, 83, 0.5)'
          : '1px solid rgba(107, 73, 35, 0.85)',
        boxShadow: isCurrentPlayer
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px rgba(100, 220, 100, 0.22), 0 4px 8px rgba(0,0,0,0.3)'
          : isTravelTarget
          ? 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(176, 124, 255, 0.3), 0 4px 8px rgba(0,0,0,0.3)'
          : canMoveTo
          ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px rgba(240, 200, 110, 0.5), 0 4px 8px rgba(0,0,0,0.3)'
          : isLinkedToHovered
          ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 0 10px rgba(212, 168, 83, 0.12), 0 2px 6px rgba(0,0,0,0.3)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 6px rgba(0,0,0,0.3)',
      }}
      title={space.name}
    >
      {/* Each illustration is now its own physical location tile. */}
      {illustration && (
        <img
          src={illustration}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={`absolute inset-0 z-0 h-full w-full object-cover pointer-events-none transition-all duration-200 ${isReachable ? 'opacity-100' : 'opacity-65 grayscale'}`}
        />
      )}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/75" />

      {/* Dim overlay for out-of-reach tiles (kept off the container so
          tooltips inside stay at full opacity) */}
      {!isReachable && (
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-10" />
      )}

      <div className="relative z-20 flex items-start justify-between gap-1">
        <div className="tile-nameplate text-left text-[7px] sm:text-[9px] lg:text-[10px] font-medieval font-bold leading-tight text-parchment-100 line-clamp-2">
          {space.name}
        </div>
        {hasMonsters && (
          <div className="threat-counter" title={`${space.monsters.length} monster${space.monsters.length === 1 ? '' : 's'}`}>
            <Skull size={10} strokeWidth={2.4} aria-hidden="true" />
            <span>{space.monsters.length}</span>
          </div>
        )}
      </div>

      {/* Player tokens */}
      <div className="relative z-20 flex-1 min-h-0 flex items-center justify-center pointer-events-none">
        {playersHere.length > 0 && (
          <div className="flex -space-x-1 sm:-space-x-2">
            {playersHere.map((player) => (
              <div
                key={player.id}
                className={`player-piece w-5 h-5 sm:w-7 sm:h-7 text-[8px] sm:text-[10px] ${isCurrentPlayer ? 'animate-token-bob' : ''}`}
                style={{
                  backgroundColor: player.color,
                }}
                title={player.name}
              >
                {player.name.charAt(0)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-20 min-h-[16px] sm:min-h-[20px] flex items-end justify-center">
        {genreEntries.length > 0 && (
          <div className="chip-rack flex gap-0.5 sm:gap-1 justify-center max-w-full">
            {genreEntries.map(([genre, count]) => {
              const { color } = GENRE_THEME[genre]
              return (
                <div
                  key={genre}
                  className="element-chip flex items-center justify-center leading-none"
                  style={{
                    background: color,
                    boxShadow: `0 0 5px ${color}70, 0 1px 2px rgba(0,0,0,0.55)`,
                  }}
                  title={`${genre}: ${count} tag${count > 1 ? 's' : ''}`}
                >
                  <span
                    className="text-[7px] sm:text-[9px] font-bold tabular-nums"
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
          className="absolute inset-0 pointer-events-none animate-ring-pulse"
        />
      )}
    </button>
  )
}
