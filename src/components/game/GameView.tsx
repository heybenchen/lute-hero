import { useState } from 'react'
import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { CurrentPlayerDisplay } from './CurrentPlayerDisplay'
import { useGameStore, clearSavedGame } from '@/store'

export function GameView() {
  const resetGame = useGameStore((state) => state.resetGame)
  const [showMenu, setShowMenu] = useState(false)

  const handleNewGame = () => {
    clearSavedGame()
    resetGame()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Atmospheric background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(212, 168, 83, 0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 30%, rgba(109, 86, 56, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 100%, rgba(139, 111, 71, 0.05) 0%, transparent 40%)
          `,
        }}
      />

      {/* Title bar */}
      <div className="relative z-10 flex items-center py-3 px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMenu(true)}
            className="px-3 py-1.5 rounded-lg font-medieval text-xs text-parchment-400 transition-all duration-150 hover:text-gold-400"
            style={{
              background: 'rgba(61, 48, 32, 0.4)',
              border: '1px solid rgba(212, 168, 83, 0.15)',
            }}
          >
            Menu
          </button>
          <div
            className="h-px w-16"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.5))',
            }}
          />
          <h1 className="font-display text-3xl text-gold-400 tracking-wide">
            Lute Hero
          </h1>
          <div
            className="h-px w-16"
            style={{
              background: 'linear-gradient(to left, transparent, rgba(212, 168, 83, 0.5))',
            }}
          />
        </div>
      </div>

      {/* Menu modal */}
      {showMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="card-ornate max-w-sm w-full p-8 animate-scale-in">
            <div className="text-center mb-6">
              <div className="font-display text-2xl text-gold-400 mb-2">Menu</div>
              <div className="h-px mx-auto w-32" style={{ background: 'linear-gradient(to right, transparent, rgba(212, 168, 83, 0.4), transparent)' }} />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setShowMenu(false)}
                className="btn-secondary w-full text-sm py-3"
              >
                Resume Game
              </button>
              <button
                onClick={handleNewGame}
                className="w-full text-sm py-3 font-medieval font-bold rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, #8c3d3d, #6e2d2d)',
                  border: '1px solid rgba(220, 100, 100, 0.4)',
                  color: '#ffd4d4',
                  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
                }}
              >
                New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex gap-3 flex-1 min-h-0 px-3 pb-3">
        {/* Board area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-3">
          <CurrentPlayerDisplay />
          <div className="flex-1 min-h-0 overflow-auto rounded-xl" style={{
            border: '1px solid rgba(212, 168, 83, 0.15)',
          }}>
            <Board />
          </div>
        </div>

        {/* Player panel */}
        <div className="w-80 flex-shrink-0 overflow-auto">
          <PlayerPanel />
        </div>
      </div>

      {/* Combat modal overlay */}
      <CombatModal />
    </div>
  )
}
