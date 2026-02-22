import { useState } from 'react'
import { useGameStore, hasSavedGame, clearSavedGame } from '@/store'
import { Genre } from '@/types'

const GENRES: Genre[] = ['Ballad', 'Folk', 'Hymn', 'Shanty']
const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']

export function Setup() {
  const [playerCount, setPlayerCount] = useState(2)
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4'])
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>(['Ballad', 'Folk', 'Hymn', 'Shanty'])

  const initializePlayers = useGameStore((state) => state.initializePlayers)
  const initializeBoard = useGameStore((state) => state.initializeBoard)
  const addGenreTags = useGameStore((state) => state.addGenreTags)
  const spawnInitialMonstersOnBoard = useGameStore((state) => state.spawnInitialMonstersOnBoard)
  const startGame = useGameStore((state) => state.startGame)
  const initializeShop = useGameStore((state) => state.initializeShop)

  const handleStart = () => {
    const configs = []
    for (let i = 0; i < playerCount; i++) {
      configs.push({
        name: playerNames[i] || `Player ${i + 1}`,
        starterGenre: selectedGenres[i] || GENRES[0],
        color: PLAYER_COLORS[i] || '#888888',
      })
    }

    initializeBoard()
    initializePlayers(configs)

    const board = useGameStore.getState().spaces
    const players = useGameStore.getState().players

    players.forEach((player) => {
      const playerSpace = board.find((s) => s.id === player.position)
      if (playerSpace) {
        playerSpace.connections.forEach((connId) => {
          useGameStore.getState().updateSpace(connId, {
            genreTags: [...(board.find((s) => s.id === connId)?.genreTags || []), player.songs[0].slots[0].dice?.genre || 'Ballad']
          })
        })
      }
    })

    addGenreTags()
    spawnInitialMonstersOnBoard()
    initializeShop(playerCount)
    startGame()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 relative">
      {/* Atmospheric background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 30%, rgba(212, 168, 83, 0.06) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 100%, rgba(109, 86, 56, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      <div className="card-ornate max-w-2xl w-full relative z-10 p-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-gold-400 mb-3">
            Lute Hero
        </h1>
          <div className="h-px mx-auto w-64 mb-4" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.5), transparent)' }} />
          <p className="text-parchment-400 italic font-game text-base">
          A post-catastrophe fantasy world where only Bards remain.
          Defeat monsters by converting them into fans with the power of music!
        </p>
        </div>

        {/* Player count */}
        <div className="mb-6">
          <label className="block font-medieval text-sm text-parchment-400 uppercase tracking-wider mb-2">Number of Players</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => setPlayerCount(count)}
                className="px-6 py-2.5 rounded-lg font-medieval font-bold text-sm transition-all duration-200"
                style={{
                  background: playerCount === count
                    ? 'linear-gradient(135deg, #6d5638, #5a4529)'
                    : 'rgba(61, 48, 32, 0.4)',
                  border: playerCount === count
                    ? '1px solid rgba(212, 168, 83, 0.5)'
                    : '1px solid rgba(212, 168, 83, 0.15)',
                  color: playerCount === count ? '#f0d78c' : '#d9c49f',
                  boxShadow: playerCount === count ? '0 0 10px rgba(212, 168, 83, 0.15)' : 'none',
                }}
              >
                {count} Players
              </button>
            ))}
          </div>
        </div>

        {/* Player names and genres */}
        <div className="mb-8">
          <label className="block font-medieval text-sm text-parchment-400 uppercase tracking-wider mb-3">Player Setup</label>
          <div className="space-y-3">
            {Array.from({ length: playerCount }).map((_, idx) => (
              <div key={idx} className="flex gap-3 items-center">
                <div
                  className="player-avatar w-10 h-10 text-base flex-shrink-0"
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
                  className="flex-1 px-4 py-2 rounded-lg text-white font-game placeholder:text-parchment-500"
                  style={{
                    background: 'rgba(42, 33, 24, 0.9)',
                    border: '1px solid rgba(212, 168, 83, 0.2)',
                  }}
                  placeholder={`Player ${idx + 1} Name`}
                />

                <select
                  value={selectedGenres[idx]}
                  onChange={(e) => {
                    const newGenres = [...selectedGenres]
                    newGenres[idx] = e.target.value as Genre
                    setSelectedGenres(newGenres)
                  }}
                  className="px-4 py-2 rounded-lg text-white font-game"
                  style={{
                    background: 'rgba(42, 33, 24, 0.9)',
                    border: '1px solid rgba(212, 168, 83, 0.2)',
                  }}
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

        {/* Start / Continue buttons */}
        <div className="space-y-3">
          {hasSavedGame() && (
            <button
              onClick={() => {
                // Hydration already happened — just flip to the game phase
                const state = useGameStore.getState()
                if (state.phase !== 'setup') {
                  // Re-initialize shop (not persisted, so it's empty after reload)
                  state.initializeShop(state.players.length)
                  // Trigger a re-render — setPhase to current phase
                  useGameStore.getState().setPhase(state.phase)
                }
              }}
              className="w-full text-lg py-4 font-medieval font-bold rounded-lg transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #3d8c40, #2d6e30)',
                border: '1px solid rgba(100, 220, 100, 0.4)',
                color: '#d4ffd6',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                boxShadow: '0 0 20px rgba(100, 220, 100, 0.12), 0 4px 15px rgba(0,0,0,0.3)',
              }}
            >
              Continue Saved Game
            </button>
          )}
          <button
            onClick={() => { clearSavedGame(); handleStart() }}
            className="btn-primary w-full text-lg py-4"
            style={{
              boxShadow: '0 0 20px rgba(212, 168, 83, 0.15), 0 4px 15px rgba(0,0,0,0.3)',
            }}
          >
            {hasSavedGame() ? 'New Game' : 'Start Game'}
          </button>
        </div>

        {/* How to play */}
        <div className="mt-6 p-4 rounded-lg text-sm"
          style={{
            background: 'rgba(61, 48, 32, 0.3)',
            border: '1px solid rgba(212, 168, 83, 0.1)',
          }}
        >
          <h3 className="font-medieval font-bold mb-2 text-gold-400 text-xs uppercase tracking-wider">Quick Rules</h3>
          <ul className="list-disc list-inside space-y-1 text-parchment-400 text-xs">
            <li>Move to connected spaces each turn</li>
            <li>Genre tags spawn monsters when you enter</li>
            <li>Play songs to deal damage (AOE to all monsters)</li>
            <li>Defeat monsters to gain Fame and EXP</li>
            <li>Vulnerable genres deal 2x damage, resistant 0.5x</li>
            <li>Rolling max value = Critical Hit (double damage!)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
