import { useGameStore, selectCanRedistribute } from '@/store'
import { GENRE_THEME, readableTextColor } from '@/data/genreTheme'
import { maxGenreTags } from '@/game-logic/board/graphBuilder'
import { Genre } from '@/types'

/**
 * Round-end reinforcements. Each bard, in turn order, is dealt one monster chip
 * of every element and places them wherever they like — one chip per tile —
 * before the next round begins.
 */
export function RoundEndModal() {
  // Subscribe to the stable redistribution object; derive the placer locally
  // (a selector that builds a fresh object would loop useSyncExternalStore).
  const redistribution = useGameStore((state) => state.redistribution)
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanRedistribute)
  const mode = useGameStore((state) => state.mode)

  if (!redistribution.active || players.length === 0) return null

  const { placerIdx, chipsToPlace, placedSpaceIds } = redistribution
  const placer = players[placerIdx]
  const nextChip = chipsToPlace[0]
  const placerColor = GENRE_THEME[placer.starterGenre]?.color ?? placer.color

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl animate-scale-in">
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="font-display text-2xl sm:text-3xl text-gold-400 mb-1" style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.2)' }}>
              Round Over — Reinforcements
            </div>
            <p className="text-sm text-parchment-500 font-game">
              Bard {placerIdx + 1} of {players.length}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span
                className="px-2.5 py-1 rounded-full font-bold text-xs sm:text-sm"
                style={{ background: placerColor, color: readableTextColor(placerColor) }}
              >
                {placer.name}
              </span>
              <span className="text-parchment-500">places their chips — one per tile</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* The hand: the chip being placed, then the ones still to come */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-parchment-500">Placing:</span>
              {nextChip && <ChipBead genre={nextChip} active />}
              {chipsToPlace.length > 1 && (
                <>
                  <span className="text-xs text-parchment-500 ml-1">then</span>
                  {chipsToPlace.slice(1).map((genre, i) => (
                    <ChipBead key={i} genre={genre} />
                  ))}
                </>
              )}
            </div>

            {!canAct && mode === 'online' && (
              <div className="text-sm text-parchment-500 italic animate-pulse-slow">
                Waiting for {placer.name} to place their chips…
              </div>
            )}

            {/* Mini board */}
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-lg">
              {spaces.map((space) => {
                const used = placedSpaceIds.includes(space.id)
                const full = space.genreTags.length >= maxGenreTags()
                const disabled = !canAct || used || full
                const playersHere = players.filter((p) => p.position === space.id)
                const counts = space.genreTags.reduce<Partial<Record<Genre, number>>>((acc, g) => {
                  acc[g] = (acc[g] || 0) + 1
                  return acc
                }, {})
                return (
                  <button
                    key={space.id}
                    onClick={() => dispatch({ type: 'PLACE_REDISTRIBUTION_CHIP', spaceId: space.id })}
                    disabled={disabled}
                    title={full ? `${space.name} — full` : space.name}
                    className={`relative aspect-square rounded-lg p-1 flex flex-col justify-between transition-all duration-150 ${
                      disabled ? 'opacity-60' : 'hover:-translate-y-0.5 cursor-pointer'
                    }`}
                    style={{
                      background: 'linear-gradient(135deg, rgba(42, 33, 24, 0.9), rgba(61, 48, 32, 0.9))',
                      border: used
                        ? '2px solid rgba(100, 220, 100, 0.7)'
                        : disabled
                        ? '1px solid rgba(212, 168, 83, 0.12)'
                        : '2px solid rgba(240, 200, 110, 0.7)',
                      boxShadow: used ? '0 0 10px rgba(100, 220, 100, 0.25)' : undefined,
                    }}
                  >
                    <div className="text-[8px] sm:text-[9px] font-medieval font-bold text-gold-200 leading-tight line-clamp-2 text-center">
                      {space.name}
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      {playersHere.map((p) => (
                        <span key={p.id} className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} title={p.name} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {(Object.entries(counts) as [Genre, number][]).map(([genre, count]) => {
                        const { color } = GENRE_THEME[genre]
                        return (
                          <span
                            key={genre}
                            className="rounded px-1 text-[8px] sm:text-[9px] font-bold tabular-nums"
                            style={{ background: color, color: readableTextColor(color) }}
                          >
                            {count}
                          </span>
                        )
                      })}
                    </div>
                    {used && <div className="absolute top-0.5 right-0.5 text-[9px]">✓</div>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChipBead({ genre, active = false }: { genre: Genre; active?: boolean }) {
  const { color, emoji } = GENRE_THEME[genre]
  return (
    <span
      className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 leading-none"
      style={{
        background: active ? color : `${color}33`,
        border: `1px solid ${color}`,
        boxShadow: active ? `0 0 10px ${color}80` : undefined,
        opacity: active ? 1 : 0.6,
      }}
    >
      <span className="text-sm">{emoji}</span>
      <span className="text-[11px] font-bold" style={{ color: active ? readableTextColor(color) : color }}>
        {genre}
      </span>
    </span>
  )
}
