import { useGameStore } from './store'
import { Setup } from './components/game/Setup'
import { GameView } from './components/game/GameView'

function App() {
  const phase = useGameStore((state) => state.phase)

  if (phase === 'setup') {
    return <Setup />
  }

  return <GameView />
}

export default App
