import { afterEach, describe, expect, it } from 'vitest'
import { announceDiceEvents, diceBus } from './diceBus'
import type { EngineEvent } from '@/engine/events'

const die = { dieId: 'd1', type: 'd8' as const, genre: 'Ballad' as const, values: [8, 3] }

describe('diceBus', () => {
  let release: (() => void) | null = null
  afterEach(() => {
    release?.()
    release = null
  })

  it('ignores rolls when no tray host is mounted, so cards never wait on it', async () => {
    diceBus.enqueue([die])
    expect(diceBus.current()).toBeNull()
    expect(diceBus.isInFlight('d1')).toBe(false)
    await expect(diceBus.whenSettled()).resolves.toBeUndefined()
  })

  it('tracks a throw from enqueue until the tray finishes it', async () => {
    release = diceBus.registerHost()
    diceBus.enqueue([die])
    const request = diceBus.current()
    expect(request?.dice).toEqual([die])
    expect(diceBus.isInFlight('d1')).toBe(true)

    let settled = false
    const waiting = diceBus.whenSettled().then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)

    diceBus.finish(request!.id)
    await waiting
    expect(settled).toBe(true)
    expect(diceBus.isInFlight('d1')).toBe(false)
  })

  it('plays queued throws one after another', () => {
    release = diceBus.registerHost()
    diceBus.enqueue([die])
    diceBus.enqueue([{ ...die, dieId: 'd2' }])
    const first = diceBus.current()!
    expect(first.dice[0].dieId).toBe('d1')
    diceBus.finish(first.id)
    expect(diceBus.current()!.dice[0].dieId).toBe('d2')
  })

  it('turns diceRolled events into throws with every cascade value', () => {
    release = diceBus.registerHost()
    const players = [{ songs: [{ id: 's1', slots: [{ dice: { id: 'd1', type: 'd8' as const, genre: 'Folk' as const } }] }] }]
    const events: EngineEvent[] = [{
      type: 'diceRolled', playerId: 'p1', songId: 's1', context: 'combat',
      rolls: [{ diceId: 'd1', value: 8, isCrit: true, critBonus: 5, cascadeRolls: [5] }],
    }]
    announceDiceEvents(events, players)
    expect(diceBus.current()?.dice).toEqual([{ dieId: 'd1', type: 'd8', genre: 'Folk', values: [8, 5] }])
  })
})
