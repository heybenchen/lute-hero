import { EngineState, createInitialEngineState } from '../engine/state'
import { GameAction } from '../engine/actions'
import { applyAction } from '../engine/reducer'
import { mulberry32, randomSeed } from '../engine/rng'
import { Driver, DispatchResult } from './types'

const STORAGE_KEY = 'lute-hero-save'
const STORAGE_VERSION = 9

interface SaveDoc {
  version: number
  engineState: EngineState
}

/** Load a resumable hotseat save, or null. */
export function loadSavedGame(): EngineState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const doc = JSON.parse(raw) as SaveDoc
    if (doc.version !== STORAGE_VERSION) return null
    if (!doc.engineState || doc.engineState.phase === 'setup') return null
    if (!doc.engineState.players?.length) return null
    return doc.engineState
  } catch {
    return null
  }
}

export function hasSavedGame(): boolean {
  return loadSavedGame() !== null
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage may not be available
  }
}

function persist(state: EngineState): void {
  try {
    const doc: SaveDoc = { version: STORAGE_VERSION, engineState: state }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch {
    // Persistence is best-effort (private browsing, quota)
  }
}

/**
 * Hotseat driver: applies actions synchronously in the browser with a fresh
 * random seed per action, and persists the full engine state (combat
 * included, so a mid-fight refresh resumes) to localStorage.
 */
export class LocalDriver implements Driver {
  private state: EngineState
  private onState: (state: EngineState) => void

  constructor(initial: EngineState | null, onState: (state: EngineState) => void) {
    this.state = initial ?? createInitialEngineState()
    this.onState = onState
    this.onState(this.state)
  }

  getState(): EngineState {
    return this.state
  }

  async dispatch(action: GameAction): Promise<DispatchResult> {
    const result = applyAction(this.state, action, {
      rng: mulberry32(randomSeed()),
      actor: { kind: 'hotseat' },
    })

    if (!result.ok) {
      return { ok: false, events: [], error: result.message }
    }

    this.state = result.state
    if (this.state.phase === 'setup') {
      // RESET_GAME: drop the save rather than persisting an empty shell
      clearSavedGame()
    } else {
      persist(this.state)
    }
    this.onState(this.state)
    return { ok: true, events: result.events }
  }

  stop(): void {
    // Nothing to tear down for local play
  }
}
