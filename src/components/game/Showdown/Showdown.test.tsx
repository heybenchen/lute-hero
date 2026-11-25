import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { useGameStore } from '@/store'
import { FinalShowdown } from './index'

it('takes a solo bard from the first chord through the winner highlight without WebGL', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  const root = createRoot(host)
  async function click(label: RegExp) {
    const button = Array.from(host.querySelectorAll('button'))
      .find(b => label.test(b.getAttribute('aria-label') || b.textContent || ''))
    expect(button, String(label)).toBeDefined()
    await act(async () => button!.click())
  }
  try {
    const store = useGameStore.getState()
    store.startHotseat()
    await store.dispatch({ type: 'START_GAME', playerConfigs: [{ name: 'Lyra', starterGenre: 'Folk', color: '#4caf50' }] })
    await store.dispatch({ type: 'DEBUG_SIMULATE', round: 1, showdown: true })
    await act(async () => root.render(<FinalShowdown />))
    await click(/Face the Silence/)
    for (let verse = 1; verse <= 3; verse++) {
      // Nothing rolled yet: no reroll button (a solo showdown never adapts, so no immunity either)
      expect(host.querySelector('.song-grid button[aria-label^="Encore"]')).toBeNull()
      expect(host.querySelector('.song-grid [data-immune]')).toBeNull()
      await click(/Perform song/)
      // The reroll sits on the dice just rolled, not in a separate row
      expect(host.querySelector('.song-grid button[aria-label^="Encore"]')).not.toBeNull()
      expect(host.querySelector('[aria-label="Performance dice"]')?.children.length).toBeGreaterThan(1)
      await click(/Drop the Mic/)
      if (verse < 3) await click(/Begin Verse/)
    }
    expect(host.textContent).toContain('The Silence Is Broken!')
    await act(async () => vi.advanceTimersByTime(3300))
    await act(async () => vi.advanceTimersByTime(3000))
    expect(host.textContent).toMatch(/Lyra won \d+ fans with Folk/)
    await click(/View Tour Stats/)
    expect(useGameStore.getState().phase).toBe('gameOver')
  } finally {
    await act(async () => root.unmount())
    vi.unstubAllGlobals()
    vi.useRealTimers()
  }
})

it('marks the dice the Silence is immune to, unless Dissonance softens the hit', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    const store = useGameStore.getState()
    store.startHotseat()
    await store.dispatch({ type: 'START_GAME', playerConfigs: [{ name: 'Lyra', starterGenre: 'Folk', color: '#4caf50' }] })
    await store.dispatch({ type: 'DEBUG_SIMULATE', round: 1, showdown: true })
    const songs = useGameStore.getState().players[0].songs
    const genres = songs.flatMap((s) => (s.slots[0].dice ? [s.slots[0].dice.genre] : []))
    const immune = genres[0]
    useGameStore.setState({ showdownResistGenre: immune })
    await act(async () => root.render(<FinalShowdown />))
    const begin = Array.from(host.querySelectorAll('button')).find((b) => /Face the Silence/.test(b.textContent ?? ''))
    if (begin) await act(async () => begin.click())

    // One icon per song of the immune element, nothing else
    expect(host.querySelectorAll('.song-grid [data-immune]')).toHaveLength(genres.filter((g) => g === immune).length)

    // Dissonance (full damage against immunity by default) means nothing is dealt zero
    useGameStore.setState({ players: useGameStore.getState().players.map((p) => ({ ...p, styles: ['counterpoint'] })) })
    await act(async () => root.render(<FinalShowdown />))
    expect(host.querySelectorAll('.song-grid [data-immune]')).toHaveLength(0)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
