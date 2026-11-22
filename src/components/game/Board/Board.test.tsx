import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useGameStore } from '@/store'
import { getReachableMoves } from '@/game-logic/board/graphBuilder'
import { Board } from './index'

it('lets a bard pick any space within the moves they have left, and walks there', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    const store = useGameStore.getState()
    store.startHotseat()
    await store.dispatch({ type: 'START_GAME', playerConfigs: [{ name: 'Lyra', starterGenre: 'Folk', color: '#4caf50' }] })
    await act(async () => root.render(<Board />))

    const start = useGameStore.getState().players[0].position
    const reach = getReachableMoves(start, useGameStore.getState().spaces, 2)
    const enabled = () => Array.from(host.querySelectorAll('button')).filter((b) => !b.disabled && /^Move to /.test(b.getAttribute('aria-label') ?? ''))

    // Every space within two moves is selectable, and the far ones say what they cost
    expect(enabled()).toHaveLength(reach.length)
    expect(enabled().filter((b) => /\(2 moves\)/.test(b.getAttribute('aria-label') ?? ''))).toHaveLength(reach.filter((r) => r.steps === 2).length)
    expect(host.textContent).toContain('2 moves remaining')

    // Clicking a two-step space takes both steps
    const far = reach.find((r) => r.steps === 2)!
    const button = enabled().find((b) => (b.getAttribute('aria-label') ?? '').startsWith(`Move to ${far.space.name} (2 moves)`))!
    expect(button).toBeDefined()
    await act(async () => button.click())

    const me = useGameStore.getState().players[0]
    expect(me.position).toBe(far.space.id)
    expect(me.movesThisTurn).toBe(2)
    expect(host.textContent).toContain('0 moves remaining')
    // Out of moves: only stepping back (undo) stays selectable
    expect(enabled().length).toBeLessThanOrEqual(1)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('with one move left only the neighbouring spaces are selectable', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    const store = useGameStore.getState()
    store.startHotseat()
    await store.dispatch({ type: 'START_GAME', playerConfigs: [{ name: 'Lyra', starterGenre: 'Folk', color: '#4caf50' }] })
    const first = getReachableMoves(useGameStore.getState().players[0].position, useGameStore.getState().spaces, 1)[0]
    await store.dispatch({ type: 'MOVE', playerId: useGameStore.getState().players[0].id, toSpaceId: first.space.id })
    await act(async () => root.render(<Board />))

    const now = useGameStore.getState()
    const near = getReachableMoves(now.players[0].position, now.spaces, 1)
    const enabled = Array.from(host.querySelectorAll('button')).filter((b) => !b.disabled && /^Move to /.test(b.getAttribute('aria-label') ?? ''))
    expect(enabled).toHaveLength(near.length)
    expect(enabled.some((b) => /\(2 moves\)/.test(b.getAttribute('aria-label') ?? ''))).toBe(false)
    expect(host.textContent).toContain('1 move remaining')
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
