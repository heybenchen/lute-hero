import { useEffect, useRef, useState } from 'react'
import { GameView } from '@/components/game/GameView'
import { useGameStore } from '@/store'
import { createGameMapState } from './gameMapState'

/**
 * Standalone code-layer entry that skips mode selection and setup, then opens
 * directly on a deterministic, fully interactive game map.
 */
export function GameMapLayer() {
  const loadPresetState = useGameStore((state) => state.loadPresetState)
  const initialized = useRef(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    void loadPresetState(createGameMapState()).then((loaded) => {
      if (loaded) setReady(true)
    })
  }, [loadPresetState])

  if (!ready) return null

  return <GameView />
}

export default GameMapLayer
