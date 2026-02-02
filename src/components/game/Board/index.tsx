import { useGameStore, selectCurrentPlayer } from '@/store'
import { BoardSpace as BoardSpaceComponent } from './BoardSpace'
import { getValidMoves } from '@/game-logic/board/graphBuilder'

export function Board() {
  const spaces = useGameStore((state) => state.spaces)
  const players = useGameStore((state) => state.players)
  const currentPlayer = useGameStore(selectCurrentPlayer)
  const movePlayer = useGameStore((state) => state.movePlayer)
  const spawnMonstersAtSpace = useGameStore((state) => state.spawnMonstersAtSpace)
  const startCombat = useGameStore((state) => state.startCombat)

  if (!currentPlayer) return null

  // Allow moves up to 2 spaces away if player hasn't used both moves
  const canMove = currentPlayer.movesThisTurn < 2
  const validMoves = canMove ? getValidMoves(currentPlayer.position, spaces) : []

  const handleSpaceClick = (spaceId: number) => {
    const canMove = validMoves.some((s) => s.id === spaceId)
    if (!canMove) return

    // Check if space will have monsters after spawning
    const targetSpace = spaces.find((s) => s.id === spaceId)
    const willHaveMonsters = targetSpace && (
      targetSpace.monsters.length > 0 ||
      Math.floor(targetSpace.genreTags.length / 2) > 0
    )

    // If moving to a space with monsters, need a fight action available
    const canFight = currentPlayer.fightsThisTurn < 2
    if (willHaveMonsters && !canFight) {
      return // Can't move to monster space without fight actions
    }

    // Move player to space
    movePlayer(currentPlayer.id, spaceId)

    // Spawn monsters
    spawnMonstersAtSpace(spaceId)

    // Get the updated space with monsters
    const space = useGameStore.getState().spaces.find((s) => s.id === spaceId)

    if (space && space.monsters.length > 0) {
      // Auto-trigger combat and consume a fight action
      useGameStore.getState().incrementPlayerFights(currentPlayer.id)
      startCombat(currentPlayer.id, spaceId, space.monsters)
    }
  }

  // Paper map layout with organic positioning - optimized for 90x90 spaces
  // Manually positioned nodes for better visibility and paper map aesthetic
  // Node cards are 90px wide, so need at least 100px spacing to avoid overlap
  const nodePositions: Record<number, { x: number; y: number }> = {
    0: { x: 60, y: 50 },     // Top-left edge
    1: { x: 220, y: 70 },    // Near top-left
    2: { x: 380, y: 40 },    // Top-center edge
    3: { x: 200, y: 200 },   // Left-center
    4: { x: 360, y: 210 },   // Center-left
    5: { x: 520, y: 190 },   // Center-right
    6: { x: 630, y: 100 },   // Right of top
    7: { x: 750, y: 60 },    // Top-right edge
    8: { x: 780, y: 240 },   // Right edge
    9: { x: 660, y: 350 },   // Right-center edge
    10: { x: 490, y: 380 },  // Center-bottom
    11: { x: 310, y: 410 },  // Bottom-center
    12: { x: 140, y: 430 },  // Bottom-left edge
    13: { x: 50, y: 320 },   // Left edge
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-parchment-200 via-parchment-100 to-parchment-200 rounded-xl shadow-2xl border-4 border-wood-400 overflow-hidden flex items-center justify-center">
      {/* Paper texture overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none rounded-xl"
           style={{
             backgroundImage: `
               repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 111, 71, 0.1) 2px, rgba(139, 111, 71, 0.1) 4px),
               repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 111, 71, 0.1) 2px, rgba(139, 111, 71, 0.1) 4px)
             `
           }}
      />

      {/* Map container */}
      <div className="relative">
        <div className="relative p-6" style={{ width: '950px', height: '550px' }}>
        {/* Render connections */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          <defs>
            <filter id="roughEdge">
              <feTurbulence baseFrequency="0.05" numOctaves="2" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
            </filter>
            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b6f47" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#6d5638" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#8b6f47" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          {spaces.map((space) =>
            space.connections.map((connId) => {
              const connSpace = spaces.find((s) => s.id === connId)
              if (!connSpace || connId < space.id) return null // Draw each connection once

              const pos1 = nodePositions[space.id]
              const pos2 = nodePositions[connId]

              if (!pos1 || !pos2) return null

              // Add offset to connect from center of nodes (90px / 2 = 45px)
              const x1 = pos1.x + 45
              const y1 = pos1.y + 45
              const x2 = pos2.x + 45
              const y2 = pos2.y + 45

              const isActivePath = validMoves.some((s) => s.id === space.id && s.connections.includes(connId)) ||
                                   validMoves.some((s) => s.id === connId && s.connections.includes(space.id))

              // Create a slightly curved path for paper map feel
              const midX = (x1 + x2) / 2
              const midY = (y1 + y2) / 2
              const dx = x2 - x1
              const dy = y2 - y1
              const curvature = 20
              const controlX = midX - dy / Math.sqrt(dx * dx + dy * dy) * curvature
              const controlY = midY + dx / Math.sqrt(dx * dx + dy * dy) * curvature

              return (
                <path
                  key={`${space.id}-${connId}`}
                  d={`M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`}
                  stroke={isActivePath ? "#3b82f6" : "url(#pathGradient)"}
                  strokeWidth={isActivePath ? "6" : "3"}
                  fill="none"
                  opacity={isActivePath ? "0.9" : "0.5"}
                  strokeDasharray={isActivePath ? "12,6" : "0"}
                  filter={!isActivePath ? "url(#roughEdge)" : ""}
                  strokeLinecap="round"
                />
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
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 pointer-events-none">
          <div className="font-medieval text-2xl text-wood-600 opacity-40 text-center">
            ~ The Bardic Realm ~
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
