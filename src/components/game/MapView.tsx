import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store'
import { GameView } from './GameView'
import { DebugPanel } from './DebugPanel'

const DEFAULT_PLAYERS = [
  { name: 'Player 1', starterGenre: 'Ballad' as const, color: '#3b82f6' },
  { name: 'Player 2', starterGenre: 'Folk' as const, color: '#ef4444' },
]

/**
 * `/map` entry: skips mode select and setup, starting (or resuming) a default
 * two-player hotseat game so the board and player console load immediately.
 */
export function MapView() {
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

  if (phase === 'setup') return null

  return (
    <>
      <GameView />
      <DebugPanel />
    </>
  )
}
