import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { CurrentPlayerDisplay } from './CurrentPlayerDisplay'

export function GameView() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="font-medieval text-5xl text-center text-parchment-100 mb-8">
          🎸 Lute Hero 🎸
        </h1>

        <div className="flex gap-6">
          {/* Board - flexible width */}
          <div className="flex-1">
            <CurrentPlayerDisplay />
            <Board />
          </div>

          {/* Player panel - fixed width */}
          <div className="w-96 flex-shrink-0">
            <PlayerPanel />
          </div>
        </div>
      </div>

      {/* Combat modal overlay */}
      <CombatModal />
    </div>
  )
}
