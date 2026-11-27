import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx } from './reducer'
import { createInitialEngineState, normalizeEngineState, EngineState } from './state'
import { mulberry32 } from './rng'
import { hasLegacyNames, LEGACY_GENRE_IDS, migrateLegacyNames } from './legacyNames'
import { ALL_GENRE_IDS } from '../data/genres'

const ctx = (): ActionCtx => ({ rng: mulberry32(7), actor: { kind: 'hotseat' } })

function game(): EngineState {
  const r = applyAction(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [{ name: 'Alba', starterElement: 'Ballad' }, { name: 'Bryn', starterElement: 'Folk' }],
  }, ctx())
  if (!r.ok) throw new Error(r.message)
  return r.state
}

/** Turn a current state back into the pre-rename shape (the inverse of the migration). */
function toLegacy(value: unknown): unknown {
  const ids = Object.fromEntries(Object.entries(LEGACY_GENRE_IDS).map(([o, n]) => [n, o]))
  const camel: [string, string][] = [
    ['newAge', 'coda'], ['gospel', 'staccato'], ['indie', 'ostinato'], ['bebop', 'rubato'], ['bluegrass', 'virtuoso'],
    ['opera', 'fortissimo'], ['blues', 'fermata'], ['crossover', 'counterpoint'], ['barbershop', 'tutti'],
    ['screamo', 'overture'], ['disco', 'bravo'], ['country', 'hometownHero'], ['loFi', 'studioRegular'],
    ['baroque', 'steadyHands'], ['rap', 'streetPerformer'], ['house', 'chainReaction'], ['orchestra', 'swarmSinger'],
    ['mariachi', 'jamSession'], ['pop', 'ispirato'],
  ]
  const key = (k: string) => {
    if (ids[k]) return ids[k]
    if (/element/i.test(k)) return k.replace(/Element/g, 'Genre').replace(/element/g, 'genre')
    let n = k.replace(/Genre/g, 'Style').replace(/genre/g, 'style')
    for (const [to, from] of camel) {
      n = n.replace(new RegExp(`^${to}(?=[A-Z0-9_]|$)`), from)
      n = n.replace(new RegExp(`(?<=[a-z0-9])${to[0].toUpperCase()}${to.slice(1)}(?=[A-Z0-9_]|$)`), from[0].toUpperCase() + from.slice(1))
    }
    return n
  }
  if (typeof value === 'string') return ids[value] ?? (value.endsWith('-new-age') ? value.replace(/-new-age$/, '-coda') : value)
  if (Array.isArray(value)) return value.map(toLegacy)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [key(k), toLegacy(v)]))
  }
  return value
}

describe('loading saves from before the genre/element rename', () => {
  it('maps a hand-written old save to the current names', () => {
    const current = game()
    const p = current.players[0]
    const legacy = {
      ...current,
      genreOffers: undefined,
      styleOffers: ['bravo', 'hometown-hero'],
      tunables: { styleCostFortissimo: 3, fortissimoBonus: 4, maxTagsPerGenre: 4, rubatoMaxFaces: 12 },
      players: current.players.map((pl) => {
        const { starterElement, songs, ...rest } = pl
        delete (rest as Partial<typeof pl>).genres
        return {
          ...rest,
          styles: pl.id === p.id ? ['fortissimo', 'coda'] : [],
          starterGenre: starterElement,
          songs: songs.map((sg) => ({ ...sg, slots: sg.slots.map((sl) => ({ dice: sl.dice ? { id: sl.dice.id, type: sl.dice.type, genre: sl.dice.element } : null })) })),
        }
      }),
      spaces: current.spaces.map(({ elementTags, ...sp }) => ({ ...sp, genreTags: elementTags })),
      combat: { ...current.combat, stylesUsed: ['tutti'], lastPlayFlags: { staccatoCall: true } },
    } as unknown as EngineState
    delete (legacy as unknown as Record<string, unknown>).genreOffers
    const s = normalizeEngineState(legacy)
    expect(s.genreOffers).toEqual(['disco', 'country'])
    expect(s.players[0].genres).toEqual(['opera', 'new-age'])
    expect(s.players[0].starterElement).toBe(p.starterElement)
    expect(s.players[0].songs[0].slots[0].dice?.element).toBe(p.songs[0].slots[0].dice?.element)
    expect(s.spaces.map((sp) => sp.elementTags)).toEqual(current.spaces.map((sp) => sp.elementTags))
    expect(s.tunables).toMatchObject({ genreCostOpera: 3, operaBonus: 4, maxTagsPerElement: 4, bebopMaxFaces: 12 })
    expect(s.combat.genresUsed).toEqual(['barbershop'])
    expect(s.combat.lastPlayFlags).toEqual({ gospelCall: true })
  })

  it('restores a played game exactly from its pre-rename form', () => {
    const base = game()
    const current = normalizeEngineState({
      ...base,
      genreOffers: ['opera', 'new-age'],
      players: base.players.map((pl, i) => i === 0
        ? { ...pl, genres: ['new-age', 'country'] as typeof pl.genres, songs: [...pl.songs, { id: `${pl.id}-new-age`, used: false, slots: [{ dice: null }] }] }
        : pl),
    })
    const legacy = toLegacy(current) as EngineState
    expect(hasLegacyNames(legacy)).toBe(true)
    expect(JSON.stringify(legacy)).toContain('"styleOffers":["fortissimo","coda"]')
    expect(normalizeEngineState(legacy)).toEqual(current)
  })

  it('leaves a current state alone', () => {
    const s = game()
    expect(hasLegacyNames(s)).toBe(false)
    expect(migrateLegacyNames(s)).toBe(s)
  })

  it('knows every old id, and maps each to a current genre', () => {
    expect(Object.keys(LEGACY_GENRE_IDS)).toHaveLength(20)
    for (const id of Object.values(LEGACY_GENRE_IDS)) expect(ALL_GENRE_IDS).toContain(id)
  })
})
