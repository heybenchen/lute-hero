import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store'
import { GameView } from './GameView'
import { DebugPanel } from './DebugPanel'
import { CriticalRollDialog } from './CriticalRollDialog'
import { FinalShowdown } from './Showdown'
import { FinalSummary } from './FinalSummary'
import { Setup } from './Setup'

const DEFAULT_PLAYERS = [
  { name: 'Player 1', starterGenre: 'Ballad' as const, color: '#3b82f6' },
  { name: 'Player 2', starterGenre: 'Folk' as const, color: '#ef4444' },
]

export function MapView() {
  const mode = useGameStore((state) => state.mode)
  const phase = useGameStore((state) => state.phase)
  const startHotseat = useGameStore((state) => state.startHotseat)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    startHotseat()
    const state = useGameStore.getState()
    if (state.phase === 'setup') {
      void state.dispatch({ type: 'START_GAME', playerConfigs: DEFAULT_PLAYERS })
    }
  }, [startHotseat])

  if (mode === null) return <a className="btn-primary" href="/">Return to Lute Hero</a>

  return (
    <>
      {phase === 'setup' && <Setup />}
      {phase === 'main' && <GameView />}
      {phase === 'finalBoss' && <FinalShowdown />}
      {phase === 'gameOver' && <FinalSummary />}
      <CriticalRollDialog />
      <DebugPanel />
    </>
  )
}
