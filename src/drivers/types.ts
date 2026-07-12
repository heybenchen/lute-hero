import { GameAction } from '../engine/actions'
import { EngineEvent } from '../engine/events'

/** Outcome of dispatching one action, with animation events for the UI. */
export interface DispatchResult {
  ok: boolean
  events: EngineEvent[]
  error?: string
}

/**
 * A driver owns the authoritative EngineState for one play mode and pushes
 * every new state into the store mirror. LocalDriver applies actions in the
 * browser (hotseat); RemoteDriver sends them to the Vercel server.
 */
export interface Driver {
  dispatch(action: GameAction): Promise<DispatchResult>
  stop(): void
}
