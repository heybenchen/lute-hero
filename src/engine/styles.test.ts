import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx, computeCombatRewards } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { DiceType, Genre, Monster, Song, StyleId } from '../types'
import { ALL_STYLE_IDS, STYLES, styleCost, styleRule } from '../data/styles'
import { upgradeCostFor } from './economy'
import { DEFAULT_TUNABLES } from '../data/tunables'
import { rollSongWithStyles } from '../game-logic/styles/styleEffects'
import { specsForStyles } from '../data/styleSpecs'

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/**
 * A scripted RNG that rolls the given die faces in order. Each entry is
 * [face, sides]; rollDie computes floor(r * sides) + 1, so r = (face - 0.5) / sides.
 * Once the script runs out it falls back to a seeded RNG.
 */
function faces(...script: [number, number][]): ActionCtx {
  const fallback = mulberry32(7)
  let i = 0
  return {
    rng: () => (i < script.length ? (script[i][0] - 0.5) / script[i++][1] : fallback()),
    actor: { kind: 'hotseat' },
  }
}

const seeded = (seed = 42): ActionCtx => ({ rng: mulberry32(seed), actor: { kind: 'hotseat' } })

function apply(state: EngineState, action: GameAction, c: ActionCtx = seeded()) {
  const result = applyAction(state, action, c)
  if (!result.ok) throw new Error(`${action.type} failed: ${result.message}`)
  return result
}

function startGame(): EngineState {
  return apply(createInitialEngineState(), {
    type: 'START_GAME',
    playerConfigs: [
      { name: 'Alba', starterGenre: 'Ballad' },
      { name: 'Bryn', starterGenre: 'Folk' },
    ],
  }).state
}

type DieSpec = [DiceType, Genre] | null

/** Give player-1 these styles and songs (one die each), then start a fight with these monsters. */
function fight(styles: StyleId[], dice: DieSpec[], monsters: Partial<Monster>[]): EngineState {
  let state = startGame()
  const songs: Song[] = dice.map((spec, i) => ({
    id: `player-1-song-${i + 1}`,
    used: false,
    slots: [{ dice: spec ? { id: `die-${i + 1}`, type: spec[0], genre: spec[1] } : null }],
  }))
  state = {
    ...state,
    players: state.players.map((p) => (p.id === 'player-1' ? { ...p, styles, songs } : p)),
    spaces: state.spaces.map((s) => (s.id === 0 ? { ...s, genreTags: ['Hymn'] } : s)),
  }
  state = apply(state, { type: 'START_COMBAT', playerId: 'player-1' }).state
  return {
    ...state,
    combat: {
      ...state.combat,
      monsters: monsters.map((m, i) => ({
        id: `m${i + 1}`,
        templateId: 't',
        name: `Monster ${i + 1}`,
        currentHP: 50,
        maxHP: 50,
        vulnerability: null,
        resistance: null,
        isBoss: false,
        level: 1,
        ...m,
      })),
    },
  }
}

function play(state: EngineState, song: number, c: ActionCtx, target = 'm1') {
  return apply(state, { type: 'PLAY_SONG', songId: `player-1-song-${song}`, targetMonsterId: target }, c)
}

const hp = (state: EngineState, id = 'm1') => state.combat.monsters.find((m) => m.id === id)!.currentHP
const spent = (state: EngineState, song: number) => state.combat.spentSongIds.includes(`player-1-song-${song}`)

// ------------------------------------------------------------------
// Dice-roll styles
// ------------------------------------------------------------------

describe('Ostinato', () => {
  it('makes a d4 crit on a 3, and the bonus die needs a 4 to keep going', () => {
    const state = fight(['ostinato'], [['d4', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([3, 4], [3, 4]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 3, isCrit: true, cascadeRolls: [3] })
    expect(hp(after)).toBe(50 - 6)
    expect(after.combat.styleNotes).toContain(STYLES.ostinato.name)
  })

  it('makes every die crit one number lower (a d20 on a 19)', () => {
    const state = fight(['ostinato'], [['d20', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    const { state: after } = play(state, 1, faces([19, 20], [5, 20]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 19, isCrit: true, cascadeRolls: [5] })
  })

  it('leaves a 3 as a plain roll without the style', () => {
    const state = fight([], [['d4', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([3, 4]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 3, isCrit: false, cascadeRolls: [] })
  })
})

describe('Fortissimo (Opera)', () => {
  it('raises the rolled value of every d20, so an 18 becomes a crit', () => {
    const state = fight(['fortissimo'], [['d20', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([18, 20]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 18, bonus: DEFAULT_TUNABLES.fortissimoBonus, isCrit: true })
  })

  it('adds a flat +2 that never crits when fortissimoRaisesFace is off', () => {
    const state = fight(['fortissimo'], [['d20', 'Hymn']], [{}])
    state.tunables = { ...state.tunables, fortissimoRaisesFace: 0 }
    const { state: after } = play(state, 1, faces([18, 20]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 18, bonus: DEFAULT_TUNABLES.fortissimoBonus, isCrit: false })
    expect(hp(after)).toBe(50 - (18 + DEFAULT_TUNABLES.fortissimoBonus))
  })

  it('does nothing for smaller dice', () => {
    const state = fight(['fortissimo'], [['d12', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([7, 12]))
    expect(after.combat.rolls[0].bonus).toBeUndefined()
    expect(hp(after)).toBe(43)
  })
})

describe('Overture and Tutti', () => {
  it('Overture adds its bonus to the first roll of the turn only, and never crits', () => {
    const state = fight(['overture'], [['d4', 'Hymn'], ['d4', 'Hymn']], [{}])
    const first = play(state, 1, faces([3, 4])).state
    expect(first.combat.rolls[0]).toMatchObject({ value: 3, bonus: DEFAULT_TUNABLES.overtureBonus, isCrit: false })
    const second = play(first, 2, faces([3, 4])).state
    expect(second.combat.rolls[0].bonus).toBeUndefined()
  })

  it('Tutti adds its bonus to every die (on top of the face, never a crit) only when your songs hold all four elements', () => {
    const allFour: DieSpec[] = [['d4', 'Ballad'], ['d4', 'Folk'], ['d4', 'Hymn'], ['d4', 'Shanty']]
    const withAll = play(fight(['tutti'], allFour, [{}]), 1, faces([2, 4])).state
    expect(withAll.combat.rolls[0]).toMatchObject({ value: 2, bonus: DEFAULT_TUNABLES.tuttiBonus, isCrit: false })
    // ...and again on a later play, not just the turn's first roll
    const later = play(withAll, 2, faces([3, 4])).state
    expect(later.combat.rolls[0]).toMatchObject({ value: 3, bonus: DEFAULT_TUNABLES.tuttiBonus, isCrit: false })

    const missingOne = play(fight(['tutti'], allFour.slice(0, 3), [{}]), 1, faces([2, 4])).state
    expect(missingOne.combat.rolls[0].bonus).toBeUndefined()
  })
})

describe('Virtuoso (Bluegrass)', () => {
  it('rolls every d8 twice and keeps the higher, not just once a turn', () => {
    const state = fight(['virtuoso'], [['d8', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    const first = play(state, 1, faces([4, 8], [7, 8])).state
    expect(first.combat.rolls[0].value).toBe(7)
    const second = play(first, 2, faces([6, 8], [2, 8])).state
    expect(second.combat.rolls[0].value).toBe(6)
  })

  it('covers d8s only: not a d4, d12 or d20', () => {
    const d4 = play(fight(['virtuoso'], [['d4', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([1, 4], [3, 4])).state
    expect(d4.combat.rolls[0].value).toBe(1)
    const d12 = play(fight(['virtuoso'], [['d12', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([4, 12], [10, 12])).state
    expect(d12.combat.rolls[0].value).toBe(4)
    const d20 = play(fight(['virtuoso'], [['d20', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([4, 20], [15, 20])).state
    expect(d20.combat.rolls[0].value).toBe(4)
  })
})

// ------------------------------------------------------------------
// Song-economy styles
// ------------------------------------------------------------------

describe('Fermata (Blues)', () => {
  const linger = (state: EngineState, song: number) =>
    applyAction(state, { type: 'LINGER_SONG', songId: `player-1-song-${song}` }, seeded())
  const withInspiration = (state: EngineState, n: number) =>
    ({ ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: n } : p)) })

  it('refreshes a spent d20 song for Inspiration, once per turn, when the bard chooses', () => {
    let state = withInspiration(fight(['fermata'], [['d20', 'Hymn'], ['d20', 'Hymn']], [{ currentHP: 100, maxHP: 100 }]), 3)
    state = play(state, 1, faces([5, 20])).state
    expect(spent(state, 1)).toBe(true) // no automatic hold any more
    const lingered = linger(state, 1)
    expect(lingered.ok).toBe(true)
    state = lingered.ok ? lingered.state : state
    expect(spent(state, 1)).toBe(false)
    expect(state.players[0].inspiration).toBe(3 - DEFAULT_TUNABLES.fermataInspirationCost)
    expect(state.combat.styleNotes).toContain(STYLES.fermata.name)
    state = play(state, 2, faces([5, 20])).state
    expect(linger(state, 2).ok).toBe(false) // once per turn
  })

  it('only refreshes a spent song of its size, and only with the Inspiration to pay', () => {
    let state = withInspiration(fight(['fermata'], [['d12', 'Hymn'], ['d20', 'Hymn']], [{ currentHP: 100, maxHP: 100 }]), 3)
    expect(linger(state, 2).ok).toBe(false) // not spent
    state = play(state, 1, faces([5, 12])).state
    expect(linger(state, 1).ok).toBe(false) // a d12 is too small
    state = withInspiration(play(state, 2, faces([5, 20])).state, 0)
    expect(linger(state, 2).ok).toBe(false) // can't pay
  })
})

describe('Staccato (Gospel)', () => {
  const rally = (state: EngineState, song: number) =>
    applyAction(state, { type: 'RALLY_SONG', songId: `player-1-song-${song}` }, seeded())
  const call = (state: EngineState, song: number, c: ActionCtx, target = 'm1') =>
    apply(state, { type: 'PLAY_SONG', songId: `player-1-song-${song}`, targetMonsterId: target, staccatoCall: true }, c)

  it('a called win lets you refresh one spent song of your choice', () => {
    const dice: DieSpec[] = [['d8', 'Hymn'], ['d4', 'Hymn'], ['d20', 'Hymn']]
    let state = fight(['staccato'], dice, [{ currentHP: 5, maxHP: 5 }, { currentHP: 50, maxHP: 50 }])
    state = play(state, 1, faces([1, 8]), 'm1').state
    state = play(state, 2, faces([1, 4]), 'm1').state
    expect(spent(state, 1) && spent(state, 2)).toBe(true)
    expect(rally(state, 1).ok).toBe(false) // nothing called yet

    state = call(state, 3, faces([10, 20]), 'm1').state // the d20 wins the called monster over
    expect(state.combat.rallyReady).toBe(true)
    expect(state.combat.stylesUsed).toContain('staccato')
    const rallied = rally(state, 1)
    expect(rallied.ok).toBe(true)
    state = rallied.ok ? rallied.state : state
    expect(spent(state, 1)).toBe(false)
    expect(spent(state, 2)).toBe(true) // only the chosen song comes back
    expect(state.combat.styleNotes).toContain(STYLES.staccato.name)

    // Once per turn: no second call, no second refresh
    expect(applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm2', staccatoCall: true }, faces([1, 8])).ok).toBe(false)
    state = play(state, 1, faces([1, 8]), 'm2').state
    expect(rally(state, 1).ok).toBe(false)
  })

  it('a win without a call does nothing, and a wrong call uses it up', () => {
    let state = fight(['staccato'], [['d4', 'Hymn'], ['d20', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 5, maxHP: 5 }, { currentHP: 80, maxHP: 80 }])
    state = play(state, 1, faces([1, 4]), 'm1').state
    state = play(state, 2, faces([10, 20]), 'm1').state // a tame, but not called
    expect(state.combat.rallyReady).toBe(false)
    state = call(state, 3, faces([1, 8]), 'm2').state // called, but only moved it
    expect(state.combat.rallyReady).toBe(false)
    expect(state.combat.stylesUsed).toContain('staccato')
  })

  it('refreshes any spent song of your own, d20 included', () => {
    let state = fight(['staccato'], [['d20', 'Hymn'], ['d4', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 12, maxHP: 12 }, { currentHP: 80, maxHP: 80 }])
    state = play(state, 1, faces([5, 20]), 'm1').state // the d20 is spent, m1 is moved
    state = call(state, 3, faces([8, 8], [1, 8]), 'm1').state // called win
    expect(rally(state, 2).ok).toBe(false) // never spent
    expect(applyAction(state, { type: 'RALLY_SONG', songId: 'player-2-song-1' }, seeded()).ok).toBe(false)
    expect(rally(state, 1).ok).toBe(true) // the d20 comes back
  })

  it('an encore of a called play replays the call, and a refresh survives an earlier encore', () => {
    let state = fight(['staccato'], [['d20', 'Hymn'], ['d8', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 12, maxHP: 12 }, { currentHP: 80, maxHP: 80 }])
    state = play(state, 2, faces([1, 8]), 'm1').state // song 2 spent
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: 3 } : p)) }
    state = call(state, 1, faces([5, 20]), 'm1').state // called, but missed
    expect(state.combat.rallyReady).toBe(false)
    state = apply(state, { type: 'REROLL_SONG' }, faces([15, 20])).state // the encore wins it over
    expect(state.combat.rallyReady).toBe(true)
    const rallied = rally(state, 2)
    state = rallied.ok ? rallied.state : state
    expect(spent(state, 2)).toBe(false)
  })
})

describe('Counterpoint', () => {
  it('turns the first immune hit each turn into partial damage', () => {
    const state = fight(['counterpoint'], [['d8', 'Hymn'], ['d8', 'Hymn']], [{ resistance: 'Hymn' }])
    const first = play(state, 1, faces([4, 8])).state
    expect(hp(first)).toBe(50 - Math.floor(4 * DEFAULT_TUNABLES.counterpointMultiplier))
    expect(first.combat.styleNotes).toContain(STYLES.counterpoint.name)
    const second = play(first, 2, faces([4, 8])).state
    expect(hp(second)).toBe(hp(first))
  })
})

describe('Rubato', () => {
  it('rerolls for free, up to its uses per turn (once by default)', () => {
    let state = fight(['rubato'], [['d8', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    expect(DEFAULT_TUNABLES.rubatoUsesPerTurn).toBe(1)
    const inspiration = state.players[0].inspiration
    state = play(state, 1, faces([2, 8])).state
    state = apply(state, { type: 'REROLL_SONG', rubato: true }, faces([7, 8])).state
    expect(hp(state)).toBe(100 - 7)
    expect(state.players[0].inspiration).toBe(inspiration)
    expect(applyAction(state, { type: 'REROLL_SONG', rubato: true }, seeded()).ok).toBe(false)
    // A paid reroll afterwards doesn't bring Rubato back
    state = apply(state, { type: 'REROLL_SONG' }, faces([3, 8])).state
    expect(state.combat.stylesUsed).toContain('rubato')
  })

  it('keeps the higher roll: a worse reroll does not replace a better first roll', () => {
    let state = fight(['rubato'], [['d8', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    state = play(state, 1, faces([7, 8])).state
    expect(hp(state)).toBe(100 - 7)
    state = apply(state, { type: 'REROLL_SONG', rubato: true }, faces([2, 8])).state
    expect(hp(state)).toBe(100 - 7) // the 7 stands
    expect(state.combat.rolls[0].value).toBe(7)
    expect(state.combat.stylesUsed).toContain('rubato') // the use is still spent
    expect(state.combat.styleNotes.join(' ')).toContain('kept your higher first roll')
  })

  it('takes a better reroll', () => {
    let state = fight(['rubato'], [['d8', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    state = play(state, 1, faces([2, 8])).state
    state = apply(state, { type: 'REROLL_SONG', rubato: true }, faces([7, 8])).state
    expect(hp(state)).toBe(100 - 7)
  })

  it('works on any die by default', () => {
    let state = fight(['rubato'], [['d20', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    state = play(state, 1, faces([2, 20])).state
    expect(applyAction(state, { type: 'REROLL_SONG', rubato: true }, seeded()).ok).toBe(true)
  })

  it('cannot reroll dice above its size limit', () => {
    let state = fight(['rubato'], [['d12', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    state = { ...state, tunables: { ...state.tunables, rubatoMaxFaces: 8 } }
    state = play(state, 1, faces([2, 12])).state
    expect(applyAction(state, { type: 'REROLL_SONG', rubato: true }, seeded()).ok).toBe(false)
  })
})

describe('Bravo', () => {
  it('adds Fame for every monster tamed at or above its level gate', () => {
    const gate = DEFAULT_TUNABLES.bravoMinLevel
    let low = fight(['bravo'], [['d20', 'Hymn']], [{ currentHP: 1, maxHP: 1, level: gate - 1 }])
    low = play(low, 1, faces([10, 20])).state
    expect(computeCombatRewards(low.combat, ['bravo']).bravoFame).toBe(0)

    let state = fight(['bravo'], [['d20', 'Hymn']], [{ currentHP: 1, maxHP: 1, level: gate }])
    state = play(state, 1, faces([10, 20])).state
    const plain = computeCombatRewards(state.combat)
    const cheered = computeCombatRewards(state.combat, ['bravo'])
    expect(cheered.fighterFame - plain.fighterFame).toBe(DEFAULT_TUNABLES.bravoFamePerTame)
    const fame = state.players[0].fame
    state = apply(state, { type: 'END_COMBAT', spreadGenre: 'Folk' }).state
    expect(state.players[0].fame - fame).toBe(cheered.fighterFame)
  })
})

// ------------------------------------------------------------------
// Studio: buying, replacing, refreshing, turn starts
// ------------------------------------------------------------------

function studio(styles: StyleId[], offers: StyleId[], exp = 20): EngineState {
  let state = startGame()
  state = {
    ...state,
    styleOffers: offers,
    players: state.players.map((p) => (p.id === 'player-1' ? { ...p, styles, exp } : p)),
  }
  return apply(state, { type: 'OPEN_STUDIO', playerId: 'player-1' }).state
}

describe('Buying styles', () => {
  it('spends EXP and takes the style off the shelf', () => {
    const state = apply(studio([], ['overture', 'bravo']), { type: 'BUY_STYLE', offerIndex: 1 }).state
    expect(state.players[0].styles).toEqual(['bravo'])
    expect(state.players[0].exp).toBe(20 - styleCost('bravo'))
    expect(state.styleOffers).toEqual(['overture'])
  })

  it('needs a style to replace at the cap of two', () => {
    const full = studio(['overture', 'bravo'], ['fermata'])
    expect(applyAction(full, { type: 'BUY_STYLE', offerIndex: 0 }, seeded()).ok).toBe(false)
    const state = apply(full, { type: 'BUY_STYLE', offerIndex: 0, replaceStyleId: 'overture' }).state
    expect(state.players[0].styles).toEqual(['fermata', 'bravo'])
  })

  it('refuses a style you cannot afford', () => {
    expect(applyAction(studio([], ['fortissimo'], 1), { type: 'BUY_STYLE', offerIndex: 0 }, seeded()).ok).toBe(false)
  })

  it('Coda (New Age) adds a 7th song; giving it up with that song in use means naming a song to give up', () => {
    let state = apply(studio([], ['coda']), { type: 'BUY_STYLE', offerIndex: 0 }).state
    const player = state.players[0]
    expect(player.songs).toHaveLength(7)
    const codaSong = player.songs[6]
    state = {
      ...state,
      styleOffers: ['bravo', 'overture'],
      players: state.players.map((p) => (p.id === 'player-1' ? {
        ...p,
        styles: ['coda', 'tutti'],
        songs: p.songs.map((sg) => (sg.id === codaSong.id ? { ...sg, slots: [{ dice: { id: 'coda-die', type: 'd12', genre: 'Hymn' } }] as Song['slots'] } : sg)),
      } : p)),
    }
    expect(applyAction(state, { type: 'BUY_STYLE', offerIndex: 0, replaceStyleId: 'coda' }, seeded()).ok).toBe(false) // must name a song
    const firstSong = state.players[0].songs[0]
    state = apply(state, { type: 'BUY_STYLE', offerIndex: 0, replaceStyleId: 'coda', giveUpSongId: firstSong.id }).state
    const songs = state.players[0].songs
    expect(songs).toHaveLength(6)
    expect(songs[0].slots[0].dice?.id).toBe('coda-die') // the 7th song's die took the given-up song's place
    expect(state.pendingRewards['player-1'] ?? []).toHaveLength(0) // the given-up die is lost
  })

  it('Coda (New Age) leaves without a choice when its 7th song is empty', () => {
    let state = apply(studio([], ['coda']), { type: 'BUY_STYLE', offerIndex: 0 }).state
    state = { ...state, styleOffers: ['bravo'], players: state.players.map((p) => (p.id === 'player-1' ? { ...p, styles: ['coda', 'tutti'] } : p)) }
    state = apply(state, { type: 'BUY_STYLE', offerIndex: 0, replaceStyleId: 'coda' }).state
    expect(state.players[0].songs).toHaveLength(6)
  })

  it('refreshes the shelf for 1 Inspiration with styles you do not own', () => {
    const before = studio(['overture'], ['bravo', 'tutti'])
    const state = apply(before, { type: 'REFRESH_STYLE_OFFERS' }).state
    expect(state.players[0].inspiration).toBe(before.players[0].inspiration - 1)
    expect(state.styleOffers).toHaveLength(2)
    expect(state.styleOffers).not.toContain('overture')
    expect(ALL_STYLE_IDS).toEqual(expect.arrayContaining(state.styleOffers))
  })

  it('refreshes element and style offers together for 1 Inspiration', () => {
    const before = studio(['overture'], ['bravo', 'tutti'])
    const state = apply(before, { type: 'REFRESH_ELEMENT_OFFERS' }).state
    expect(state.players[0].inspiration).toBe(before.players[0].inspiration - 1)
    expect(state.elementOffers).toHaveLength(4)
    expect(state.styleOffers).toHaveLength(2)
    expect(state.styleOffers).not.toContain('overture')
    expect(state.styleOffers).not.toContain('bravo')
    expect(state.styleOffers).not.toContain('tutti')
  })
})

describe('Turn starts', () => {
  it('keeps a full style shelf unchanged between turns', () => {
    const state = { ...startGame(), styleOffers: ['bravo', 'coda'] as StyleId[] }
    const next = apply(state, { type: 'END_TURN' }, seeded()).state
    expect(next.styleOffers).toEqual(['bravo', 'coda'])
  })

  it('refills only empty style shelf slots at the end of a turn', () => {
    const state = { ...startGame(), styleOffers: ['bravo'] as StyleId[] }
    const next = apply(state, { type: 'END_TURN' }, seeded()).state
    expect(next.styleOffers).toHaveLength(2)
    expect(next.styleOffers[0]).toBe('bravo')
    expect(next.styleOffers[1]).not.toBe('bravo')
  })

  it("Muse's Favor (Pop) gives Inspiration before each concert, not at the start of the turn", () => {
    let state = startGame()
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, styles: ['ispirato'], inspiration: 0 } : p)) }
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.players[1].inspiration).toBe(0)

    let before = startGame()
    before = { ...before, players: before.players.map((p, i) => (i === 0 ? { ...p, styles: ['ispirato'], inspiration: 0 } : p)) }
    const started = apply(before, { type: 'START_COMBAT', playerId: 'player-1' }).state
    expect(started.players[0].inspiration).toBe(DEFAULT_TUNABLES.ispiratoPerTurn) // already there for the concert
  })

  it('remembers the Inspiration a bard started their turn with (for Soul)', () => {
    let state = startGame()
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, inspiration: 4 } : p)) }
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.turnStartInspiration).toBe(4)
  })
})

// ------------------------------------------------------------------
// Studio styles built from the style lab (data-defined specs)
// ------------------------------------------------------------------

describe('Studio spec styles', () => {
  it('Hometown Hero adds its bonus to the starting element, and it can crit', () => {
    let state = fight(['hometown-hero'], [['d4', 'Hymn']], [{}])
    state = { ...state, players: state.players.map((p) => (p.id === 'player-1' ? { ...p, starterGenre: 'Hymn' } : p)) }
    const { state: after } = play(state, 1, faces([3, 4], [1, 4]))
    expect(after.combat.rolls[0].isCrit).toBe(true)
    expect(after.combat.styleNotes).toContain(STYLES['hometown-hero'].name)
  })

  it('Steady Hands (Baroque) raises a low roll, which can then crit, and leaves higher rolls alone', () => {
    const { steadyHandsBonus: up, steadyHandsAtMost: atMost } = DEFAULT_TUNABLES
    const low = play(fight(['steady-hands'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([1, 8])).state
    expect(low.combat.rolls[0]).toMatchObject({ value: 1, bonus: up, isCrit: false })
    const d4 = play(fight(['steady-hands'], [['d4', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([4 - up, 4], [1, 4])).state
    expect(4 - up).toBeLessThanOrEqual(atMost)
    expect(d4.combat.rolls[0].isCrit).toBe(true) // raised to 4 on a d4: a crit
    const high = play(fight(['steady-hands'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([6, 8])).state
    expect(high.combat.rolls[0].bonus).toBeUndefined()
  })

  it('Street Performer pays EXP at the start of each of your turns', () => {
    let state = startGame()
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, styles: ['street-performer'], exp: 0 } : p)) }
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.players[1].exp).toBe(DEFAULT_TUNABLES.streetPerformerExp)
  })

  it('Jam Session adds its bonus only while another bard shares the space', () => {
    const alone = play(fight(['jam-session'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([2, 8])).state
    expect(alone.combat.rolls[0].bonus).toBeUndefined()
    let state = fight(['jam-session'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    const here = state.players[0].position
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, position: here } : p)) }
    const together = play(state, 1, faces([2, 8])).state
    expect(together.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.jamSessionBonus)
  })

  it('Studio Regular makes upgrades cheaper', () => {
    let state = startGame()
    const before = upgradeCostFor(state.players[0], { id: 'x', type: 'd4', genre: 'Hymn' })!
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, styles: ['studio-regular'] } : p)) }
    expect(upgradeCostFor(state.players[0], { id: 'x', type: 'd4', genre: 'Hymn' })).toBe(before - DEFAULT_TUNABLES.studioRegularDiscount)
  })

  it('every Studio style has a price and live rule text', () => {
    for (const id of ALL_STYLE_IDS) {
      expect(styleCost(id)).toBeGreaterThanOrEqual(0)
      expect(styleRule(id).length).toBeGreaterThan(10)
    }
  })
})

// ------------------------------------------------------------------
// Genre rule changes and the genres added with the rename
// ------------------------------------------------------------------

describe('Genre rule changes', () => {
  const soulPlay = (state: EngineState, c: ActionCtx) =>
    applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1', inspiredPlay: true }, c)

  it('Soul (Inspired Play) pays once for a bonus on every song this concert, only after starting the turn with enough', () => {
    let state = fight(['inspired-play'], [['d8', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: 3 } : p)), turnStartInspiration: DEFAULT_TUNABLES.inspiredPlayMin - 1 }
    expect(soulPlay(state, faces([2, 8])).ok).toBe(false) // started the turn with too little
    expect(play(state, 1, faces([2, 8])).state.combat.rolls[0].bonus).toBeUndefined() // not paid: nothing
    state = { ...state, turnStartInspiration: DEFAULT_TUNABLES.inspiredPlayMin }
    const paid = soulPlay(state, faces([2, 8]))
    expect(paid.ok).toBe(true)
    if (!paid.ok) return
    expect(paid.state.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.inspiredPlayBonus)
    expect(paid.state.players[0].inspiration).toBe(3 - DEFAULT_TUNABLES.inspiredPlayCost)
    // An encore keeps the bonus without paying again (only the encore's own Inspiration)
    const encore = apply(paid.state, { type: 'REROLL_SONG' }, faces([3, 8])).state
    expect(encore.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.inspiredPlayBonus)
    expect(encore.players[0].inspiration).toBe(3 - DEFAULT_TUNABLES.inspiredPlayCost - 1)
    // The next song gets it too, at no further cost
    const next = play(encore, 2, faces([2, 8])).state
    expect(next.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.inspiredPlayBonus)
    expect(next.players[0].inspiration).toBe(encore.players[0].inspiration)
  })

  it('Orchestra (Swarm Singer) raises every die while 3+ monsters remain, and it can crit', () => {
    const many = fight(['swarm-singer'], [['d4', 'Hymn']], [{ currentHP: 200, maxHP: 200 }, {}, {}])
    const crit = play(many, 1, faces([3, 4], [1, 4])).state
    expect(crit.combat.rolls[0].isCrit).toBe(true) // a 3 on a d4 counts as 4
    const won = { currentHP: 0, maxHP: 8 }
    const fewLeft = fight(['swarm-singer'], [['d4', 'Hymn']], [{ currentHP: 200, maxHP: 200 }, won, won])
    expect(play(fewLeft, 1, faces([3, 4])).state.combat.rolls[0].isCrit).toBe(false) // won-over monsters don't count
  })

  it('House (Chain Reaction) has no cap in concerts', () => {
    const dice: DieSpec[] = [['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn']]
    let state = fight(['chain-reaction'], dice, [{ currentHP: 500, maxHP: 500 }])
    for (let i = 1; i <= 4; i++) state = play(state, i, faces([1, 4])).state
    state = play(state, 5, faces([1, 4])).state
    expect(state.combat.rolls[0].bonus).toBe(4 * DEFAULT_TUNABLES.chainReactionBonus) // past the old +6 cap
  })

  it('House (Chain Reaction) builds within a showdown verse at the smaller showdown bonus', () => {
    const verse: Song = {
      id: 'verse', used: false,
      slots: [1, 2, 3].map((n) => ({ dice: { id: `v${n}`, type: 'd4' as DiceType, genre: 'Hymn' as Genre } })) as unknown as Song['slots'],
    }
    const { rolls } = rollSongWithStyles(verse, {
      styles: ['chain-reaction'], used: [], firstRoll: true, allElements: false, elementCount: 1,
      specs: specsForStyles(['chain-reaction']),
      play: {
        showdown: true, playIndex: 0, lastElement: null, comboCount: 0, elementsPlayed: [], target: null,
        sharingSpace: false, trailingFame: false, leadingFame: false, inspiration: 0, starter: 'Hymn', monstersInFight: 1, used: [],
      },
    }, faces([1, 4], [1, 4], [1, 4]).rng)
    expect(rolls.map((r) => r.bonus ?? 0)).toEqual([0, 1, 2].map((n) => n * DEFAULT_TUNABLES.chainReactionShowdownBonus))
  })

  it('Mariachi costs 2 EXP and Gospel refreshes any die by default', () => {
    expect(DEFAULT_TUNABLES.styleCostJamSession).toBe(2)
    expect(DEFAULT_TUNABLES.staccatoMaxFaces).toBe(20)
  })
})

describe('New genres', () => {
  it('Punk adds its bonus whenever the song crits', () => {
    const crit = play(fight(['punk'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([8, 8], [2, 8])).state
    expect(crit.combat.rolls[0]).toMatchObject({ isCrit: true, bonus: DEFAULT_TUNABLES.punkBonus })
    const plain = play(fight(['punk'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([5, 8])).state
    expect(plain.combat.rolls[0].bonus).toBeUndefined()
  })

  it('Soft Rock raises d8 and d12 faces, so a 7 on a d8 crits', () => {
    const d8 = play(fight(['soft-rock'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([7, 8], [1, 8])).state
    expect(d8.combat.rolls[0].isCrit).toBe(true)
    const d20 = play(fight(['soft-rock'], [['d20', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([19, 20])).state
    expect(d20.combat.rolls[0].isCrit).toBe(false)
  })

  it('Prog Rock adds its bonus from the 4th song of a concert', () => {
    const dice: DieSpec[] = [['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn']]
    let state = fight(['prog-rock'], dice, [{ currentHP: 500, maxHP: 500 }])
    for (let i = 1; i <= 3; i++) {
      state = play(state, i, faces([1, 4])).state
      expect(state.combat.rolls[0].bonus).toBeUndefined()
    }
    state = play(state, 4, faces([1, 4])).state
    expect(state.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.progRockBonus)
  })

  it('Ska adds its bonus when the die lands on an odd face', () => {
    const odd = play(fight(['ska'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([3, 8])).state
    expect(odd.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.skaBonus)
    const even = play(fight(['ska'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }]), 1, faces([4, 8])).state
    expect(even.combat.rolls[0].bonus).toBeUndefined()
  })

  it('K-Pop pays Fame for winning over 3, or 4+, monsters in one concert', () => {
    const tiny = { currentHP: 1, maxHP: 1 }
    const fameGained = (styles: StyleId[], n: number) => {
      let state = fight(styles, [['d20', 'Hymn']], Array.from({ length: n }, () => ({ ...tiny })))
      for (let i = 1; i <= n; i++) state = play(state, 1, faces([10, 20]), `m${i}`).state
      const before = state.players[0].fame
      return apply(state, { type: 'END_COMBAT', spreadGenre: 'Hymn' }).state.players[0].fame - before
    }
    const extra = (n: number) => fameGained(['k-pop'], n) - fameGained([], n)
    expect(extra(2)).toBe(0)
    expect(extra(3)).toBe(DEFAULT_TUNABLES.kPopFame3)
    expect(extra(4)).toBe(DEFAULT_TUNABLES.kPopFame4)
  })

  it('Emo adds its bonus to a song declared the last of the concert, and nothing can follow it', () => {
    let state = fight(['emo'], [['d8', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }, { currentHP: 200, maxHP: 200 }])
    const finale = (c: ActionCtx) =>
      applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1', emoFinale: true }, c)
    expect(play(state, 1, faces([2, 8])).state.combat.rolls[0].bonus).toBeUndefined() // undeclared: nothing
    const declared = finale(faces([2, 8]))
    expect(declared.ok).toBe(true)
    if (!declared.ok) return
    state = declared.state
    expect(state.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.emoBonus)
    expect(state.combat.finaleDeclared).toBe(true)
    expect(applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-2', targetMonsterId: 'm1' }, faces([2, 8])).ok).toBe(false)
    // An encore of the final song keeps its bonus
    state = { ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, inspiration: 2 } : p)) }
    const encore = apply(state, { type: 'REROLL_SONG' }, faces([5, 8])).state
    expect(encore.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.emoBonus)
    expect(apply(encore, { type: 'END_COMBAT' }).state.combat.isActive).toBe(false)
  })

  it('Emo needs the genre to declare a final song', () => {
    const state = fight([], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    expect(applyAction(state, { type: 'PLAY_SONG', songId: 'player-1-song-1', targetMonsterId: 'm1', emoFinale: true }, faces([2, 8])).ok).toBe(false)
  })

  it('Trance adds its bonus only while the bard holds no Inspiration', () => {
    const base = fight(['trance'], [['d8', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    const empty = { ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, inspiration: 0 } : p)) }
    expect(play(empty, 1, faces([2, 8])).state.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.tranceBonus)
    const holding = { ...base, players: base.players.map((p, i) => (i === 0 ? { ...p, inspiration: 1 } : p)) }
    expect(play(holding, 1, faces([2, 8])).state.combat.rolls[0].bonus).toBeUndefined()
  })

  it('Grunge adds its bonus to the song after one moves a monster without winning it over', () => {
    let state = fight(['grunge'], [['d8', 'Hymn'], ['d8', 'Hymn'], ['d8', 'Ballad']], [{ currentHP: 200, maxHP: 200 }, { currentHP: 200, maxHP: 200, resistance: 'Ballad' }])
    state = play(state, 3, faces([2, 8]), 'm2').state // immune: moved nothing
    state = play(state, 1, faces([2, 8]), 'm1').state
    expect(state.combat.rolls[0].bonus).toBeUndefined() // the last song moved nothing
    state = play(state, 2, faces([2, 8]), 'm1').state
    expect(state.combat.rolls[0].bonus).toBe(DEFAULT_TUNABLES.grungeBonus)
  })

  it('Dubstep rolls the song after a win twice and keeps the higher, once per turn', () => {
    let state = fight(['dubstep'], [['d20', 'Hymn'], ['d8', 'Hymn'], ['d8', 'Hymn']], [{ currentHP: 1, maxHP: 1 }, { currentHP: 1, maxHP: 1 }, { currentHP: 200, maxHP: 200 }])
    state = play(state, 1, faces([10, 20]), 'm1').state // a win
    state = play(state, 2, faces([1, 8], [6, 8]), 'm2').state // rolls twice: 6, and wins again
    expect(state.combat.rolls[0]).toMatchObject({ value: 6, bonus: DEFAULT_TUNABLES.dubstepBonus })
    state = play(state, 3, faces([2, 8], [6, 8]), 'm3').state // after a win, but used up this turn
    expect(state.combat.rolls[0].value).toBe(2)
    expect(state.combat.rolls[0].bonus).toBeUndefined()
  })
})

describe('Trip-Hop', () => {
  const withTripHop = (state: EngineState) =>
    ({ ...state, players: state.players.map((p, i) => (i === 0 ? { ...p, styles: ['trip-hop'] as StyleId[] } : p)) })
  const jump = (state: EngineState, to: number) =>
    applyAction(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: to, anywhere: true }, seeded())

  it('moves to any space once per turn without spending a regular move', () => {
    let state = withTripHop(startGame())
    const from = state.players[0].position
    const far = state.spaces.find((s) => s.id !== from && !s.connections.includes(from))!.id
    expect(applyAction(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: far }, seeded()).ok).toBe(false) // not connected
    const jumped = jump(state, far)
    expect(jumped.ok).toBe(true)
    state = jumped.ok ? jumped.state : state
    expect(state.players[0].position).toBe(far)
    expect(state.players[0].movesThisTurn).toBe(0)
    expect(state.tripHopUsed).toBe(true)
    expect(jump(state, from).ok).toBe(false) // once per turn
  })

  it('can be undone, giving the use back, and resets at the start of the next turn', () => {
    let state = withTripHop(startGame())
    const from = state.players[0].position
    const far = state.spaces.find((s) => s.id !== from && !s.connections.includes(from))!.id
    state = apply(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: far, anywhere: true }).state
    state = apply(state, { type: 'UNDO_MOVE', playerId: 'player-1' }).state
    expect(state.players[0].position).toBe(from)
    expect(state.tripHopUsed).toBe(false)
    state = apply(state, { type: 'MOVE', playerId: 'player-1', toSpaceId: far, anywhere: true }).state
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.tripHopUsed).toBe(false)
  })

  it('needs the genre', () => {
    const state = startGame()
    const from = state.players[0].position
    const far = state.spaces.find((s) => s.id !== from && !s.connections.includes(from))!.id
    expect(jump(state, far).ok).toBe(false)
  })
})
