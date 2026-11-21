import { describe, it, expect } from 'vitest'
import { simulateGame } from './bot'
import { mulberry32 } from '../engine/rng'

describe('simulation bot', () => {
  it('plays a full game through the engine to the showdown', () => {
    const { showdownAfterRound, state } = simulateGame(3, mulberry32(11))
    expect(showdownAfterRound).not.toBeNull()
    expect(state.showdownActive).toBe(true)
    expect(Math.max(...state.players.map((p) => p.fame))).toBeGreaterThanOrEqual(state.tunables.fameFinalBossThreshold)
  })
})
