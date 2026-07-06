import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store'
import { Song } from '@/types'

function makeSong(id: string, diceId: string): Song {
  return {
    id,
    name: `Song ${id}`,
    slots: [{ dice: { id: diceId, type: 'd6', genre: 'Ballad' } }, { dice: null }],
    effect: null,
    used: false,
  }
}

function setupPlayers(names: string[]) {
  useGameStore.getState().initializePlayers(
    names.map((name) => ({ name, starterGenre: 'Ballad' as const, color: '#3b82f6' }))
  )
  return useGameStore.getState().players.map((p) => p.id)
}

describe('showdownSlice', () => {
  beforeEach(() => {
    useGameStore.setState({ players: [] })
    useGameStore.getState().resetShowdown()
  })

  it('starts a showdown at turn 1 with zeroed fandom for every player', () => {
    const ids = setupPlayers(['A', 'B'])
    useGameStore.getState().startShowdown(ids)

    const state = useGameStore.getState()
    expect(state.showdownActive).toBe(true)
    expect(state.showdownTurn).toBe(1)
    expect(state.showdownPerformerIdx).toBe(0)
    expect(state.showdownFandom).toEqual({ [ids[0]]: 0, [ids[1]]: 0 })
  })

  it('awards fandom equal to damage dealt when playing a song', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    const result = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1'))
    expect(result).not.toBeNull()
    expect(result!.multiplier).toBe(1)
    expect(result!.fandom).toBe(result!.rawDamage)
    expect(useGameStore.getState().showdownFandom[ids[0]]).toBe(result!.fandom)
    expect(useGameStore.getState().showdownSongsUsed).toContain('s1')
  })

  it('refuses to play the same song twice in one performance', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    const song = makeSong('s1', 'd1')
    expect(useGameStore.getState().playShowdownSong(song)).not.toBeNull()
    expect(useGameStore.getState().playShowdownSong(song)).toBeNull()
  })

  it('advances performers, then adapts the boss between turns', () => {
    const ids = setupPlayers(['A', 'B'])
    useGameStore.getState().startShowdown(ids)

    // Player A performs
    useGameStore.getState().playShowdownSong(makeSong('a1', 'da1'))
    let advance = useGameStore.getState().finishShowdownPerformance()
    expect(advance.kind).toBe('nextPerformer')
    expect(useGameStore.getState().showdownPerformerIdx).toBe(1)
    expect(useGameStore.getState().showdownSongsUsed).toEqual([])

    // Player B performs — turn ends, boss adapts
    useGameStore.getState().playShowdownSong(makeSong('b1', 'db1'))
    advance = useGameStore.getState().finishShowdownPerformance()
    expect(advance.kind).toBe('bossAdapts')

    const state = useGameStore.getState()
    expect(state.showdownTurn).toBe(2)
    expect(state.showdownPerformerIdx).toBe(0)
    expect(state.showdownHistory).toHaveLength(1)

    const [perfA, perfB] = state.showdownHistory[0]
    if (perfA.fandom !== perfB.fandom) {
      const strongest = perfA.fandom > perfB.fandom ? perfA.playerId : perfB.playerId
      const weakest = perfA.fandom > perfB.fandom ? perfB.playerId : perfA.playerId
      expect(state.showdownResistedId).toBe(strongest)
      expect(state.showdownWeakenedId).toBe(weakest)
    } else {
      expect(state.showdownResistedId).toBeNull()
      expect(state.showdownWeakenedId).toBeNull()
    }
  })

  it('completes after 3 turns and banks fandom into player fame', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    let advance
    for (let turn = 1; turn <= 3; turn++) {
      useGameStore.getState().playShowdownSong(makeSong(`s-${turn}`, `d-${turn}`))
      advance = useGameStore.getState().finishShowdownPerformance()
    }

    expect(advance!.kind).toBe('showdownComplete')
    const state = useGameStore.getState()
    expect(state.showdownComplete).toBe(true)
    expect(state.showdownHistory).toHaveLength(3)

    const player = state.players[0]
    const totalFandom = state.showdownFandom[ids[0]]
    expect(player.fame).toBe(totalFandom)
    expect(player.totalBossDamage).toBeGreaterThanOrEqual(totalFandom) // raw >= floored fandom at 1x
  })

  it('tracks best hit and crit counts per player', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    const result = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1'))
    const best = useGameStore.getState().showdownBestHit[ids[0]]
    expect(best.damage).toBe(result!.fandom)
    expect(best.songName).toBe('Song s1')
    expect(useGameStore.getState().showdownCrits[ids[0]]).toBeGreaterThanOrEqual(0)
  })

  it('applies the resistance multiplier to the resisted player', () => {
    const ids = setupPlayers(['A', 'B'])
    useGameStore.getState().startShowdown(ids)
    useGameStore.setState({ showdownResistedId: ids[0], showdownWeakenedId: ids[1] })

    const resisted = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1'))
    expect(resisted!.multiplier).toBe(0.5)
    expect(resisted!.fandom).toBe(Math.floor(resisted!.rawDamage * 0.5))
  })
})
