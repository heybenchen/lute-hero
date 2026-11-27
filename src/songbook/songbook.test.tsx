import { describe, it, expect } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { ALL_STYLE_IDS, STYLES, styleCost, styleRule } from '../data/styles'
import { DEFAULT_TUNABLES, TUNABLE_FIELDS } from '../data/tunables'
import { STYLE_META, songbookEntries } from './data'
import { Songbook } from './Songbook'

describe('songbook data', () => {
  const entries = songbookEntries()

  it('has an entry for every style in the game, and nothing else', () => {
    expect(entries.map((e) => e.id).sort()).toEqual([...ALL_STYLE_IDS].sort())
    expect(Object.keys(STYLE_META).sort()).toEqual([...ALL_STYLE_IDS].sort())
  })

  it("reads each rule and price live from the game's own style code", () => {
    for (const e of entries) {
      expect(e.name).toBe(STYLES[e.id].name)
      expect(e.rule).toBe(styleRule(e.id))
      expect(e.price).toBe(styleCost(e.id))
    }
  })

  it('lists real settings with their default values', () => {
    const values = DEFAULT_TUNABLES as unknown as Record<string, number>
    for (const e of entries) {
      expect(e.settings.length).toBeGreaterThanOrEqual(1) // always the price
      for (const s of e.settings) {
        expect(TUNABLE_FIELDS.some((f) => f.path === s.key)).toBe(true)
        expect(s.value).toBe(values[s.key])
        expect(Number.isFinite(s.value)).toBe(true)
      }
    }
  })

  it('has sane simulated win rates', () => {
    for (const e of entries) {
      expect(e.win).toBeGreaterThan(20)
      expect(e.win).toBeLessThan(50)
    }
    expect(entries.filter((e) => e.group === 'original')).toHaveLength(12)
    expect(entries.filter((e) => e.group === 'lab')).toHaveLength(8)
    expect(entries.filter((e) => e.group === 'new')).toHaveLength(9)
  })
})

describe('Songbook page', () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  function mount() {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => root.render(<Songbook />))
    return {
      container,
      unmount: () => {
        act(() => root.unmount())
        container.remove()
      },
    }
  }

  function typeInto(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const cards = (container: HTMLElement) => [...container.querySelectorAll('article')].map((a) => a.id)

  it('shows every genre with its rule and price', () => {
    const { container, unmount } = mount()
    expect(container.querySelector('h1')?.textContent).toBe('Songbook')
    expect(cards(container).sort()).toEqual([...ALL_STYLE_IDS].sort())
    for (const id of ALL_STYLE_IDS) {
      const card = container.querySelector(`article#${id}`)!
      expect(card.textContent).toContain(STYLES[id].name)
      expect(card.textContent).toContain(styleRule(id))
      expect(card.textContent).toContain(`${styleCost(id)} EXP`)
    }
    unmount()
  })

  it('filters by search and by group', () => {
    const { container, unmount } = mount()
    const search = container.querySelector('input[type="search"]') as HTMLInputElement

    typeInto(search, 'immunity')
    expect(cards(container)).toContain('counterpoint')
    expect(cards(container)).not.toContain('jam-session')

    typeInto(search, 'zzzz-no-match')
    expect(cards(container)).toHaveLength(0)
    expect(container.textContent).toContain('No genre matches')

    typeInto(search, '')
    const lab = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('From the lab'))!
    act(() => lab.click())
    expect(cards(container)).toContain('jam-session')
    expect(cards(container)).not.toContain('staccato')
    expect(cards(container)).toHaveLength(8)
    const fresh = [...container.querySelectorAll('button')].find((b) => b.textContent?.startsWith('New'))!
    act(() => fresh.click())
    expect(cards(container)).toContain('dubstep')
    expect(cards(container)).toHaveLength(9)
    unmount()
  })
})
