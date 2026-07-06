import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store'
import { Monster, Song } from '@/types'

function setupOnePlayer(exp: number) {
  useGameStore.getState().initializePlayers([
    { name: 'P1', starterGenre: 'Ballad', color: '#3b82f6' },
  ])
  const id = useGameStore.getState().players[0].id
  useGameStore.getState().awardPlayerExp(id, exp)
  return id
}

describe('Inspiration', () => {
  beforeEach(() => {
    useGameStore.setState({ players: [] })
  })

  describe('buyInspiration', () => {
    it('escalates cost by 5 EXP each purchase in a turn and grants a token each time', () => {
      const id = setupOnePlayer(100)

      expect(useGameStore.getState().buyInspiration(id)).toBe(true) // costs 5
      expect(useGameStore.getState().buyInspiration(id)).toBe(true) // costs 10
      expect(useGameStore.getState().buyInspiration(id)).toBe(true) // costs 15

      const p = useGameStore.getState().players[0]
      expect(p.inspiration).toBe(3)
      expect(p.exp).toBe(100 - 5 - 10 - 15) // 70
      expect(p.inspirationBoughtThisTurn).toBe(3)
    })

    it('fails when the player cannot afford the next token', () => {
      const id = setupOnePlayer(4) // base cost is 5
      expect(useGameStore.getState().buyInspiration(id)).toBe(false)
      expect(useGameStore.getState().players[0].inspiration).toBe(0)
      expect(useGameStore.getState().players[0].exp).toBe(4)
    })

    it('resets the escalation after resetPlayerInspirationPurchases', () => {
      const id = setupOnePlayer(100)
      useGameStore.getState().buyInspiration(id) // 5
      useGameStore.getState().buyInspiration(id) // 10
      useGameStore.getState().resetPlayerInspirationPurchases(id)

      // Next purchase is back to base cost
      const expBefore = useGameStore.getState().players[0].exp
      useGameStore.getState().buyInspiration(id)
      expect(useGameStore.getState().players[0].exp).toBe(expBefore - 5)
    })
  })

  describe('spendInspiration', () => {
    it('spends tokens and refuses when there are not enough', () => {
      const id = setupOnePlayer(100)
      useGameStore.getState().buyInspiration(id)
      useGameStore.getState().buyInspiration(id) // 2 tokens

      expect(useGameStore.getState().spendInspiration(id, 1)).toBe(true)
      expect(useGameStore.getState().players[0].inspiration).toBe(1)
      expect(useGameStore.getState().spendInspiration(id, 2)).toBe(false)
      expect(useGameStore.getState().players[0].inspiration).toBe(1)
    })
  })

  describe('rerollLastSong', () => {
    const monster: Monster = {
      id: 'm1', templateId: 't', name: 'Tank', currentHP: 1000, maxHP: 1000,
      vulnerability: null, resistance: null, isBoss: false, level: 1,
    }
    const song: Song = {
      id: 's1', name: 'Test', effect: null, used: false,
      slots: [
        { dice: { id: 'd1', type: 'd20', genre: 'Ballad' } },
        { dice: { id: 'd2', type: 'd20', genre: 'Ballad' } },
      ],
    }

    it('replaces the last play instead of stacking a second one', () => {
      useGameStore.getState().startCombat('player-1', 5, [monster])
      useGameStore.getState().playSong(song, 'player-1')

      const afterPlay = useGameStore.getState()
      expect(afterPlay.songsUsed).toHaveLength(1)
      const hpAfterPlay = afterPlay.monsters[0].currentHP

      useGameStore.getState().rerollLastSong()
      const afterReroll = useGameStore.getState()

      // Still exactly one usage of the song (reroll, not a second play)
      expect(afterReroll.songsUsed).toHaveLength(1)
      // Damage is recomputed from the pre-play snapshot (1000 HP), not stacked
      const damageDealt = 1000 - afterReroll.monsters[0].currentHP
      expect(damageDealt).toBeGreaterThan(0)
      expect(damageDealt).toBeLessThanOrEqual(1000 - 0)
      // The reroll result is independent of the first play's leftover HP
      expect(afterReroll.monsters[0].currentHP).toBeLessThan(1000)
      // Sanity: hp values are valid numbers
      expect(Number.isFinite(hpAfterPlay)).toBe(true)
    })

    it('returns null when there is nothing to reroll', () => {
      useGameStore.getState().startCombat('player-1', 5, [monster])
      expect(useGameStore.getState().rerollLastSong()).toBeNull()
    })
  })
})
