import { useState } from 'react'
import { useGameStore } from '@/store'
import { Genre } from '@/types'

const GENRES: Genre[] = ['Pop', 'Rock', 'Electronic', 'Classical', 'HipHop']
const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']

export function Setup() {
  const [playerCount, setPlayerCount] = useState(2)
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4'])
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(['Pop', 'Rock', 'Electronic', 'Classical'])

  const initializePlayers = useGameStore((state) => state.initializePlayers)
  const initializeBoard = useGameStore((state) => state.initializeBoard)
  const addGenreTags = useGameStore((state) => state.addGenreTags)
  const startGame = useGameStore((state) => state.startGame)

  const handleStart = () => {
    // Create player configs
    const configs = []
    for (let i = 0; i < playerCount; i++) {
      configs.push({
        name: playerNames[i] || `Player ${i + 1}`,
        starterGenre: selectedGenres[i] || GENRES[0],
        color: PLAYER_COLORS[i] || '#888888',
      })
    }

    // Initialize game
    initializeBoard()
    initializePlayers(configs)

    // Add starting genre tags to spaces adjacent to each player's starting position
    const board = useGameStore.getState().spaces
    const players = useGameStore.getState().players

    players.forEach((player) => {
      const playerSpace = board.find((s) => s.id === player.position)
      if (playerSpace) {
        // Add player's starting genre to adjacent spaces
        playerSpace.connections.forEach((connId) => {
          useGameStore.getState().updateSpace(connId, {
            genreTags: [...(board.find((s) => s.id === connId)?.genreTags || []), player.songs[0].slots[0].dice?.genre || 'Pop']
          })
        })
      }
    })

    addGenreTags() // Add initial genre tags to all spaces
    startGame()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-2xl w-full">
        <h1 className="card-header text-4xl text-center">
          🎸 Lute Hero 🎸
        </h1>

        <p className="text-center text-lg mb-8">
          A post-catastrophe fantasy world where only Bards remain.
          Defeat monsters by converting them into fans with the power of music!
        </p>

        {/* Player count */}
        <div className="mb-6">
          <label className="block font-bold mb-2">Number of Players</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className={`px-6 py-3 rounded-lg font-bold ${
                  playerCount === count
                    ? 'bg-wood-500 text-parchment-50'
                    : 'bg-parchment-300 text-wood-600'
                }`}
              >
                {count} Players
              </button>
            ))}
          </div>
        </div>

        {/* Player names and genres */}
        <div className="mb-8">
          <label className="block font-bold mb-3">Player Setup</label>
          <div className="space-y-4">
            {Array.from({ length: playerCount }).map((_, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div
                  className="w-10 h-10 rounded-full border-2 border-wood-600 flex items-center justify-center font-bold"
                  style={{ backgroundColor: PLAYER_COLORS[idx] }}
                >
                  {idx + 1}
                </div>

                <input
                  type="text"
                  value={playerNames[idx]}
                  onChange={(e) => {
                    const newNames = [...playerNames]
                    newNames[idx] = e.target.value
                    setPlayerNames(newNames)
                  }}
                  className="flex-1 px-4 py-2 border-2 border-wood-500 rounded-lg"
                  placeholder={`Player ${idx + 1} Name`}
                />

                <select
                  value={selectedGenres[idx]}
                  onChange={(e) => {
                    const newGenres = [...selectedGenres]
                    newGenres[idx] = e.target.value as Genre
                    setSelectedGenres(newGenres)
                  }}
                  className="px-4 py-2 border-2 border-wood-500 rounded-lg"
                >
                  {GENRES.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button onClick={handleStart} className="btn-primary w-full text-xl">
          Start Game
        </button>

        {/* How to play */}
        <div className="mt-6 text-sm text-wood-500 bg-parchment-200 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Quick Rules:</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Move to connected spaces each turn</li>
            <li>Genre tags spawn monsters when you enter</li>
            <li>Play songs to deal damage (AOE to all monsters)</li>
            <li>Defeat monsters to gain Fame and EXP</li>
            <li>Vulnerable genres deal 2x damage, resistant 0.5x</li>
            <li>Rolling max value = Critical Hit (+5 bonus!)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
