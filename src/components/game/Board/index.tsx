import { useRef, useState, useCallback } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1

// Genre colors for legend
const GENRE_COLORS: [string, string][] = [
  ['Ballad', '#e82040'],
  ['Folk', '#4caf50'],
  ['Hymn', '#00b8d4'],
  ['Shanty', '#2979ff'],
]

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)

  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const panOrigin = useRef({ x: 0, y: 0 })

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - Math.sign(e.deltaY) * ZOOM_STEP)))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement).closest('[data-board-bg]'))) {
      e.preventDefault()
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { ...pan }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    }
  }, [pan])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return
    setPan({
      x: panOrigin.current.x + (e.clientX - panStart.current.x),
      y: panOrigin.current.y + (e.clientY - panStart.current.y),
    })
  }, [isPanning])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  if (!currentPlayer) return null

  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  const handleSpaceClick = (spaceId: number) => {
    if (!canMove) return
    const isValidMove = validMoves.some((s) => s.id === spaceId)
    if (!isValidMove) return
    movePlayer(currentPlayer.id, spaceId)
    spawnMonstersAtSpace(spaceId)
  }

  // Organic map layout — edge spaces on perimeter, inner spaces fill center
  // Each space tile is 90×90; centers are at pos.x + 45, pos.y + 45
  const nodePositions: Record<number, { x: number; y: number }> = {
    0:  { x: 50,  y: 45  },   // The Forgotten Stage    — top-left edge
    1:  { x: 305, y: 38  },   // Echo Chamber           — top inner
    2:  { x: 555, y: 28  },   // The Last Venue         — top-right edge
    3:  { x: 158, y: 195 },   // Harmony Crossroads     — mid-left inner
    4:  { x: 362, y: 205 },   // The Soundwave Nexus    — center inner
    5:  { x: 520, y: 193 },   // Resonance Plaza        — center inner
    6:  { x: 660, y: 110 },   // Melody Junction        — upper-right inner
    7:  { x: 800, y: 28  },   // The Silent Amphitheater— top-far-right edge
    8:  { x: 862, y: 195 },   // Rhythm's End           — far-right edge
    9:  { x: 742, y: 352 },   // The Broken Chord       — lower-right edge
    10: { x: 520, y: 378 },   // Dissonance Square      — lower-center inner
    11: { x: 342, y: 388 },   // The Muted Hall         — lower-center-left inner
    12: { x: 148, y: 408 },   // Symphony Ruins         — bottom-left edge
    13: { x: 38,  y: 282 },   // The Quiet Quarter      — left edge
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        background: 'linear-gradient(160deg, #1b1510 0%, #131009 45%, #1b1510 100%)',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      data-board-bg
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >

      {/* Subtle dot-grid map texture */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
        aria-hidden
      >
        <defs>
          <pattern id="mapDotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.7" fill="#d4a853" opacity="0.09" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapDotGrid)" />
      </svg>

      {/* Warm vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(9, 6, 3, 0.7) 100%)',
        }}
      />

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-1.5">
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded-md font-medieval text-xs text-parchment-400 hover:text-gold-400 transition-colors"
            style={{
              background: 'rgba(30, 23, 15, 0.9)',
              border: '1px solid rgba(212, 168, 83, 0.25)',
            }}
          >
            Reset
          </button>
        )}
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          className="w-7 h-7 rounded-md font-bold text-sm text-parchment-400 hover:text-gold-400 transition-colors flex items-center justify-center"
          style={{
            background: 'rgba(30, 23, 15, 0.9)',
            border: '1px solid rgba(212, 168, 83, 0.25)',
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          className="w-7 h-7 rounded-md font-bold text-sm text-parchment-400 hover:text-gold-400 transition-colors flex items-center justify-center"
          style={{
            background: 'rgba(30, 23, 15, 0.9)',
            border: '1px solid rgba(212, 168, 83, 0.25)',
          }}
        >
          −
        </button>
      </div>

      {/* Legend — bottom-left */}
      <div
        className="absolute bottom-3 left-3 z-20 rounded-lg p-2"
        style={{
          background: 'rgba(18, 13, 8, 0.88)',
          border: '1px solid rgba(212, 168, 83, 0.18)',
        }}
      >
        <div className="text-[8px] font-medieval text-gold-600 tracking-widest mb-1.5 uppercase">
          Legend
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(100,220,100,0.25)', border: '1px solid rgba(100,220,100,0.45)' }} />
            <span className="text-[8px] text-parchment-400">Starting space</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(232,32,64,0.15)', border: '1px solid rgba(232,32,64,0.4)' }} />
            <span className="text-[8px] text-parchment-400">Has monsters</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: 'rgba(255,157,27,0.1)', border: '1px solid rgba(255,157,27,0.3)' }} />
            <span className="text-[8px] text-parchment-400">Danger building</span>
          </div>
          <div className="mt-1.5 mb-0.5 text-[7px] font-medieval text-parchment-500 tracking-wider uppercase">Genres</div>
          {GENRE_COLORS.map(([name, color]) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color, opacity: 0.85 }} />
              <span className="text-[8px] text-parchment-400">{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Map container — pan & zoom transform */}
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
          zIndex: 10,
        }}
      >
        <div className="relative p-6" style={{ width: '990px', height: '545px' }}>
          {/* SVG connection paths */}
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0, position: 'absolute' }}
          >
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#d4a853" stopOpacity="0.10" />
                <stop offset="50%"  stopColor="#d4a853" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#d4a853" stopOpacity="0.10" />
              </linearGradient>
              <linearGradient id="activePathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#e6c35a" stopOpacity="0.5" />
                <stop offset="50%"  stopColor="#f0d78c" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e6c35a" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {spaces.map((space) =>
              space.connections.map((connId) => {
                const connSpace = spaces.find((s) => s.id === connId)
                if (!connSpace || connId < space.id) return null

                const pos1 = nodePositions[space.id]
                const pos2 = nodePositions[connId]
                if (!pos1 || !pos2) return null

                // Center of each tile
                const x1 = pos1.x + 45
                const y1 = pos1.y + 45
                const x2 = pos2.x + 45
                const y2 = pos2.y + 45

                const isActivePath =
                  validMoves.some((s) => s.id === space.id && s.connections.includes(connId)) ||
                  validMoves.some((s) => s.id === connId && s.connections.includes(space.id))

                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const dx = x2 - x1
                const dy = y2 - y1
                const len = Math.sqrt(dx * dx + dy * dy)
                const curvature = 28
                const controlX = midX - (dy / len) * curvature
                const controlY = midY + (dx / len) * curvature

                return (
                  <g key={`${space.id}-${connId}`}>
                    {/* Glow halo for active paths */}
                    {isActivePath && (
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                        stroke="#d4a853"
                        strokeWidth="10"
                        fill="none"
                        opacity="0.08"
                        strokeLinecap="round"
                      />
                    )}
                    <path
                      d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                      stroke={isActivePath ? 'url(#activePathGradient)' : 'url(#pathGradient)'}
                      strokeWidth={isActivePath ? '3' : '2'}
                      fill="none"
                      strokeDasharray={isActivePath ? '8,5' : '0'}
                      strokeLinecap="round"
                    />
                  </g>
                )
              })
            )}
          </svg>

          {/* Render spaces */}
          {spaces.map((space) => {
            const pos = nodePositions[space.id]
            if (!pos) return null

            return (
              <div
                key={space.id}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  zIndex: 10,
                }}
              >
                <BoardSpaceComponent
                  space={space}
                  players={players}
                  isCurrentPlayer={currentPlayer.position === space.id}
                  canMoveTo={validMoves.some((s) => s.id === space.id)}
                  onClick={() => handleSpaceClick(space.id)}
                />
              </div>
            )
          })}

          {/* Map title */}
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className="font-display text-xl text-gold-500 opacity-45 tracking-[0.25em] text-center select-none">
              The Bardic Realm
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
