import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '@/store'
import { Genre, Song } from '@/types'

function makeSong(id: string, diceId: string, genre: Genre = 'Ballad'): Song {
  return {
    id,
    name: `Song ${id}`,
    slots: [{ dice: { id: diceId, type: 'd6', genre } }, { dice: null }],
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

  it('starts a showdown at turn 1 with zeroed fandom and no adaptation', () => {
    const ids = setupPlayers(['A', 'B'])
    useGameStore.getState().startShowdown(ids)

    const state = useGameStore.getState()
    expect(state.showdownActive).toBe(true)
    expect(state.showdownTurn).toBe(1)
    expect(state.showdownPerformerIdx).toBe(0)
    expect(state.showdownResistGenre).toBeNull()
    expect(state.showdownWeakGenre).toBeNull()
    expect(state.showdownFandom).toEqual({ [ids[0]]: 0, [ids[1]]: 0 })
  })

  it('awards fandom equal to damage dealt and records the dominant element', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    const result = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1', 'Folk'))
    expect(result).not.toBeNull()
    expect(result!.genre).toBe('Folk')
    expect(result!.fandom).toBeGreaterThan(0)
    expect(useGameStore.getState().showdownFandom[ids[0]]).toBe(result!.fandom)
    expect(useGameStore.getState().showdownCurrentGenre).toBe('Folk')
  })

  it('only allows one song per performance', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)

    expect(useGameStore.getState().playShowdownSong(makeSong('s1', 'd1'))).not.toBeNull()
    // A second, different song is refused — one song per turn
    expect(useGameStore.getState().playShowdownSong(makeSong('s2', 'd2'))).toBeNull()
    expect(useGameStore.getState().showdownSongsUsed).toEqual(['s1'])
  })

  it('applies element immunity (0x) when the boss resists the song element', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)
    useGameStore.setState({ showdownResistGenre: 'Ballad', showdownWeakGenre: 'Folk' })

    const result = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1', 'Ballad'))
    expect(result!.wasResisted).toBe(true)
    expect(result!.hitWeakness).toBe(false)
    expect(result!.fandom).toBe(0) // immune, same as monster resistance
  })

  it('applies element weakness (2x) when the song matches the exposed element', () => {
    const ids = setupPlayers(['A'])
    useGameStore.getState().startShowdown(ids)
    useGameStore.setState({ showdownResistGenre: 'Ballad', showdownWeakGenre: 'Folk' })

    const result = useGameStore.getState().playShowdownSong(makeSong('s1', 'd1', 'Folk'))
    expect(result!.hitWeakness).toBe(true)
    expect(result!.wasResisted).toBe(false)
    // 2x multiplier: a d6 roll (no crit) doubles to an even value; with a crit
    // cascade it stays a multiple of 2 as every roll is doubled
    expect(result!.fandom % 2).toBe(0)
    expect(result!.fandom).toBeGreaterThan(0)
  })

  it('advances performers, then adapts the boss between turns by element', () => {
    const ids = setupPlayers(['A', 'B'])
    useGameStore.getState().startShowdown(ids)

    // Player A performs a Ballad song
    useGameStore.getState().playShowdownSong(makeSong('a1', 'da1', 'Ballad'))
    let advance = useGameStore.getState().finishShowdownPerformance()
    expect(advance.kind).toBe('nextPerformer')
    expect(useGameStore.getState().showdownPerformerIdx).toBe(1)
    expect(useGameStore.getState().showdownSongsUsed).toEqual([])

    // Player B performs a Folk song — turn ends, boss adapts
    useGameStore.getState().playShowdownSong(makeSong('b1', 'db1', 'Folk'))
    advance = useGameStore.getState().finishShowdownPerformance()
    expect(advance.kind).toBe('bossAdapts')

    const state = useGameStore.getState()
    expect(state.showdownTurn).toBe(2)
    expect(state.showdownPerformerIdx).toBe(0)
    expect(state.showdownHistory).toHaveLength(1)

    const [perfA, perfB] = state.showdownHistory[0]
    expect(perfA.genre).toBe('Ballad')
    expect(perfB.genre).toBe('Folk')
    if (perfA.fandom !== perfB.fandom) {
      const strongest = perfA.fandom > perfB.fandom ? perfA : perfB
      const weakest = perfA.fandom > perfB.fandom ? perfB : perfA
      expect(state.showdownResistGenre).toBe(strongest.genre)
      expect(state.showdownWeakGenre).toBe(weakest.genre)
    } else {
      // Damage tie: strongest resolves to the earlier performer (A), so the
      // boss resists Ballad and is weak to Folk
      expect(state.showdownResistGenre).toBe('Ballad')
      expect(state.showdownWeakGenre).toBe('Folk')
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
    expect(player.totalBossDamage).toBe(totalFandom)
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
})
