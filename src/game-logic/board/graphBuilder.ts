import { BoardSpace, Genre } from '@/types'

// Board is a 4x4 grid. Spaces are indexed row-major:
//
//    0   1   2   3
//    4   5   6   7
//    8   9  10  11
//   12  13  14  15
//
// Movement follows orthogonal grid adjacency (up/down/left/right).
export const GRID_SIZE = 4
export const BOARD_SPACE_COUNT = GRID_SIZE * GRID_SIZE

// The four corners are the starting spaces — maximally far apart on the grid.
export const STARTING_SPACES = [0, 3, 12, 15]

/**
 * Orthogonal neighbors of a grid cell (no wrap-around).
 */
function gridNeighbors(index: number): number[] {
  const row = Math.floor(index / GRID_SIZE)
  const col = index % GRID_SIZE
  const neighbors: number[] = []
  if (row > 0) neighbors.push(index - GRID_SIZE) // up
  if (row < GRID_SIZE - 1) neighbors.push(index + GRID_SIZE) // down
  if (col > 0) neighbors.push(index - 1) // left
  if (col < GRID_SIZE - 1) neighbors.push(index + 1) // right
  return neighbors
}

/**
 * Create the 4x4 (16-space) board graph with orthogonal-adjacency connections.
 */
export function createBoardGraph(): BoardSpace[] {
  const spaces: BoardSpace[] = []

  // Space names, in grid order (corners read as distinct entry points)
  const names = [
    'The Forgotten Stage',   // 0  (corner / start)
    'The Echo Chamber',      // 1
    'Melody Junction',       // 2
    'The Last Venue',        // 3  (corner / start)
    'Harmony Crossroads',    // 4
    'The Soundwave Nexus',   // 5
    'Resonance Plaza',       // 6
    'Silent Amphitheater',   // 7
    'Symphony Ruins',        // 8
    'Dissonance Square',     // 9
    'The Muted Hall',        // 10
    'The Broken Chord',      // 11
    'The Quiet Quarter',     // 12 (corner / start)
    'Crescendo Heights',     // 13
    'The Fading Refrain',    // 14
    "Rhythm's End",          // 15 (corner / start)
  ]

  for (let i = 0; i < BOARD_SPACE_COUNT; i++) {
    spaces.push({
      id: i,
      name: names[i],
      connections: gridNeighbors(i),
      genreTags: [],
      monsters: [],
      isEdge: STARTING_SPACES.includes(i),
    })
  }

  return spaces
}

/**
 * Add a random genre tag to each space (legacy — no longer called during gameplay)
 */
export function addGenreTagsToBoard(spaces: BoardSpace[]): BoardSpace[] {
  const genres: Genre[] = ['Ballad', 'Folk', 'Hymn', 'Shanty']

  return spaces.map((space) => ({
    ...space,
    genreTags: [
      ...space.genreTags,
      genres[Math.floor(Math.random() * genres.length)],
    ],
  }))
}

/**
 * Add a random genre tag to all neighboring spaces of a given space.
 * Called after each player's turn ends.
 */
export function addGenreTagsToNeighbors(
  spaces: BoardSpace[],
  spaceId: number
): BoardSpace[] {
  const genres: Genre[] = ['Ballad', 'Folk', 'Hymn', 'Shanty']
  const currentSpace = spaces.find((s) => s.id === spaceId)
  if (!currentSpace) return spaces

  const neighborIds = new Set(currentSpace.connections)

  return spaces.map((space) => {
    if (!neighborIds.has(space.id)) return space
    return {
      ...space,
      genreTags: [
        ...space.genreTags,
        genres[Math.floor(Math.random() * genres.length)],
      ],
    }
  })
}

/**
 * Add one tag of a specific genre to every cardinally-adjacent neighbor
 * of a given space. Used when a player clears a space and chooses which
 * element radiates outward.
 */
export function addGenreTagToNeighbors(
  spaces: BoardSpace[],
  spaceId: number,
  genre: Genre
): BoardSpace[] {
  const currentSpace = spaces.find((s) => s.id === spaceId)
  if (!currentSpace) return spaces

  const neighborIds = new Set(currentSpace.connections)

  return spaces.map((space) => {
    if (!neighborIds.has(space.id)) return space
    return {
      ...space,
      genreTags: [...space.genreTags, genre],
    }
  })
}

/**
 * Get valid move destinations from current space
 */
export function getValidMoves(
  currentSpaceId: number,
  board: BoardSpace[]
): BoardSpace[] {
  const currentSpace = board.find((s) => s.id === currentSpaceId)

  if (!currentSpace) return []

  return currentSpace.connections
    .map((id) => board.find((s) => s.id === id))
    .filter((s): s is BoardSpace => s !== undefined)
}

/**
 * Check if two spaces are connected
 */
export function areSpacesConnected(
  space1Id: number,
  space2Id: number,
  board: BoardSpace[]
): boolean {
  const space1 = board.find((s) => s.id === space1Id)
  return space1?.connections.includes(space2Id) || false
}
