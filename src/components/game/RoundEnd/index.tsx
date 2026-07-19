import { useGameStore, selectCanRedistribute } from '@/store'
import { GENRE_THEME, ALL_GENRES, readableTextColor } from '@/data/genreTheme'
import { MAX_GENRE_TAGS } from '@/game-logic/board/graphBuilder'
import { CHIPS_PER_HANDOFF } from '@/engine/reducer'
import { Genre } from '@/types'

/**
 * Round-end redistribution overlay. In turn order, each bard hands
 * CHIPS_PER_HANDOFF monster chips (of their choosing) to the bard behind them,
 * who places each chip on a distinct board tile. Runs before the next round.
 */
export function RoundEndModal() {
  // Subscribe to the stable redistribution object; derive giver/receiver locally
  // (a selector that builds a fresh object would loop useSyncExternalStore).
  const redistribution = useGameStore((state) => state.redistribution)
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const dispatch = useGameStore((state) => state.dispatch)
  const canAct = useGameStore(selectCanRedistribute)
  const mode = useGameStore((state) => state.mode)

  if (!redistribution.active || players.length === 0) return null

  const { giverIdx, stage, selectedChips, chipsToPlace, placedSpaceIds } = redistribution
  const giver = players[giverIdx]
  const receiver = players[(giverIdx + 1) % players.length]
  const nextChip = chipsToPlace[0]

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl animate-scale-in">
        <div className="h-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="font-display text-2xl sm:text-3xl text-gold-400 mb-1" style={{ textShadow: '0 0 20px rgba(212, 168, 83, 0.2)' }}>
              Round Over — Redistribute Threats
            </div>
            <p className="text-sm text-parchment-500 font-game">
              Handoff {giverIdx + 1} of {players.length}
            </p>
            <div className="mt-3 flex items-center justify-center gap-3 text-sm">
              <PlayerPill player={giver} />
              <span className="text-parchment-500">hands {CHIPS_PER_HANDOFF} chips to</span>
              <PlayerPill player={receiver} />
            </div>
          </div>

          {stage === 'selecting' ? (
            <SelectStage
              giverName={giver.name}
              receiverName={receiver.name}
              selectedChips={selectedChips}
              canAct={canAct}
              onAdd={(genre) => dispatch({ type: 'ADD_REDISTRIBUTION_CHIP', genre })}
              onRemove={(index) => dispatch({ type: 'REMOVE_REDISTRIBUTION_CHIP', index })}
              onConfirm={() => dispatch({ type: 'CONFIRM_REDISTRIBUTION_GIFT' })}
              waitingLabel={mode === 'online' ? `Waiting for ${giver.name} to choose chips…` : undefined}
            />
          ) : (
            <PlaceStage
              receiverName={receiver.name}
              nextChip={nextChip}
              remaining={chipsToPlace.length}
              placedSpaceIds={placedSpaceIds}
              spaces={spaces}
              players={players}
              canAct={canAct}
              onPlace={(spaceId) => dispatch({ type: 'PLACE_REDISTRIBUTION_CHIP', spaceId })}
              waitingLabel={mode === 'online' ? `Waiting for ${receiver.name} to place chips…` : undefined}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function PlayerPill({ player }: { player: { name: string; starterGenre: Genre; color: string } }) {
  const color = GENRE_THEME[player.starterGenre]?.color ?? player.color
  return (
    <span
      className="px-2.5 py-1 rounded-full font-bold text-xs sm:text-sm"
      style={{ background: color, color: readableTextColor(color) }}
    >
      {player.name}
    </span>
  )
}

function ChipBead({ genre, onClick, title }: { genre: Genre; onClick?: () => void; title?: string }) {
  const { color, emoji } = GENRE_THEME[genre]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={title}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 leading-none transition-all ${onClick ? 'hover:-translate-y-0.5' : 'cursor-default'}`}
      style={{ background: color, border: '1px solid rgba(0,0,0,0.35)', boxShadow: `0 0 8px ${color}70` }}
    >
      <span className="text-sm">{emoji}</span>
      <span className="text-[11px] font-bold" style={{ color: readableTextColor(color) }}>{genre}</span>
    </button>
  )
}

function SelectStage({
  giverName,
  receiverName,
  selectedChips,
  canAct,
  onAdd,
  onRemove,
  onConfirm,
  waitingLabel,
}: {
  giverName: string
  receiverName: string
  selectedChips: Genre[]
  canAct: boolean
  onAdd: (genre: Genre) => void
  onRemove: (index: number) => void
  onConfirm: () => void
  waitingLabel?: string
}) {
  const full = selectedChips.length >= CHIPS_PER_HANDOFF
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-sm text-parchment-300 text-center max-w-md">
        <span className="font-bold text-gold-300">{giverName}</span>, choose {CHIPS_PER_HANDOFF} monster
        chips to hand to <span className="font-bold text-gold-300">{receiverName}</span>. Repeats are allowed.
      </p>

      {!canAct && waitingLabel && (
        <div className="text-sm text-parchment-500 italic animate-pulse-slow">{waitingLabel}</div>
      )}

      {/* Element picker */}
      <div className="grid grid-cols-4 gap-2 w-full max-w-md">
        {ALL_GENRES.map((genre) => {
          const { color, emoji } = GENRE_THEME[genre]
          return (
            <button
              key={genre}
              disabled={!canAct || full}
              onClick={() => onAdd(genre)}
              className="rounded-lg py-2.5 flex flex-col items-center gap-1 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:-translate-y-0.5"
              style={{
                background: `linear-gradient(160deg, ${color}33, rgba(42,33,24,0.9))`,
                border: `1px solid ${color}80`,
              }}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color }}>{genre}</span>
            </button>
          )
        })}
      </div>

      {/* Selected tray */}
      <div className="w-full max-w-md">
        <div className="text-xs font-medieval text-parchment-500 uppercase tracking-wider mb-2 text-center">
          Chosen chips ({selectedChips.length}/{CHIPS_PER_HANDOFF}) {canAct && selectedChips.length > 0 && '— tap to remove'}
        </div>
        <div className="min-h-[44px] flex flex-wrap gap-2 justify-center items-center rounded-lg p-2"
          style={{ background: 'rgba(0,0,0,0.25)', border: '1px dashed rgba(212, 168, 83, 0.2)' }}>
          {selectedChips.length === 0 ? (
            <span className="text-xs text-parchment-500 italic">No chips chosen yet</span>
          ) : (
            selectedChips.map((genre, i) => (
              <ChipBead
                key={i}
                genre={genre}
                onClick={canAct ? () => onRemove(i) : undefined}
                title={canAct ? 'Remove' : undefined}
              />
            ))
          )}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={!canAct || !full}
        className="btn-primary w-full max-w-md py-3 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {full ? `Hand chips to ${receiverName}` : `Choose ${CHIPS_PER_HANDOFF - selectedChips.length} more`}
      </button>
    </div>
  )
}

function PlaceStage({
  receiverName,
  nextChip,
  remaining,
  placedSpaceIds,
  spaces,
  players,
  canAct,
  onPlace,
  waitingLabel,
}: {
  receiverName: string
  nextChip: Genre | undefined
  remaining: number
  placedSpaceIds: number[]
  spaces: import('@/types').BoardSpace[]
  players: import('@/types').Player[]
  canAct: boolean
  onPlace: (spaceId: number) => void
  waitingLabel?: string
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-parchment-300 text-center max-w-lg">
        <span className="font-bold text-gold-300">{receiverName}</span>, place the chips on the board —
        one per tile. <span className="text-parchment-500">{remaining} left</span>
      </p>

      {nextChip && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-parchment-500">Placing:</span>
          <ChipBead genre={nextChip} />
        </div>
      )}

      {!canAct && waitingLabel && (
        <div className="text-sm text-parchment-500 italic animate-pulse-slow">{waitingLabel}</div>
      )}

      {/* Mini board */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full max-w-lg">
        {spaces.map((space) => {
          const used = placedSpaceIds.includes(space.id)
          const full = space.genreTags.length >= MAX_GENRE_TAGS
          const disabled = !canAct || used || full
          const playersHere = players.filter((p) => p.position === space.id)
          const counts = space.genreTags.reduce<Partial<Record<Genre, number>>>((acc, g) => {
            acc[g] = (acc[g] || 0) + 1
            return acc
          }, {})
          return (
            <button
              key={space.id}
              onClick={() => onPlace(space.id)}
              disabled={disabled}
              title={space.name}
              className={`relative aspect-square rounded-lg p-1 flex flex-col justify-between transition-all duration-150 ${disabled ? 'opacity-60' : 'hover:-translate-y-0.5 cursor-pointer'}`}
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
              {used && (
                <div className="absolute top-0.5 right-0.5 text-[9px]">✓</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
