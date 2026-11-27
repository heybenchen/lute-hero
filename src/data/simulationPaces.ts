/**
 * How well the playtest Simulate tab's bots play (`DEBUG_SIMULATE.pace`).
 * The expert smart bot fights and wins almost every turn and spends every EXP
 * at once, which is far ahead of people learning the game; the slower paces
 * make it slip like a person would (`SmartParams.skill`: a random move, play
 * or purchase, a skipped Studio visit, fewer encores). `scripts/sim-round-profiles.ts`
 * measures what each pace holds round by round (`src/data/roundProfiles.ts`).
 *
 * Shared code: relative imports only.
 */
export type SimulationPace = 'learning' | 'typical' | 'expert'

export interface SimulationPaceInfo {
  id: SimulationPace
  label: string
  /** `SmartParams.skill`: chance each decision is the expert pick. */
  skill: number
  help: string
}

export const SIMULATION_PACES: SimulationPaceInfo[] = [
  { id: 'learning', label: 'Learning', skill: 0.3, help: 'New players: often skip the Studio, wander, and play songs without much of a plan.' },
  { id: 'typical', label: 'Typical', skill: 0.5, help: 'A table that knows the rules but misses plenty of the best plays and buys.' },
  { id: 'expert', label: 'Expert', skill: 1, help: 'The smart bot at full strength: the best move, play and purchase every time.' },
]

/** The pace the Simulate tab starts on. */
export const DEFAULT_SIMULATION_PACE: SimulationPace = 'typical'

export function isSimulationPace(value: unknown): value is SimulationPace {
  return SIMULATION_PACES.some((p) => p.id === value)
}

/** Bot skill for a pace; an unknown or missing pace plays at full strength. */
export function paceSkill(pace: SimulationPace | undefined): number {
  return SIMULATION_PACES.find((p) => p.id === pace)?.skill ?? 1
}
