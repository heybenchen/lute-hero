import { describe, it, expect } from 'vitest'
import { applyAction, ActionCtx, computeCombatRewards } from './reducer'
import { createInitialEngineState, EngineState } from './state'
import { GameAction } from './actions'
import { mulberry32 } from './rng'
import { DiceType, Genre, Monster, Song, StyleId } from '../types'
import { ALL_STYLE_IDS, STYLES, styleCost } from '../data/styles'

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
  return apply(state, { type: 'PLAY_SONG', songId: `player-1-song-${song}`, ownerId: 'player-1', targetMonsterId: target }, c)
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

  it('leaves a 3 as a plain roll without the style', () => {
    const state = fight([], [['d4', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([3, 4]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 3, isCrit: false, cascadeRolls: [] })
  })
})

describe('Fortissimo', () => {
  it('adds +2 to a d20, and an 18 reaching 20 crits', () => {
    const state = fight(['fortissimo'], [['d20', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([18, 20], [5, 20]))
    expect(after.combat.rolls[0]).toMatchObject({ value: 18, bonus: 2, isCrit: true, cascadeRolls: [5] })
    expect(hp(after)).toBe(50 - (18 + 2 + 5))
  })

  it('does nothing for smaller dice', () => {
    const state = fight(['fortissimo'], [['d12', 'Hymn']], [{}])
    const { state: after } = play(state, 1, faces([7, 12]))
    expect(after.combat.rolls[0].bonus).toBeUndefined()
    expect(hp(after)).toBe(43)
  })
})

describe('Overture and Tutti', () => {
  it('Overture adds +2 to the first roll of the turn only, and never crits', () => {
    const state = fight(['overture'], [['d4', 'Hymn'], ['d4', 'Hymn']], [{}])
    const first = play(state, 1, faces([3, 4])).state
    expect(first.combat.rolls[0]).toMatchObject({ value: 3, bonus: 2, isCrit: false })
    const second = play(first, 2, faces([3, 4])).state
    expect(second.combat.rolls[0].bonus).toBeUndefined()
  })

  it('Tutti adds +4 only when your songs hold all four elements', () => {
    const allFour: DieSpec[] = [['d4', 'Ballad'], ['d4', 'Folk'], ['d4', 'Hymn'], ['d4', 'Shanty']]
    const withAll = play(fight(['tutti'], allFour, [{}]), 1, faces([2, 4])).state
    expect(withAll.combat.rolls[0].bonus).toBe(4)

    const missingOne = play(fight(['tutti'], allFour.slice(0, 3), [{}]), 1, faces([2, 4])).state
    expect(missingOne.combat.rolls[0].bonus).toBeUndefined()
  })
})

describe('Virtuoso', () => {
  it('rolls the first d12/d20 of the turn twice and keeps the higher, once', () => {
    const state = fight(['virtuoso'], [['d20', 'Hymn'], ['d20', 'Hymn']], [{ currentHP: 200, maxHP: 200 }])
    const first = play(state, 1, faces([4, 20], [15, 20])).state
    expect(first.combat.rolls[0].value).toBe(15)
    expect(first.combat.stylesUsed).toContain('virtuoso')
    // Second big roll this turn is a normal single roll
    const second = play(first, 2, faces([4, 20], [15, 20])).state
    expect(second.combat.rolls[0].value).toBe(4)
  })
})

// ------------------------------------------------------------------
// Song-economy styles
// ------------------------------------------------------------------

describe('Fermata', () => {
  it('keeps a big die song unspent once per turn when it fails to tame', () => {
    const state = fight(['fermata'], [['d20', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    const first = play(state, 1, faces([5, 20])).state
    expect(spent(first, 1)).toBe(false)
    expect(first.combat.styleNotes).toContain(STYLES.fermata.name)
    const second = play(first, 1, faces([5, 20])).state
    expect(spent(second, 1)).toBe(true)
  })

  it('does not hold small dice', () => {
    const state = fight(['fermata'], [['d8', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    expect(spent(play(state, 1, faces([5, 8])).state, 1)).toBe(true)
  })
})

describe('Staccato (Rallying Cry)', () => {
  it('refreshes your spent d4 songs when a d4 song tames, once per turn', () => {
    const dice: DieSpec[] = [['d4', 'Hymn'], ['d4', 'Hymn'], ['d4', 'Hymn']]
    let state = fight(['staccato'], dice, [{ currentHP: 50, maxHP: 50 }, { currentHP: 1, maxHP: 1 }])
    state = play(state, 1, faces([1, 4]), 'm1').state
    state = play(state, 2, faces([1, 4]), 'm1').state
    expect(spent(state, 1) && spent(state, 2)).toBe(true)

    state = play(state, 3, faces([2, 4]), 'm2').state // tames the 1-HP monster
    expect(spent(state, 1) || spent(state, 2)).toBe(false)
    expect(state.combat.styleNotes).toContain(STYLES.staccato.name)
    expect(state.combat.stylesUsed).toContain('staccato')
  })

  it('also fires when a big die song lands the tame', () => {
    const dice: DieSpec[] = [['d4', 'Hymn'], ['d20', 'Hymn']]
    let state = fight(['staccato'], dice, [{ currentHP: 50, maxHP: 50 }, { currentHP: 5, maxHP: 5 }])
    state = play(state, 1, faces([1, 4]), 'm1').state
    expect(spent(state, 1)).toBe(true)
    state = play(state, 2, faces([10, 20]), 'm2').state
    expect(spent(state, 1)).toBe(false)
  })

  it('is not used up by a tame when no d4 song needs refreshing', () => {
    const dice: DieSpec[] = [['d4', 'Hymn'], ['d20', 'Hymn']]
    let state = fight(['staccato'], dice, [{ currentHP: 5, maxHP: 5 }, { currentHP: 50, maxHP: 50 }])
    state = play(state, 2, faces([10, 20]), 'm1').state
    expect(state.combat.stylesUsed).not.toContain('staccato')
  })
})

describe('Counterpoint', () => {
  it('turns the first immune hit each turn into half damage', () => {
    const state = fight(['counterpoint'], [['d8', 'Hymn'], ['d8', 'Hymn']], [{ resistance: 'Hymn' }])
    const first = play(state, 1, faces([6, 8])).state
    expect(hp(first)).toBe(50 - 3)
    expect(first.combat.styleNotes).toContain(STYLES.counterpoint.name)
    const second = play(first, 2, faces([6, 8])).state
    expect(hp(second)).toBe(47)
  })
})

describe('Rubato', () => {
  it('rerolls a spent d4/d8 song for free, once per turn', () => {
    let state = fight(['rubato'], [['d8', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
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

  it('cannot reroll big dice', () => {
    let state = fight(['rubato'], [['d12', 'Hymn']], [{ currentHP: 100, maxHP: 100 }])
    state = play(state, 1, faces([2, 12])).state
    expect(applyAction(state, { type: 'REROLL_SONG', rubato: true }, seeded()).ok).toBe(false)
  })
})

describe('Bravo', () => {
  it('adds Fame for every monster tamed', () => {
    let state = fight(['bravo'], [['d20', 'Hymn']], [{ currentHP: 1, maxHP: 1 }])
    state = play(state, 1, faces([10, 20])).state
    const plain = computeCombatRewards(state.combat)
    const cheered = computeCombatRewards(state.combat, ['bravo'])
    expect(cheered.fighterFame - plain.fighterFame).toBe(1)
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
    expect(state.players[0].styles).toEqual(['bravo', 'fermata'])
  })

  it('refuses a style you cannot afford', () => {
    expect(applyAction(studio([], ['fortissimo'], 1), { type: 'BUY_STYLE', offerIndex: 0 }, seeded()).ok).toBe(false)
  })

  it('Coda adds a 7th song, and giving it up keeps that song\'s die as a reward', () => {
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
        songs: p.songs.map((sg) => (sg.id === codaSong.id ? { ...sg, slots: [{ dice: { id: 'coda-die', type: 'd4', genre: 'Hymn' } }] as Song['slots'] } : sg)),
      } : p)),
    }
    state = apply(state, { type: 'BUY_STYLE', offerIndex: 0, replaceStyleId: 'coda' }).state
    expect(state.players[0].songs).toHaveLength(6)
    expect(state.pendingRewards['player-1'].some((r) => r.dice.id === 'coda-die')).toBe(true)
  })

  it('refreshes the shelf for 1 Inspiration with styles you do not own', () => {
    const before = studio(['overture'], ['bravo', 'tutti'])
    const state = apply(before, { type: 'REFRESH_STYLE_OFFERS' }).state
    expect(state.players[0].inspiration).toBe(before.players[0].inspiration - 1)
    expect(state.styleOffers).toHaveLength(2)
    expect(state.styleOffers).not.toContain('overture')
    expect(ALL_STYLE_IDS).toEqual(expect.arrayContaining(state.styleOffers))
  })
})

describe('Turn starts', () => {
  it('deals a fresh shelf after every turn, skipping styles the next bard owns', () => {
    let state = startGame()
    expect(state.styleOffers).toHaveLength(2)
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, styles: ['bravo', 'coda'] } : p)) }
    for (let i = 0; i < 20; i++) {
      const next = apply(state, { type: 'END_TURN' }, seeded(i)).state
      expect(next.styleOffers).toHaveLength(2)
      expect(next.styleOffers).not.toContain('bravo')
      expect(next.styleOffers).not.toContain('coda')
    }
  })

  it('Ispirato tops Inspiration up to 1 at the start of your turn, without stacking', () => {
    let state = startGame()
    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, styles: ['ispirato'], inspiration: 0 } : p)) }
    state = apply(state, { type: 'END_TURN' }).state
    expect(state.players[1].inspiration).toBe(1)

    state = { ...state, players: state.players.map((p) => (p.id === 'player-2' ? { ...p, inspiration: 3 } : p)) }
    state = apply(state, { type: 'END_TURN' }).state // round ends → player-1
    state = apply(state, { type: 'END_TURN' }).state // player-2 again
    expect(state.players[1].inspiration).toBe(3)
  })
})
