import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { Song } from '@/types'
import { SongCard } from './SongCard'
import { SongGrid } from './SongGrid'
import { makeReroll } from './reroll'

const song: Song = {
  id: 's1',
  used: false,
  slots: [{ dice: { id: 'd1', type: 'd8', element: 'Ballad' } }],
}

function mount(node: React.ReactNode) {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  act(() => root.render(node))
  return { host, unmount: () => { act(() => root.unmount()); host.remove() } }
}

describe('SongCard', () => {
  it('puts the reroll on the dice, next to (not inside) the perform button', () => {
    const onClick = vi.fn()
    const reroll = makeReroll({ inspiration: 2, enabled: true, subject: 'song', onPaid: onClick })
    const { host, unmount } = mount(<SongCard song={song} onPlay={() => {}} disabled={false} reroll={reroll} />)
    const pill = host.querySelector('button[aria-label^="Encore"]') as HTMLButtonElement
    expect(pill).not.toBeNull()
    expect(pill.title).toContain('1 Inspiration')
    expect(pill.closest('button:not([aria-label^="Encore"])')).toBeNull() // no button inside a button
    act(() => pill.click())
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('shows the immunity icon, and says so to screen readers', () => {
    const { host, unmount } = mount(<SongCard song={song} resisted onPlay={() => {}} disabled={false} />)
    expect(host.querySelector('[data-immune]')).not.toBeNull()
    expect(host.querySelector('button')!.getAttribute('aria-label')).toContain('immune')
    unmount()
  })

  it('has neither without a reroll or immunity', () => {
    const { host, unmount } = mount(<SongCard song={song} onPlay={() => {}} disabled={false} />)
    expect(host.querySelector('[data-immune]')).toBeNull()
    expect(host.querySelector('button[aria-label^="Encore"]')).toBeNull()
    unmount()
  })
})

describe('SongGrid', () => {
  it('fills the row at six songs and only adds a seventh column for an extra slot', () => {
    const six = mount(<SongGrid count={6}><span /></SongGrid>)
    expect((six.host.firstElementChild as HTMLElement).style.getPropertyValue('--song-cols')).toBe('6')
    six.unmount()

    const seven = mount(<SongGrid count={7}><span /></SongGrid>)
    expect((seven.host.firstElementChild as HTMLElement).style.getPropertyValue('--song-cols')).toBe('7')
    seven.unmount()
  })

  it('stretches smaller rendered sets instead of reserving empty columns', () => {
    const { host, unmount } = mount(<SongGrid count={2}><span /></SongGrid>)
    const grid = host.firstElementChild as HTMLElement
    expect(grid.style.getPropertyValue('--song-cols')).toBe('2')
    expect(grid.style.getPropertyValue('--song-cols-mobile')).toBe('2')
    unmount()
  })
})

describe('makeReroll', () => {
  const noop = () => {}
  it('offers the free reroll ahead of the paid one', () => {
    const r = makeReroll({ free: { name: 'Nimble Fingers', onClick: noop }, inspiration: 0, enabled: true, subject: 'performance', onPaid: noop })
    expect(r.kind).toBe('free')
    expect(r.disabled).toBe(false) // free needs no Inspiration
    expect(r.title).toContain('Nimble Fingers')
  })
  it('disables the paid reroll with no Inspiration or while dice are in the air', () => {
    expect(makeReroll({ inspiration: 0, enabled: true, subject: 'song', onPaid: noop }).disabled).toBe(true)
    expect(makeReroll({ inspiration: 3, enabled: false, subject: 'song', onPaid: noop }).disabled).toBe(true)
    expect(makeReroll({ inspiration: 3, enabled: true, subject: 'song', onPaid: noop }).disabled).toBe(false)
  })
})
