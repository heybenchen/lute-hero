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
      await click(/Perform song/)
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
