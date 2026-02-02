import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { CurrentPlayerDisplay } from './CurrentPlayerDisplay'

export function GameView() {
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
      <div className="relative z-10 flex items-center justify-center py-3 px-6">
        <div className="flex items-center gap-4">
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
