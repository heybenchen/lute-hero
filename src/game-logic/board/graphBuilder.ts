import { BoardSpace, Genre } from '@/types'

/**
 * Create the 14-space board graph with connections
 *
 * Board layout (example):
 *       0 --- 1 --- 2
 *      / \   / \   / \
 *     13  3-4   5-6  7
 *      \ / \ / \ / \ /
 *       12--11--10--9-8
 *
 * Each space connects to 3-5 neighbors
 * Edges wrap around for circular topology
 */
export function createBoardGraph(): BoardSpace[] {
  const spaces: BoardSpace[] = []

  // Define the graph structure
  // Each space connects to 3-5 others with wrap-around
  const connections: number[][] = [
    [1, 3, 13],           // 0 - edge (3 connections)
    [0, 2, 4, 5],         // 1 - inner (4 connections)
    [1, 6, 7],            // 2 - edge (3 connections)
    [0, 4, 12, 13],       // 3 - inner (4 connections)
    [1, 3, 5, 11],        // 4 - center (4 connections)
    [1, 4, 6, 10],        // 5 - center (4 connections)
    [2, 5, 7, 9],         // 6 - inner (4 connections)
    [2, 6, 8],            // 7 - edge (3 connections)
    [7, 9],               // 8 - edge (2 connections) - let's add one more
    [6, 8, 10],           // 9 - edge (3 connections)
    [5, 9, 11],           // 10 - inner (3 connections)
    [4, 10, 12],          // 11 - inner (3 connections)
    [3, 11, 13],          // 12 - edge (3 connections)
    [0, 3, 12],           // 13 - edge (3 connections)
  ]

  // Adjust to ensure minimum 3 connections
  connections[8].push(10) // 8 now has 3 connections

  // Space names
  const names = [
    'The Forgotten Stage',
    'Echo Chamber',
    'The Last Venue',
    'Harmony Crossroads',
    'The Soundwave Nexus',
    'Resonance Plaza',
    'Melody Junction',
    'The Silent Amphitheater',
    'Rhythm\'s End',
    'The Broken Chord',
    'Dissonance Square',
    'The Muted Hall',
    'Symphony Ruins',
    'The Quiet Quarter',
  ]

  // Edge spaces (where players start)
  const edgeSpaces = [0, 2, 7, 8, 9, 12, 13]

  // Create spaces
  for (let i = 0; i < 14; i++) {
    spaces.push({
      id: i,
      name: names[i],
      connections: connections[i],
      genreTags: [],
      monsters: [],
      isEdge: edgeSpaces.includes(i),
    })
  }

  return spaces
}

/**
 * Add a random genre tag to each space
 */
export function addGenreTagsToBoard(spaces: BoardSpace[]): BoardSpace[] {
  const genres: Genre[] = ['Pop', 'Rock', 'Electronic', 'Classical', 'HipHop']

  return spaces.map((space) => ({
    ...space,
    genreTags: [
      ...space.genreTags,
      genres[Math.floor(Math.random() * genres.length)],
    ],
  }))
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
