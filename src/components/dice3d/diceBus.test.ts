import { afterEach, describe, expect, it } from 'vitest'
import { announceDiceEvents, diceBus } from './diceBus'
import type { EngineEvent } from '@/engine/events'
import type { SongSlot } from '@/types'

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

  it('stays busy while held, through the hand-off to a queued throw', async () => {
    release = diceBus.registerHost()
    const unhold = diceBus.hold()
    expect(diceBus.isBusy()).toBe(true)
    let settled = false
    const waiting = diceBus.whenSettled().then(() => { settled = true })

    diceBus.enqueue([die])
    unhold()
    unhold() // idempotent
    await Promise.resolve()
    expect(diceBus.isBusy()).toBe(true)
    expect(settled).toBe(false)

    diceBus.finish(diceBus.current()!.id)
    await waiting
    expect(diceBus.isBusy()).toBe(false)
  })

  it('a hold with no throw (e.g. reduced motion) settles on release', async () => {
    const unhold = diceBus.hold()
    expect(diceBus.isBusy()).toBe(true)
    unhold()
    expect(diceBus.isBusy()).toBe(false)
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
    const players = [{ songs: [{ id: 's1', used: false, slots: [{ dice: { id: 'd1', type: 'd8', genre: 'Folk' } }] as [SongSlot] }] }]
    const events: EngineEvent[] = [{
      type: 'diceRolled', playerId: 'p1', songId: 's1', context: 'combat',
      rolls: [{ diceId: 'd1', value: 8, isCrit: true, critBonus: 5, cascadeRolls: [5] }],
    }]
    announceDiceEvents(events, players)
    expect(diceBus.current()?.dice).toEqual([{ dieId: 'd1', type: 'd8', genre: 'Folk', values: [8, 5] }])
  })

  it('throws every die of a showdown performance, across all its songs', () => {
    release = diceBus.registerHost()
    const song = (id: string, dieId: string, type: 'd4' | 'd20') =>
      ({ id, used: false, slots: [{ dice: { id: dieId, type, genre: 'Ballad' } }] as [SongSlot] })
    const players = [{ songs: [song('s1', 'b1', 'd20'), song('s2', 'b2', 'd4'), song('s3', 'b3', 'd4')] }]
    const roll = (diceId: string, value: number) => ({ diceId, value, isCrit: false, critBonus: 0, cascadeRolls: [] })
    const events: EngineEvent[] = [{
      type: 'diceRolled', playerId: 'p1', songId: 's1', songIds: ['s1', 's2', 's3'], context: 'showdown',
      rolls: [roll('b1', 14), roll('b2', 2), roll('b3', 3)],
    }]
    announceDiceEvents(events, players)
    expect(diceBus.current()?.dice.map((d) => [d.dieId, d.type, d.values[0]])).toEqual([
      ['b1', 'd20', 14],
      ['b2', 'd4', 2],
      ['b3', 'd4', 3],
    ])
  })
})
