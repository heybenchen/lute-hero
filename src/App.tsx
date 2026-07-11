import { useEffect } from 'react'
import { useGameStore } from './store'
import { Setup } from './components/game/Setup'
import { GameView } from './components/game/GameView'
import { FinalShowdown } from './components/game/Showdown'
import { FinalSummary } from './components/game/FinalSummary'

function App() {
  const phase = useGameStore((state) => state.phase)
  const mode = useGameStore((state) => state.mode)
  const startHotseat = useGameStore((state) => state.startHotseat)

  // Until online mode ships a mode-select screen, boot straight into the
  // hotseat driver (resuming any saved game).
  useEffect(() => {
    if (mode === null) startHotseat()
  }, [mode, startHotseat])

  if (mode === null) return null

  if (phase === 'setup') {
    return <Setup />
  }

  if (phase === 'finalBoss') {
    return <FinalShowdown />
  }

  if (phase === 'gameOver') {
    return <FinalSummary />
  }

  return <GameView />
}

export default App
