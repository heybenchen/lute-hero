import { describe, expect, it } from 'vitest'
import { createGameMapState } from './gameMapState'

describe('createGameMapState', () => {
  it('creates a stable playable opening map', () => {
    const first = createGameMapState()
    const second = createGameMapState()

    expect(first).toEqual(second)
    expect(first.phase).toBe('main')
    expect(first.currentRound).toBe(1)
    expect(first.spaces).toHaveLength(16)
    expect(first.players).toHaveLength(2)
    expect(first.players.map((player) => player.name)).toEqual(['Player 1', 'Player 2'])
  })
})
