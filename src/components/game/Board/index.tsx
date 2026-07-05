import { useState } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'
import { GENRE_THEME, ALL_GENRES } from '@/data/genreTheme'

// Corner flourish for the map frame
function Corner({ position }: { position: string }) {
  return (
    <div
      className={`absolute w-6 h-6 sm:w-8 sm:h-8 pointer-events-none ${position}`}
      style={{
        borderColor: 'rgba(212, 168, 83, 0.35)',
        borderStyle: 'solid',
        borderWidth: position.includes('top') ? '2px 0 0' : '0 0 2px',
        ...(position.includes('left')
          ? { borderLeftWidth: '2px' }
          : { borderRightWidth: '2px' }),
      }}
    />
  )
}

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)

  const [hoveredSpaceId, setHoveredSpaceId] = useState<number | null>(null)

  if (!currentPlayer) return null

  // Allow moves if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  const hoveredSpace = hoveredSpaceId !== null ? spaces.find((s) => s.id === hoveredSpaceId) : null

  const handleSpaceClick = (spaceId: number) => {
    if (!canMove) return

    const isValidMove = validMoves.some((s) => s.id === spaceId)
    if (!isValidMove) return

    // Move player to space (consumes a move, not an action)
    movePlayer(currentPlayer.id, spaceId)

    // Spawn monsters (but don't auto-trigger combat)
    spawnMonstersAtSpace(spaceId)
  }

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-auto flex items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse at 30% 20%, rgba(212, 168, 83, 0.04) 0%, transparent 45%),
          radial-gradient(ellipse at 70% 80%, rgba(139, 111, 71, 0.05) 0%, transparent 45%),
          linear-gradient(160deg, #1b1510 0%, #131009 45%, #1b1510 100%)
        `,
      }}
    >
      {/* Subtle dot-grid map texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(212, 168, 83, 0.08) 0.8px, transparent 0.8px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Warm vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(9, 6, 3, 0.65) 100%)',
        }}
      />

      {/* Legend — bottom-left (desktop only; on mobile the tile dots + hint carry it) */}
      <div
        className="hidden lg:block absolute bottom-3 left-3 z-20 rounded-lg p-2.5 animate-fade-in"
        style={{
          background: 'rgba(18, 13, 8, 0.9)',
          border: '1px solid rgba(212, 168, 83, 0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 10px rgba(0,0,0,0.4)',
        }}
      >
        <div className="text-[9px] font-medieval text-gold-500 tracking-widest mb-1.5 uppercase opacity-80">
          Legend
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(100, 220, 100, 0.2)', border: '1px solid rgba(100, 220, 100, 0.45)' }} />
            <span className="text-[9px] text-parchment-400">Starting space</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(232, 32, 64, 0.18)', border: '1px solid rgba(232, 32, 64, 0.4)' }} />
            <span className="text-[9px] text-parchment-400">Has monsters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(255, 157, 27, 0.12)', border: '1px solid rgba(255, 157, 27, 0.3)' }} />
            <span className="text-[9px] text-parchment-400">Danger building</span>
          </div>
          <div className="pt-1 mt-1" style={{ borderTop: '1px solid rgba(212, 168, 83, 0.12)' }}>
            {ALL_GENRES.map((genre) => {
              const { color, emoji } = GENRE_THEME[genre]
              return (
                <div key={genre} className="flex items-center gap-1.5 py-0.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}88` }}
                  />
                  <span className="text-[9px] text-parchment-400">
                    {genre} <span className="opacity-60">{emoji}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-[460px] p-4 sm:p-6 lg:p-8">
        {/* Map frame corners */}
        <Corner position="top-0 left-0" />
        <Corner position="top-0 right-0" />
        <Corner position="bottom-0 left-0" />
        <Corner position="bottom-0 right-0" />

        {/* Map title decoration */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-5 pointer-events-none">
          <div className="h-px w-8 sm:w-16" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.3))' }} />
          <div className="font-display text-base sm:text-xl text-gold-500 opacity-45 tracking-[0.2em] sm:tracking-[0.25em] text-center select-none">
            The Bardic Realm
          </div>
          <div className="h-px w-8 sm:w-16" style={{ background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.3))' }} />
        </div>

        {/* 4x4 tile grid — space ids are row-major grid positions */}
        <div
          className="grid grid-cols-4 gap-2 sm:gap-3"
          onMouseLeave={() => setHoveredSpaceId(null)}
        >
          {spaces.map((space) => (
            <div
              key={space.id}
              className="animate-tile-in"
              style={{ animationDelay: `${space.id * 35}ms` }}
              // Hover handled on the wrapper: disabled tile buttons swallow mouse events
              onMouseEnter={() => setHoveredSpaceId(space.id)}
              onMouseLeave={() => setHoveredSpaceId(null)}
            >
              <BoardSpaceComponent
                space={space}
                players={players}
                isCurrentPlayer={currentPlayer.position === space.id}
                canMoveTo={validMoves.some((s) => s.id === space.id)}
                isLinkedToHovered={
                  hoveredSpace !== null &&
                  hoveredSpace !== undefined &&
                  hoveredSpace.connections.includes(space.id)
                }
                onClick={() => handleSpaceClick(space.id)}
              />
            </div>
          ))}
        </div>

        {/* Hover hint */}
        <div className="mt-3 sm:mt-4 text-center text-[11px] sm:text-xs text-parchment-500 pointer-events-none min-h-[1rem]">
          {hoveredSpace
            ? `${hoveredSpace.name} — paths to ${hoveredSpace.connections.map((id) => spaces.find((s) => s.id === id)?.name).filter(Boolean).join(', ')}`
            : canMove
            ? 'Glowing tiles are within reach'
            : ''}
        </div>
      </div>
    </div>
  )
}
