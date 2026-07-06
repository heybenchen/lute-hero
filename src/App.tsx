import { useGameStore } from './store'
import { Setup } from './components/game/Setup'
import { GameView } from './components/game/GameView'
import { FinalShowdown } from './components/game/Showdown'
import { FinalSummary } from './components/game/FinalSummary'

function App() {
  const phase = useGameStore((state) => state.phase)

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
