import { useRef, useState, useCallback } from 'react'
import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const ZOOM_STEP = 0.1

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
    // Only pan on middle-click or when clicking the background (not space tiles)
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

  // Allow moves if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  const handleSpaceClick = (spaceId: number) => {
    if (!canMove) return

    const isValidMove = validMoves.some((s) => s.id === spaceId)
    if (!isValidMove) return

    // Move player to space (consumes a move, not an action)
    movePlayer(currentPlayer.id, spaceId)

    // Spawn monsters (but don't auto-trigger combat)
    spawnMonstersAtSpace(spaceId)
  }

  // Paper map layout with organic positioning - optimized for 90x90 spaces
  const nodePositions: Record<number, { x: number; y: number }> = {
    0: { x: 60, y: 50 },
    1: { x: 220, y: 70 },
    2: { x: 380, y: 40 },
    3: { x: 200, y: 200 },
    4: { x: 360, y: 210 },
    5: { x: 520, y: 190 },
    6: { x: 630, y: 100 },
    7: { x: 750, y: 60 },
    8: { x: 780, y: 240 },
    9: { x: 660, y: 350 },
    10: { x: 490, y: 380 },
    11: { x: 310, y: 410 },
    12: { x: 140, y: 430 },
    13: { x: 50, y: 320 },
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #1e1812 0%, #16120d 50%, #1e1812 100%)',
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      data-board-bg
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >

      {/* Warm vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(13, 10, 7, 0.6) 100%)',
        }}
      />

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-20 flex gap-1.5">
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded-md font-medieval text-xs text-parchment-400 hover:text-gold-400 transition-colors"
            style={{
              background: 'rgba(42, 33, 24, 0.8)',
              border: '1px solid rgba(212, 168, 83, 0.2)',
            }}
          >
            Reset
          </button>
        )}
        <button
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          className="w-7 h-7 rounded-md font-bold text-sm text-parchment-400 hover:text-gold-400 transition-colors flex items-center justify-center"
          style={{
            background: 'rgba(42, 33, 24, 0.8)',
            border: '1px solid rgba(212, 168, 83, 0.2)',
          }}
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          className="w-7 h-7 rounded-md font-bold text-sm text-parchment-400 hover:text-gold-400 transition-colors flex items-center justify-center"
          style={{
            background: 'rgba(42, 33, 24, 0.8)',
            border: '1px solid rgba(212, 168, 83, 0.2)',
          }}
        >
          -
        </button>
      </div>

      {/* Map container — pan & zoom transform */}
      <div
        className="relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <div className="relative p-6" style={{ width: '950px', height: '550px' }}>
          {/* Render connections - z-index 0 to ensure connectors are underneath tiles */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0, position: 'absolute' }}>
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d4a853" stopOpacity="0.15" />
                <stop offset="50%" stopColor="#d4a853" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#d4a853" stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="activePathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e6c35a" stopOpacity="0.5" />
                <stop offset="50%" stopColor="#f0d78c" stopOpacity="0.8" />
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

                const x1 = pos1.x + 45
                const y1 = pos1.y + 45
                const x2 = pos2.x + 45
                const y2 = pos2.y + 45

                const isActivePath = validMoves.some((s) => s.id === space.id && s.connections.includes(connId)) ||
                                     validMoves.some((s) => s.id === connId && s.connections.includes(space.id))

                const midX = (x1 + x2) / 2
                const midY = (y1 + y2) / 2
                const dx = x2 - x1
                const dy = y2 - y1
                const curvature = 20
                const controlX = midX - dy / Math.sqrt(dx * dx + dy * dy) * curvature
                const controlY = midY + dx / Math.sqrt(dx * dx + dy * dy) * curvature

                return (
                  <g key={`${space.id}-${connId}`}>
                    {/* Glow layer for active paths */}
                    {isActivePath && (
                      <path
                        d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                        stroke="#d4a853"
                        strokeWidth="8"
                        fill="none"
                        opacity="0.12"
                        strokeLinecap="round"
                      />
                    )}
                    <path
                      d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                      stroke={isActivePath ? "url(#activePathGradient)" : "url(#pathGradient)"}
                      strokeWidth={isActivePath ? "3" : "1.5"}
                      fill="none"
                      strokeDasharray={isActivePath ? "8,4" : "0"}
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

          {/* Map title decoration */}
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 pointer-events-none">
            <div className="font-display text-xl text-gold-500 opacity-25 tracking-widest text-center">
              The Bardic Realm
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
