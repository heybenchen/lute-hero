import { Board } from './Board'
import { CombatModal } from './Combat'
import { PlayerPanel } from './PlayerPanel'
import { CurrentPlayerDisplay } from './CurrentPlayerDisplay'

export function GameView() {
  return (
    <div className="h-screen flex flex-col p-4 overflow-hidden">
      <div className="max-w-[1800px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <h1 className="font-medieval text-4xl text-center text-parchment-100 mb-4">
          🎸 Lute Hero 🎸
        </h1>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Board - flexible width */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <CurrentPlayerDisplay />
            <div className="flex-1 min-h-0 overflow-auto">
              <Board />
            </div>
          </div>

          {/* Player panel - fixed width with internal scroll */}
          <div className="w-96 flex-shrink-0 overflow-auto">
            <PlayerPanel />
          </div>
        </div>
      </div>

      {/* Combat modal overlay */}
      <CombatModal />
    </div>
  )
}
