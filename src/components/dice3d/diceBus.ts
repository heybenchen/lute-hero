import type { DiceType, Genre } from '@/types'
import type { EngineEvent } from '@/engine/events'
import { useSyncExternalStore } from 'react'

/** One physical die to throw, with every value it shows: the roll, then each cascading crit. */
export interface TrayDie {
  dieId: string
  type: DiceType
  genre: Genre
  values: number[]
}

export interface TrayRequest {
  id: number
  dice: TrayDie[]
}

/**
 * The 3D dice tray is a UI-only effect layered over engine results that are
 * already decided. This bus queues roll requests for the (lazy-loaded) tray,
 * tracks which dice are mid-air so the 2D cards keep tumbling until the 3D
 * die lands, and lets callers hold result popups until the dice settle.
 */
let hosts = 0
let disabled = false
let nextId = 1
const queue: TrayRequest[] = []
let current: TrayRequest | null = null
const inFlight = new Set<string>()
const listeners = new Set<() => void>()
let settleWaiters: (() => void)[] = []

function notify() {
  listeners.forEach((fn) => fn())
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isIdle() {
  return current === null && queue.length === 0
}

function advance() {
  if (current === null && queue.length > 0) {
    current = queue.shift()!
  }
  if (isIdle()) {
    const waiters = settleWaiters
    settleWaiters = []
    waiters.forEach((fn) => fn())
  }
  notify()
}

export const diceBus = {
  /** A mounted tray host makes rolls eligible for the 3D effect. */
  registerHost(): () => void {
    hosts++
    return () => {
      hosts--
      if (hosts === 0) diceBus.clear()
    }
  },

  /** Turn the effect off for the session (e.g. WebGL is unavailable). */
  disable() {
    disabled = true
    diceBus.clear()
  },

  enqueue(dice: TrayDie[]) {
    if (hosts === 0 || disabled || dice.length === 0 || prefersReducedMotion()) return
    for (const die of dice) inFlight.add(die.dieId)
    queue.push({ id: nextId++, dice })
    advance()
  },

  /** The tray finished (or skipped) the current request. */
  finish(id: number) {
    if (!current || current.id !== id) return
    const stillQueued = new Set(queue.flatMap((req) => req.dice.map((d) => d.dieId)))
    for (const die of current.dice) {
      if (!stillQueued.has(die.dieId)) inFlight.delete(die.dieId)
    }
    current = null
    advance()
  },

  clear() {
    queue.length = 0
    current = null
    inFlight.clear()
    advance()
  },

  current(): TrayRequest | null {
    return current
  },

  isInFlight(dieId: string): boolean {
    return inFlight.has(dieId)
  },

  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  /** Resolves once every queued throw has landed (immediately when idle). */
  whenSettled(): Promise<void> {
    if (isIdle()) return Promise.resolve()
    return new Promise((resolve) => settleWaiters.push(resolve))
  },
}

/** Queue every `diceRolled` event in a batch of engine events for the tray. */
export function announceDiceEvents(
  events: EngineEvent[],
  players: { songs: { id: string; slots: { dice: { id: string; type: DiceType; genre: Genre } | null }[] }[] }[],
) {
  for (const event of events) {
    if (event.type !== 'diceRolled') continue
    const song = players.flatMap((p) => p.songs).find((s) => s.id === event.songId)
    if (!song) continue
    const dice: TrayDie[] = []
    for (const roll of event.rolls) {
      const die = song.slots.find((slot) => slot.dice?.id === roll.diceId)?.dice
      if (!die) continue
      dice.push({ dieId: die.id, type: die.type, genre: die.genre, values: [roll.value, ...roll.cascadeRolls] })
    }
    diceBus.enqueue(dice)
  }
}

export function useDieInFlight(dieId: string | undefined): boolean {
  return useSyncExternalStore(
    diceBus.subscribe,
    () => (dieId ? diceBus.isInFlight(dieId) : false),
    () => false,
  )
}

export function useTrayRequest(): TrayRequest | null {
  return useSyncExternalStore(diceBus.subscribe, diceBus.current, () => null)
}

/** True while any throw is queued or on the table. */
export function useDiceTrayBusy(): boolean {
  return useSyncExternalStore(diceBus.subscribe, () => diceBus.current() !== null, () => false)
}
