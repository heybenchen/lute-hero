import { createInitialEngineState, type EngineState } from '@/engine/state'
import { applyAction } from '@/engine/reducer'
import { mulberry32 } from '@/engine/rng'

const MAP_PREVIEW_SEED = 0x4c555445

/** Build the same valid opening map as setup, with stable content for previews. */
export function createGameMapState(): EngineState {
  const result = applyAction(
    createInitialEngineState(),
    {
      type: 'START_GAME',
      playerConfigs: [
        { name: 'Player 1', starterGenre: 'Ballad', color: '#3b82f6' },
        { name: 'Player 2', starterGenre: 'Folk', color: '#ef4444' },
      ],
    },
    {
      rng: mulberry32(MAP_PREVIEW_SEED),
      actor: { kind: 'hotseat' },
      idSeed: 'map-layer',
    },
  )

  if (!result.ok) {
    throw new Error(`Could not create the game map state: ${result.message}`)
  }

  return result.state
}
