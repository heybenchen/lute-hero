import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { CurrentPlayerDisplay } from './CurrentPlayerDisplay'

export function GameView() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="font-medieval text-5xl text-center text-parchment-100 mb-8">
          🎸 Lute Hero 🎸
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board - 2 columns */}
          <div className="lg:col-span-2">
            <CurrentPlayerDisplay />
            <Board />
          </div>

          {/* Player panel - 1 column */}
          <div>
            <PlayerPanel />
          </div>
        </div>
      </div>

      {/* Combat modal overlay */}
      <CombatModal />
    </div>
  )
}
