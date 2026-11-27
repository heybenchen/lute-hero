import { describe, expect, it } from 'vitest'
import { gameMonsters, mergeGameMonsters, seedMonsters, type Monster } from './data'

describe('bestiary game monsters', () => {
  it('includes every spawnable Lute Hero monster with all five sprite levels', () => {
    const monsters = gameMonsters()

    expect(monsters).toHaveLength(16)
    expect(monsters.every((monster) => monster.id.startsWith('lute-hero-'))).toBe(true)
    expect(monsters.every((monster) => monster.levels.length === 5)).toBe(true)
    expect(monsters.flatMap((monster) => monster.levels).every((level) =>
      level.imageUrl?.startsWith('game-monster://')
    )).toBe(true)
    expect(seedMonsters().slice(0, 16)).toEqual(monsters)
  })

  it('adds missing game monsters without overwriting saved entries', () => {
    const edited = {
      ...gameMonsters()[0],
      name: 'Edited name',
    }
    const custom: Monster = {
      id: 'custom',
      name: 'Custom Monster',
      type: 'fire',
      baseHp: 10,
      tagline: '',
      imageUrl: '',
      hidden: false,
      levels: [],
    }

    const merged = mergeGameMonsters([edited, custom])

    expect(merged).toHaveLength(17)
    expect(merged.find((monster) => monster.id === edited.id)?.name).toBe('Edited name')
    expect(merged).toContainEqual(custom)
  })
})
