/**
 * A strong simulation bard. It plays full games through the real engine like
 * the baseline `Bot`, but every decision is driven by exact odds (`odds.ts`):
 *
 *  - Fights: each play is the song/target pair with the best value —
 *    P(tame) × the monster's worth, plus the chip damage and wound EXP a miss
 *    still earns, minus what losing the song costs for the rest of the fight.
 *    A tame hands the die back, so likely kills are free; Lingering Note makes
 *    a big die's miss free, Nimble Fingers / Inspiration rerolls are priced in.
 *    Featured songs are free but split a tame with a rival, so they are used
 *    to chip. The bot focuses on a wounded target until it tames it or retreats.
 *  - Moving: to the reachable space with the best expected fight, looking two
 *    turns ahead when nothing is in reach.
 *  - Shopping: every option (new d4, upgrade, genre, Inspiration) is scored by
 *    how much it raises the bard's expected Fame per fight against the monsters
 *    actually on the board, per EXP spent. Genres that change rolls are scored
 *    through the exact odds; the rest by audit-derived values scaled to the
 *    bard's dice, with combinations (e.g. Master's Touch + Dragon's Roar on
 *    d20s) falling out naturally.
 *  - Inspiration: priced by stage — rerolls early, banked for the showdown late.
 *  - Showdown: picks each verse's element by expected fandom minus the cost of
 *    the boss growing immune to it next verse, and spends leftover Inspiration
 *    on rerolls of below-par performances.
 *
 * Shared code only, relative imports (it runs inside the reducer for
 * DEBUG_SIMULATE, on the server too).
 */
import { applyAction, ActionCtx } from '../engine/reducer.js'
import { EngineState } from '../engine/state.js'
import { GameAction } from '../engine/actions.js'
import { Dice, DiceType, Element, Monster, Player, Rng, Song, GenreId } from '../types/index.js'
import { getElementMultiplier } from '../game-logic/combat/damageCalculator.js'
import { monsterSpawnHp } from '../game-logic/combat/monsterSpawner.js'
import { calculateMonsterExp, calculateMonsterFameValue } from '../game-logic/fame/calculator.js'
import { getValidMoves } from '../game-logic/board/graphBuilder.js'
import { GenreContext, discoFameFor, builtinRollOptions, elementCount, bluesCanRefresh, bebopUsesLeft, gospelCanRefresh, substitutedDice } from '../game-logic/genres/genreEffects.js'
import { getMaxValue } from '../game-logic/dice/roller.js'
import { getTunables, withTunables } from '../data/tunables.js'
import { inspirationSpend } from '../data/draftCards.js'
import { canAfford, d4CostFor, inspirationCostFor, movesFor, upgradeCostFor } from '../engine/economy.js'
import { emoFinaleSpec, specsOf, specsForGenres } from '../data/genreSpecs.js'
import { PlayContext, SpecReward, GenreSpec, applySpecRollModifiers, conditionHolds, inspirationRules, specMultiplier } from '../game-logic/genres/specs.js'
import { genreCost, maxGenres } from '../data/genres.js'
import { DICE_UPGRADE_PATH } from '../data/startingData.js'
import { ALL_ELEMENTS } from '../data/elementTheme.js'
import { Dist, rollDist, killChance, expectedDamage, expectedChipOnMiss, mean, convolve, sample } from './odds.js'

const BIG: DiceType[] = ['d12', 'd20']
const SMALL: DiceType[] = ['d4', 'd8']

/** Tunable knobs of the policy (found by the tournament harness). */
export interface SmartParams {
  /** Fame-equivalent value of one Inspiration before the endgame. */
  inspirationValue: number
  /** Inspiration banked for the showdown once the fame gate is near. */
  showdownReserve: number
  /** Weight of EXP relative to Fame in fight decisions. */
  expWeight: number
  /** Share of a song's expected damage counted as the cost of spending it. */
  songCost: number
  /** Credit for chip damage a miss leaves behind (fraction of its pro-rata value). */
  chipCredit: number
  /** Penalty per point of Fame a featured tame hands a rival. */
  rivalFame: number
  /** Minimum value per EXP for a purchase to be worth making now. */
  buyThreshold: number
  /** Share of purchase value judged against tomorrow's tougher board (monsters a level up). */
  futureWeight: number
  /** Scale on the audit-derived worth of genres the odds can't see. */
  priorScale: number
  /** Plan showdown verses ahead (vs the greedy-with-penalty pick). */
  showdownLookahead: boolean
  /** Rollouts per top fight candidate (0 = pure heuristic). */
  fightRollouts: number
  /** How many top-scoring candidates the rollouts compare. */
  rolloutCandidates: number
  /**
   * How genres are valued when shopping: 'odds' runs roll-changing genres
   * through the exact odds (plus audit priors for the rest); 'measured' uses
   * the smart-bot genre audit for every genre, scaled by fit with the dice.
   */
  genreValuation: 'odds' | 'measured'
  /**
   * When to stop rerolling a showdown performance: 'par' (reroll while below the
   * expected performance) or 'optimal' (optimal stopping on the exact distribution:
   * reroll when the roll is below the value of rerolling with the rerolls left).
   */
  showdownStop: 'par' | 'optimal'
  /** Inspiration to keep stocked by buying it with leftover EXP (before the endgame reserve). */
  inspirationTarget: number
  /**
   * How well the bot plays, 0–1. 1 is the expert policy above. Below 1 it
   * plays like a person still learning the game: with probability
   * `1 - skill` per decision it moves to a random reachable space, picks a
   * random legal play in a fight, skips the Studio, or buys a random
   * affordable option, and it holds back on encores. Used to pace the
   * playtest Simulate tab (`SIMULATION_PACES`).
   */
  skill: number
}

export const DEFAULT_SMART_PARAMS: SmartParams = {
  inspirationValue: 6,
  showdownReserve: 3,
  expWeight: 2,
  songCost: 0.6,
  chipCredit: 0.6,
  rivalFame: 0.5,
  buyThreshold: 0.3,
  futureWeight: 0,
  priorScale: 1,
  showdownLookahead: true,
  fightRollouts: 0,
  rolloutCandidates: 3,
  genreValuation: 'odds',
  showdownStop: 'par',
  inspirationTarget: 2,
  skill: 1,
}

/**
 * Fame-per-turn worth of genres whose effect the odds can't see, from the
 * genre audit (fame share over the baseline × typical Fame per turn), before
 * scaling by how well they fit the bard's dice.
 */
/**
 * Fame per turn each genre adds under smart play, from the smart-bot genre
 * audit (scripts/genre-audit.ts: final Fame share over the no-genre baseline
 * × ~32 Fame per turn). Used by the 'measured' genre valuation.
 */
const GENRE_MEASURED: Record<GenreId, number> = {
  // Blues, Gospel and Soul re-measured after the genre rename (29.3%, 26.5%, 24.9%)
  disco: 5.8, blues: 2.5, gospel: 1.0, barbershop: 2.6, opera: 1.9, screamo: 1.9,
  'new-age': 1.6, crossover: 1.6, bluegrass: 1.0, indie: 1.0, bebop: 0.3, pop: 0,
  // Studio genres from the genre lab: approximate, from their genre-lab win rates
  'country': 2.3, 'baroque': 2.0, 'lo-fi': 2.4, 'soul': 0.6,
  'rap': 2.0, 'house': 2.4, 'orchestra': 1.9, 'mariachi': 2.4,
  // Genres added with the rename: approximate, from their genre-lab win rates
  punk: 2.0, 'soft-rock': 2.2, 'prog-rock': 2.0, ska: 2.0, 'k-pop': 2.0, emo: 2.0, trance: 1.6, grunge: 1.6, dubstep: 1.8,
  'trip-hop': 2.0,
}

const GENRE_PRIOR: Partial<Record<GenreId, number>> = {
  // Gospel and Blues are weaker as genres (a called win; a paid refresh): re-measured after the rename
  gospel: 1.0,
  // Soul is a paid choice per play, so the odds never see it: value it from the audit
  'soul': 0.6,
  blues: 2.0,
  disco: 0, // computed from expected tames
  bebop: 1.2,
  'new-age': 1.0,
  crossover: 0.4,
  pop: 0.6,
  // K-Pop pays at the end of a big concert
  'k-pop': 1.5,
  // Trip-Hop's reach is a movement choice the fight odds never see
  'trip-hop': 2.0,
  // Economy the odds can't see: cheaper upgrades keep paying all game
  'lo-fi': 1.2,
  // An EXP a turn is worth the bot's EXP weight in Fame the odds can't see
  'rap': 2.0,
}

/** Genre reach checks, following the tunable die-size limits. */
const isBluegrassDie = (d: Dice) => getMaxValue(d.type) >= getTunables().bluegrassMinFaces && getMaxValue(d.type) <= getTunables().bluegrassMaxFaces
const isBluesDie = (d: Dice) => getMaxValue(d.type) >= getTunables().bluesMinFaces
const isBebopDie = (d: Dice) => getMaxValue(d.type) <= getTunables().bebopMaxFaces
const hasHarmony = (songs: Song[]) => elementCount(songs) >= getTunables().barbershopElements

/**
 * How much a bard's performance of the Silence's immune element still counts:
 * nothing, unless Crossover lets it through (each Showdown performance is the
 * bard's whole turn, so its once-per-turn use is always fresh).
 */
/** Trance adds its bonus only while the bard holds 0 Inspiration. */
const holdsTrance = (p: Player) => p.genres.includes('trance')

const immuneFactor = (p: Player) => (p.genres.includes('crossover') ? getTunables().crossoverMultiplier : 0)

function songDie(song: Song): Dice | null {
  return song.slots.find((s) => s.dice)?.dice ?? null
}

interface Candidate {
  song: Song
  monster: Monster
  featuredFrom?: string
  score: number
  pk: number
}

export class SmartBot {
  state: EngineState
  private ctx: ActionCtx
  private p: SmartParams
  private refreshedThisTurn = false

  constructor(state: EngineState, rng: Rng, params: Partial<SmartParams> = {}) {
    this.state = state
    this.ctx = { rng, actor: { kind: 'hotseat' } }
    this.p = { ...DEFAULT_SMART_PARAMS, ...params }
  }

  act(action: GameAction): boolean {
    // Replacing New Age with its 7th song in use: give up the song with the smallest die
    if (action.type === 'BUY_GENRE' && action.replaceGenreId === 'new-age' && !action.giveUpSongId) {
      const songs = this.me.songs.filter((sg) => songDie(sg))
      const weakest = songs.sort((x, y) => getMaxValue(songDie(x)!.type) - getMaxValue(songDie(y)!.type))[0]
      if (weakest) action = { ...action, giveUpSongId: weakest.id }
    }
    const result = applyAction(this.state, action, this.ctx)
    if (!result.ok) return false
    this.state = result.state
    return true
  }

  /** True when this decision should be a learner's slip rather than the expert pick. */
  private slips(): boolean {
    return this.p.skill < 1 && this.ctx.rng() >= this.p.skill
  }

  private pickRandom<T>(xs: T[]): T {
    return xs[Math.floor(this.ctx.rng() * xs.length)]
  }

  private get me(): Player {
    return this.state.players[this.state.currentTurnPlayerIndex]
  }

  private t<T>(fn: () => T): T {
    return withTunables(this.state.tunables, fn)
  }

  takeTurn(): void {
    const playerId = this.me.id
    this.t(() => {
      this.move()
      this.fight()
      this.shop()
    })
    if (this.state.phase === 'main' && this.state.players[this.state.currentTurnPlayerIndex]?.id === playerId) {
      this.act({ type: 'END_TURN' })
    }
  }

  // ------------------------------------------------------------------
  // Odds
  // ------------------------------------------------------------------

  /** Roll distribution of one die for this bard right now. */
  /**
   * Roll distribution of one die for this bard right now — built from the
   * same generic options the engine rolls with (built-in genres, then any
   * data-defined genres for the given play).
   */
  private dist(
    die: Dice,
    genres: GenreId[],
    opts: { firstRoll: boolean; advantage: boolean; allElements: boolean },
    specs: GenreSpec[] = [],
    play?: PlayContext
  ): Dist {
    const ctx: GenreContext = {
      genres,
      used: opts.advantage ? [] : ['bluegrass'],
      firstRoll: opts.firstRoll,
      allElements: opts.allElements,
      elementCount: opts.allElements ? 99 : 0,
    }
    let combined: Dist | null = null
    for (const physicalDie of substitutedDice(die, genres)) {
      let roll = builtinRollOptions(physicalDie, ctx, true, [])
      if (specs.length && play) roll = applySpecRollModifiers(specs, physicalDie, play, roll).opts
      const next = rollDist(physicalDie.type, roll)
      combined = combined ? convolve(combined, next) : next
    }
    return combined!
  }

  /** What data-defined genre conditions see for a play at `target` (mirrors the engine). */
  private playCtx(fighter: Player, target: Monster, die: Dice | null): PlayContext {
    const combat = this.state.combat
    const log = combat.playLog ?? []
    let combo = 0
    for (let i = log.length - 1; i >= 0 && log[i] === die?.element; i--) combo++
    const fames = this.state.players.map((p) => p.fame)
    return {
      showdown: false,
      playIndex: combat.songsUsed.length,
      lastElement: log[log.length - 1] ?? null,
      comboCount: combo,
      elementsPlayed: [...new Set(log)],
      target,
      sharingSpace: this.state.players.some((p) => p.id !== fighter.id && p.position === (combat.spaceId ?? fighter.position)),
      trailingFame: fighter.fame <= Math.min(...fames),
      leadingFame: fighter.fame >= Math.max(...fames),
      inspiration: fighter.inspiration,
      starter: fighter.starterElement,
      monstersInFight: (combat.isActive ? combat.monsters : [target]).filter((m) => m.currentHP > 0).length,
      monstersAtStart: (combat.isActive ? combat.monsters : [target]).length,
      spentSongs: combat.isActive ? combat.spentSongIds.length : 0,
      lastPlayResult: combat.isActive ? combat.lastPlayResult ?? null : null,
      songsLeft: combat.isActive
        ? fighter.songs.filter((sg) => songDie(sg) && !combat.spentSongIds.includes(sg.id)).length
        : fighter.songs.filter((sg) => songDie(sg)).length,
      used: combat.specFired ?? [],
    }
  }

  /** A typical play context when estimating fights ahead of time. */
  private neutralCtx(player: Player, target: Monster, specs: GenreSpec[] = specsOf(player), monstersInFight = 2, sharingSpace = false): PlayContext {
    const fames = this.state.players.map((p) => p.fame)
    return {
      showdown: false, playIndex: 1, lastElement: null, comboCount: 0, elementsPlayed: [], target,
      sharingSpace, trailingFame: player.fame <= Math.min(...fames), leadingFame: player.fame >= Math.max(...fames),
      inspiration: player.inspiration, starter: player.starterElement, monstersInFight,
      // A typical mid-fight play: one song already spent
      spentSongs: 1,
      // Plan without once-per-turn effects: they help one die a fight, not every one
      used: specs.map((sp) => sp.id),
    }
  }

  /** Fame-equivalent value of a data-defined genre reward. */
  private rewardValue(r: SpecReward | undefined): number {
    if (!r) return 0
    return (r.fame ?? 0) + this.p.expWeight * (r.exp ?? 0) + this.p.inspirationValue * (r.inspiration ?? 0)
  }

  private multiplier(die: Dice, m: Monster, crossover: boolean, specs: GenreSpec[] = [], play?: PlayContext): number {
    let mult = getElementMultiplier(die.element, m)
    if (specs.length && play) mult = specMultiplier(specs, die, m, play, mult)
    if (mult === 0 && crossover && m.resistance === die.element) return getTunables().crossoverMultiplier
    return mult
  }

  private monsterWorth(m: Monster, includeExp: boolean): number {
    return calculateMonsterFameValue(m.level) + (includeExp ? this.p.expWeight * calculateMonsterExp(m.level) : 0)
  }

  /** Near the fame gate the showdown is coming: Inspiration is worth banking. */
  private endgame(): boolean {
    const gate = getTunables().fameFinalBossThreshold
    return !!this.state.pendingPhase || Math.max(...this.state.players.map((p) => p.fame)) >= gate * 0.65
  }

  private spareInspiration(player: Player): number {
    // Trance pays only at 0 Inspiration, so a Trance bard keeps no reserve
    if (holdsTrance(player)) return player.inspiration
    return Math.max(0, player.inspiration - (this.endgame() ? this.p.showdownReserve : 0))
  }

  /**
   * What one Inspiration is worth to this bard when deciding an encore. For a
   * Trance bard holding Inspiration is a cost (every song misses its bonus until
   * it is gone), so an encore is nearly free.
   */
  private inspirationWorth(player: Player): number {
    return holdsTrance(player) ? 0.5 : this.p.inspirationValue
  }

  // ------------------------------------------------------------------
  // Fight
  // ------------------------------------------------------------------

  private fight(): void {
    const me = this.me
    const space = this.state.spaces.find((s) => s.id === me.position)!
    if (space.monsters.length === 0) return
    if (this.estimateFight(space.monsters, me, this.guestsAt(space.id, me.id).length) <= 0) return
    if (!this.act({ type: 'START_COMBAT', playerId: me.id })) return

    for (let guard = 0; guard < 60 && this.state.combat.isActive; guard++) {
      const combat = this.state.combat
      const fighter = this.me
      const alive = combat.monsters.filter((m) => m.currentHP > 0)
      if (alive.length === 0) break
      const lockedTarget = alive.find((m) => m.id === combat.lockedTargetMonsterId)
      const targets = lockedTarget ? [lockedTarget] : alive

      // Gospel (a called win): bring back the spent song worth the most against what's left
      if (combat.rallyReady && fighter.genres.includes('gospel')) {
        const spent = fighter.songs.filter((s) => combat.spentSongIds.includes(s.id) && songDie(s) && gospelCanRefresh(s))
        if (spent.length > 0) {
          const best = spent
            .map((s) => ({ s, v: Math.max(...targets.map((m) => this.playValue(s, m, fighter, alive).score)) }))
            .sort((a, b) => b.v - a.v)[0]
          if (this.act({ type: 'RALLY_SONG', songId: best.s.id })) continue
        }
      }

      // Blues: pay Inspiration to bring back a spent d20 song while monsters remain
      if (this.considerLinger(fighter, targets, alive)) continue

      const pick = this.slips() ? this.randomCandidate(fighter, targets) : this.bestCandidate(fighter, alive, targets)
      if (!pick) break
      const hpBefore = pick.monster.currentHP
      const ok = pick.featuredFrom
        ? this.act({ type: 'PLAY_FEATURED_SONG', guestPlayerId: pick.featuredFrom, songId: pick.song.id, targetMonsterId: pick.monster.id })
        : this.act({ type: 'PLAY_SONG', songId: pick.song.id, targetMonsterId: pick.monster.id, ...this.playFlags(fighter, pick) })
      if (!ok) break
      if (!pick.featuredFrom) this.considerReroll(pick, hpBefore)
    }

    this.act({ type: 'END_COMBAT', spreadElement: this.spreadChoice(this.me) })
  }

  /**
   * Choices riding on an own play. Gospel: call a likely win while a spent song is
   * waiting to come back. Soul: pay Inspiration when +2 lifts the win chance enough.
   */
  private playFlags(fighter: Player, pick: Candidate): { gospelCall?: boolean; soul?: boolean; emoFinale?: boolean } {
    const combat = this.state.combat
    const flags: { gospelCall?: boolean; soul?: boolean; emoFinale?: boolean } = {}
    const refreshable = fighter.songs.some((s) => combat.spentSongIds.includes(s.id) && songDie(s) && gospelCanRefresh(s))
    if (fighter.genres.includes('gospel') && !combat.genresUsed.includes('gospel') && refreshable && pick.pk >= 0.6) {
      flags.gospelCall = true
    }
    const t = getTunables()
    // Soul: paying once puts +bonus on every song this concert, so switch it on early in a
    // concert with more than one song still to play, when Inspiration can be spared
    if (
      fighter.genres.includes('soul') &&
      !combat.soulActive &&
      (this.state.turnStartInspiration ?? 0) >= t.soulMin &&
      fighter.inspiration >= t.soulCost &&
      this.spareInspiration(fighter) >= t.soulCost
    ) {
      const songsLeft = fighter.songs.filter((sg) => songDie(sg) && !combat.spentSongIds.includes(sg.id)).length
      const alive = combat.monsters.filter((m) => m.currentHP > 0).length
      if (songsLeft >= 2 && alive >= 1) flags.soul = true
    }
    // Emo: declare this the final song when it's the last one anyway, or when the target is the only
    // monster left and the bonus makes winning it over clearly likelier
    if (fighter.genres.includes('emo') && !combat.finaleDeclared) {
      const songsLeft = fighter.songs.filter((sg) => songDie(sg) && !combat.spentSongIds.includes(sg.id)).length
      if (songsLeft <= 1) {
        flags.emoFinale = true
      } else {
        const die = songDie(pick.song)!
        const specs = specsOf(fighter)
        const play = this.playCtx(fighter, pick.monster, die)
        const opts = { firstRoll: combat.songsUsed.length === 0, advantage: false, allElements: hasHarmony(fighter.songs) }
        const mult = this.multiplier(die, pick.monster, false, specs, play)
        if (mult > 0) {
          const plain = killChance(this.dist(die, fighter.genres, opts, specs, play), mult, pick.monster.currentHP)
          const boosted = killChance(this.dist(die, fighter.genres, opts, [...specs, emoFinaleSpec()], play), mult, pick.monster.currentHP)
          // Only when nothing else is left to win: ending the concert then costs just the later tries at this monster
          const othersLeft = combat.monsters.some((m) => m.currentHP > 0 && m.id !== pick.monster.id)
          if (!othersLeft && boosted >= 0.5 && boosted - plain >= 0.2) flags.emoFinale = true
        }
      }
    }
    return flags
  }

  /** Blues: refresh the best spent d20 song if it is worth more than the Inspiration. */
  private considerLinger(fighter: Player, targets: Monster[], alive: Monster[]): boolean {
    const combat = this.state.combat
    const cost = getTunables().bluesInspirationCost
    if (!fighter.genres.includes('blues') || combat.genresUsed.includes('blues')) return false
    if (fighter.inspiration < cost || this.spareInspiration(fighter) < cost) return false
    const spent = fighter.songs.filter((s) => combat.spentSongIds.includes(s.id) && songDie(s) && bluesCanRefresh(s))
    if (spent.length === 0) return false
    const best = spent
      .map((s) => ({ s, v: Math.max(...targets.map((m) => this.playValue(s, m, fighter, alive).score)) }))
      .sort((a, b) => b.v - a.v)[0]
    if (best.v <= this.p.inspirationValue * cost) return false
    return this.act({ type: 'LINGER_SONG', songId: best.s.id })
  }

  private guestsAt(spaceId: number, fighterId: string): Player[] {
    return this.state.players.filter((p) => p.id !== fighterId && p.position === spaceId)
  }

  /** A learner's play: any own song that can hurt any allowed target. */
  private randomCandidate(fighter: Player, targets: Monster[]): Candidate | null {
    const combat = this.state.combat
    const plays: Candidate[] = []
    for (const song of fighter.songs) {
      const die = songDie(song)
      if (!die || combat.spentSongIds.includes(song.id)) continue
      for (const m of targets) if (getElementMultiplier(die.element, m) > 0) plays.push({ song, monster: m, score: 0, pk: 0 })
    }
    return plays.length > 0 ? this.pickRandom(plays) : null
  }

  private bestCandidate(fighter: Player, alive: Monster[], targets: Monster[]): Candidate | null {
    const combat = this.state.combat
    let best: Candidate | null = null
    const own: Candidate[] = []
    const consider = (c: Candidate) => {
      if (c.score > -Infinity && (!best || c.score > best.score)) best = c
      if (!c.featuredFrom && c.score > -Infinity) own.push(c)
    }
    for (const song of fighter.songs) {
      if (!songDie(song) || combat.spentSongIds.includes(song.id)) continue
      for (const m of targets) {
        const v = this.playValue(song, m, fighter, alive)
        if (v.dmgPossible) consider({ song, monster: m, score: v.score, pk: v.pk })
      }
    }
    // Featured songs: free, but a tame splits the monster with a rival
    for (const guest of this.state.players) {
      if (guest.id === fighter.id || guest.position !== combat.spaceId || combat.featuredPlayerIds.includes(guest.id)) continue
      for (const song of guest.songs) {
        const die = songDie(song)
        if (!die) continue
        for (const m of targets) {
          const mult = getElementMultiplier(die.element, m)
          if (mult <= 0) continue
          const d = rollDist(die.type, { maxCascades: getTunables().maxCritCascades })
          const pk = killChance(d, mult, m.currentHP)
          const fame = calculateMonsterFameValue(m.level)
          const guestShare = Math.floor(fame / 2)
          const unit = this.monsterWorth(m, true) / Math.max(1, m.maxHP)
          const chip = expectedChipOnMiss(d, mult, m.currentHP) * unit * this.p.chipCredit
          // Featured plays cost nothing, so their value is pure upside, but
          // they should come after own plays that could take the full prize.
          const score = pk * (fame - guestShare - this.p.rivalFame * guestShare) + (1 - pk) * chip - 0.01
          consider({ song, monster: m, featuredFrom: guest.id, score, pk })
        }
      }
    }
    // Look ahead: compare the top own plays by simulating the rest of the fight
    const chosen = best as Candidate | null
    if (this.p.fightRollouts > 0 && chosen && !chosen.featuredFrom && own.length > 1) {
      const top = own.sort((a, b) => b.score - a.score).slice(0, this.p.rolloutCandidates)
      let bestMean = -Infinity
      let pick = chosen
      for (const c of top) {
        let sum = 0
        for (let i = 0; i < this.p.fightRollouts; i++) sum += this.rollout(fighter, alive, c)
        const m = sum / this.p.fightRollouts
        if (m > bestMean) {
          bestMean = m
          pick = c
        }
      }
      return pick
    }
    return chosen
  }

  /**
   * One random play-out of the rest of this fight starting with `first`:
   * dice are drawn from their exact distributions, later plays follow the
   * greedy score. Returns the Fame (+ weighted EXP) the fight yields.
   */
  private rollout(fighter: Player, alive: Monster[], first: Candidate): number {
    const combat = this.state.combat
    const rng = this.ctx.rng
    const genres = fighter.genres
    const used = new Set(combat.genresUsed)
    const allEl = hasHarmony(fighter.songs)
    const ms = alive.map((m) => ({ m, hp: m.currentHP, touched: m.currentHP < m.maxHP }))
    let bebopLeft = bebopUsesLeft(combat.genresUsed)
    const canPayLingering = fighter.inspiration >= getTunables().bluesInspirationCost
    const ready = new Set(fighter.songs.filter((s) => songDie(s) && !combat.spentSongIds.includes(s.id)).map((s) => s.id))
    let firstRoll = combat.songsUsed.length === 0
    const disco = (level: number) => (genres.includes('disco') ? discoFameFor(level) : 0)
    const specs = specsOf(fighter)
    let value = 0
    let lockedTargetId = combat.lockedTargetMonsterId
    const play = (song: Song, target: (typeof ms)[number]) => {
      const die = songDie(song)!
      const counter = genres.includes('crossover') && !used.has('crossover')
      let mult = getElementMultiplier(die.element, target.m)
      if (mult === 0 && counter && target.m.resistance === die.element) {
        mult = getTunables().crossoverMultiplier
        used.add('crossover')
      }
      const adv = genres.includes('bluegrass') && !used.has('bluegrass') && isBluegrassDie(die)
      if (adv) used.add('bluegrass')
      const d = this.dist(die, genres, { firstRoll, advantage: adv, allElements: allEl }, specs, specs.length ? this.playCtx(fighter, target.m, die) : undefined)
      firstRoll = false
      let dmg = Math.floor(sample(d, rng) * mult)
      if (dmg < target.hp && genres.includes('bebop') && bebopLeft > 0 && isBebopDie(die)) {
        // Nimble Fingers keeps the higher of the two rolls
        bebopLeft--
        dmg = Math.max(dmg, Math.floor(sample(d, rng) * mult))
      }
      if (dmg > 0) target.touched = true
      if (dmg >= target.hp) {
        lockedTargetId = null
        target.hp = 0
        value += calculateMonsterFameValue(target.m.level) + disco(target.m.level)
        return
      }
      if (dmg > 0) lockedTargetId = target.m.id
      target.hp -= dmg
      if (genres.includes('blues') && !used.has('blues') && isBluesDie(die) && canPayLingering) used.add('blues')
      else ready.delete(song.id)
    }
    play(first.song, ms.find((x) => x.m.id === first.monster.id)!)
    for (let guard = 0; guard < 20; guard++) {
      const live = ms.filter((x) => x.hp > 0)
      if (live.length === 0) break
      let bestScore = -Infinity
      let bestPlay: { song: Song; target: (typeof ms)[number] } | null = null
      const totalHp = live.reduce((s, x) => s + x.hp, 0)
      const totalWorth = live.reduce((s, x) => s + calculateMonsterFameValue(x.m.level), 0)
      for (const song of fighter.songs) {
        if (!ready.has(song.id)) continue
        const die = songDie(song)!
        const d = this.dist(die, genres, { firstRoll, advantage: genres.includes('bluegrass') && !used.has('bluegrass'), allElements: allEl })
        for (const x of live) {
          if (lockedTargetId && x.m.id !== lockedTargetId) continue
          const mult = getElementMultiplier(die.element, x.m)
          if (mult <= 0) continue
          const pk = killChance(d, mult, x.hp)
          const worth = calculateMonsterFameValue(x.m.level)
          const sc = pk * worth - (1 - pk) * this.p.songCost * mean(d) * (totalWorth / Math.max(1, totalHp)) +
            (1 - pk) * Math.min(expectedChipOnMiss(d, mult, x.hp), x.hp - 1) * (worth / x.hp) * this.p.chipCredit
          if (sc > bestScore) {
            bestScore = sc
            bestPlay = { song, target: x }
          }
        }
      }
      if (!bestPlay) break
      play(bestPlay.song, bestPlay.target)
    }
    // Wound EXP: every monster charmed at least once pays out
    for (const x of ms) if (x.touched || x.hp <= 0) value += this.p.expWeight * calculateMonsterExp(x.m.level)
    return value
  }

  /** Value of playing `song` at `m` now, plus whether it can deal any charm at all. */
  private playValue(song: Song, m: Monster, fighter: Player, alive: Monster[]): { score: number; pk: number; dmgPossible: boolean } {
    const combat = this.state.combat
    const die = songDie(song)!
    const used = combat.genresUsed
    const has = (id: GenreId) => fighter.genres.includes(id)
    const avail = (id: GenreId) => has(id) && !used.includes(id)
    const crossover = avail('crossover')
    const specs = specsOf(fighter)
    const play = specs.length ? this.playCtx(fighter, m, die) : undefined
    const mult = this.multiplier(die, m, crossover, specs, play)
    if (mult <= 0) return { score: -Infinity, pk: 0, dmgPossible: false }

    const d = this.dist(die, fighter.genres, {
      firstRoll: combat.songsUsed.length === 0,
      advantage: avail('bluegrass'),
      allElements: hasHarmony(fighter.songs),
    }, specs, play)
    let pk = killChance(d, mult, m.currentHP)
    const untouched = m.currentHP >= m.maxHP
    let worth = this.monsterWorth(m, untouched)
    // Data-defined genres: tame rewards, miss rewards, misses that keep the song
    let missReward = 0
    let specKeeps = false
    if (play) {
      for (const spec of specs) {
        for (const e of spec.onTame ?? []) if (conditionHolds(e.when, die, play, spec.id)) worth += this.rewardValue(e.reward)
        for (const e of spec.onMiss ?? []) {
          if (!conditionHolds(e.when, die, play, spec.id)) continue
          missReward += this.rewardValue(e.reward)
          if (e.keepSong) specKeeps = true
        }
      }
    }

    // Rerolls that would follow a miss
    const freeReroll = has('bebop') && bebopUsesLeft(used) > 0 && isBebopDie(die)
    if (freeReroll) pk = 1 - (1 - pk) ** 2
    let inspirationSpend = 0
    if (this.spareInspiration(fighter) >= 1 && pk * worth > this.inspirationWorth(fighter) * 1.5) {
      inspirationSpend = (1 - pk) * this.inspirationWorth(fighter)
      pk = 1 - (1 - pk) ** 2
    }

    const lingeringCost = getTunables().bluesInspirationCost
    const lingering = avail('blues') && isBluesDie(die) && fighter.inspiration >= lingeringCost
    const totalWorth = alive.reduce((s, x) => s + this.monsterWorth(x, x.currentHP >= x.maxHP), 0)
    const totalHp = alive.reduce((s, x) => s + x.currentHP, 0)
    const unitAll = totalWorth / Math.max(1, totalHp)
    const unitHere = worth / Math.max(1, m.currentHP)
    const missCost = specKeeps ? 0 : lingering ? lingeringCost * this.p.inspirationValue : this.p.songCost * mean(d) * unitAll
    const chip = Math.min(expectedChipOnMiss(d, mult, m.currentHP), m.currentHP - 1) * unitHere * this.p.chipCredit
    // A miss on an untouched monster still wounds it: its EXP is paid even on a retreat
    const woundExp = untouched ? this.p.expWeight * calculateMonsterExp(m.level) * 0.5 : 0
    const disco = has('disco') ? discoFameFor(m.level) : 0
    const score = pk * (worth + disco) + (1 - pk) * (chip + woundExp + missReward - missCost) - inspirationSpend
    return { score, pk, dmgPossible: expectedDamage(d, mult) > 0 }
  }

  /** After a miss (the song is spent and the target stands): reroll if it pays. */
  private considerReroll(pick: Candidate, hpBefore: number): void {
    if (this.slips()) return
    for (let i = 0; i < 4; i++) {
      const combat = this.state.combat
      const target = combat.monsters.find((m) => m.id === pick.monster.id)
      const lastId = combat.lastPlayedSongId
      if (!target || target.currentHP <= 0 || !lastId || !combat.spentSongIds.includes(lastId)) return
      const fighter = this.me
      const die = songDie(pick.song)!
      const mult = this.multiplier(die, { ...target, currentHP: hpBefore }, false) || getElementMultiplier(die.element, target)
      const d = this.dist(die, fighter.genres, { firstRoll: false, advantage: false, allElements: hasHarmony(fighter.songs) })
      const pk = killChance(d, mult, hpBefore)
      const worth = this.monsterWorth(target, false) + (fighter.genres.includes('disco') ? discoFameFor(target.level) : 0)
      const canFree = fighter.genres.includes('bebop') && bebopUsesLeft(combat.genresUsed) > 0 && isBebopDie(die)
      if (canFree && pk > 0.05 && this.act({ type: 'REROLL_SONG', bebop: true })) continue
      const freeLeft = inspirationRules(specsOf(fighter)).freePerTurn > combat.freeRerollsUsed
      if (freeLeft && pk > 0.05 && this.act({ type: 'REROLL_SONG' })) continue
      if (this.spareInspiration(fighter) >= 1 && pk * worth > this.inspirationWorth(fighter) && this.act({ type: 'REROLL_SONG' })) continue
      return
    }
  }

  /** Spread the element this bard's dice hit hardest, so new monsters near it adore its songs. */
  private spreadChoice(player: Player): Element {
    const weight = new Map<Element, number>()
    for (const song of player.songs) {
      const die = songDie(song)
      if (die) weight.set(die.element, (weight.get(die.element) ?? 0) + mean(this.dist(die, player.genres, { firstRoll: false, advantage: false, allElements: false })))
    }
    let best: Element = player.starterElement
    for (const [g, w] of weight) if (w > (weight.get(best) ?? 0)) best = g
    return best
  }

  /**
   * Expected value of fighting these monsters with this setlist: for each
   * monster, the best single song's tame chance (a tame returns the die, so
   * the same song can chain), with chip-assisted kills and wound EXP for the
   * rest. Used for moving and for valuing purchases.
   */
  estimateFight(monsters: Monster[], player: Player, guests = 0, genres: GenreId[] = player.genres, songs: Song[] = player.songs): number {
    if (monsters.length === 0) return 0
    const dice = songs.map(songDie).filter((d): d is Dice => !!d)
    if (dice.length === 0) return 0
    const allEl = hasHarmony(songs)
    let total = 0
    let tames = 0
    for (const m of monsters) {
      let best = 0
      let chipSum = 0
      let hits = false
      const specs = specsForGenres(genres, player.specGenres)
      const play = specs.length ? this.neutralCtx(player, m, specs, monsters.length, guests > 0) : undefined
      for (const die of dice) {
        const mult = this.multiplier(die, m, false, specs, play)
        if (mult <= 0) continue
        hits = true
        const d = this.dist(die, genres, { firstRoll: false, advantage: genres.includes('bluegrass'), allElements: allEl }, specs, play)
        let pk = killChance(d, mult, m.currentHP)
        if (genres.includes('bebop') && isBebopDie(die)) pk = 1 - (1 - pk) ** (1 + Math.min(1, getTunables().bebopUsesPerTurn / 2))
        if (genres.includes('blues') && isBluesDie(die)) pk = 1 - (1 - pk) ** 1.6
        best = Math.max(best, pk)
        chipSum += expectedDamage(d, mult, m.currentHP)
      }
      if (!hits) continue
      const chipKill = chipSum >= m.currentHP ? 0.55 : chipSum / m.currentHP * 0.3
      const pTame = best + (1 - best) * chipKill
      tames += pTame
      if (genres.includes('disco')) total += pTame * discoFameFor(m.level)
      total += pTame * calculateMonsterFameValue(m.level) + this.p.expWeight * calculateMonsterExp(m.level) * 0.9
    }
    if (genres.includes('gospel')) total += Math.min(1, tames) * (GENRE_PRIOR.gospel ?? 0)
    if (guests > 0) total *= 1.05
    return total
  }

  // ------------------------------------------------------------------
  // Movement
  // ------------------------------------------------------------------

  private move(): void {
    const me = this.me
    const maxMoves = movesFor(me)
    const reach = this.reachable(me.position, maxMoves)
    const valueAt = (id: number) => {
      const space = this.state.spaces.find((s) => s.id === id)!
      return this.estimateFight(space.monsters, me, this.guestsAt(id, me.id).length)
    }
    if (this.slips()) {
      // A learner heads for any nearby space with monsters on it
      const occupied = [...reach.keys()].filter((id) => (this.state.spaces.find((s) => s.id === id)?.monsters.length ?? 0) > 0)
      if (occupied.length > 0) {
        for (const step of reach.get(this.pickRandom(occupied)) ?? []) if (!this.act({ type: 'MOVE', playerId: me.id, toSpaceId: step })) break
        return
      }
    }
    let best = me.position
    let bestScore = valueAt(me.position)
    for (const id of reach.keys()) {
      const v = valueAt(id)
      if (v > bestScore + 0.01) {
        best = id
        bestScore = v
      }
    }
    // Trip-Hop: once per turn, jump to any space when one beats everything in walking reach
    if (me.genres.includes('trip-hop') && !this.state.tripHopUsed) {
      let jump = -1
      let jumpScore = bestScore
      for (const space of this.state.spaces) {
        if (space.id === me.position || reach.has(space.id)) continue
        const v = valueAt(space.id)
        if (v > jumpScore + 0.5) {
          jump = space.id
          jumpScore = v
        }
      }
      if (jump >= 0 && this.act({ type: 'MOVE', playerId: me.id, toSpaceId: jump, anywhere: true })) return
    }
    // Nothing worth fighting in reach: head for the best space two turns out
    if (bestScore < 1) {
      const far = this.reachable(me.position, maxMoves * 2)
      let target = -1
      let targetScore = bestScore
      for (const id of far.keys()) {
        const v = valueAt(id) * 0.8
        if (v > targetScore) {
          target = id
          targetScore = v
        }
      }
      if (target >= 0) {
        const path = far.get(target)!
        for (const step of path.slice(0, maxMoves)) if (!this.act({ type: 'MOVE', playerId: me.id, toSpaceId: step })) break
        return
      }
    }
    for (const step of reach.get(best) ?? []) if (!this.act({ type: 'MOVE', playerId: me.id, toSpaceId: step })) break
  }

  private reachable(from: number, steps: number): Map<number, number[]> {
    const reach = new Map<number, number[]>([[from, []]])
    let frontier = [from]
    for (let d = 0; d < steps; d++) {
      const next: number[] = []
      for (const f of frontier) {
        for (const to of getValidMoves(f, this.state.spaces)) {
          if (reach.has(to.id)) continue
          reach.set(to.id, [...reach.get(f)!, to.id])
          next.push(to.id)
        }
      }
      frontier = next
    }
    return reach
  }

  // ------------------------------------------------------------------
  // Studio
  // ------------------------------------------------------------------

  /** How strong this setlist is against everything on the board (expected value per fight, summed). */
  private boardStrength(player: Player, songs: Song[], genres: GenreId[]): number {
    if (this.p.genreValuation === 'measured') return this.boardStrengthMeasured(player, songs, genres)
    let total = 0
    const fw = this.p.futureWeight
    for (const space of this.state.spaces) {
      if (space.monsters.length === 0) continue
      total += (1 - fw) * this.estimateFight(space.monsters, player, 0, genres, songs)
      if (fw > 0) total += fw * this.estimateFight(this.grownMonsters(space.monsters), player, 0, genres, songs)
    }
    // Genres the odds can't see, scaled to how well they fit the dice
    const dice = songs.map(songDie).filter((d): d is Dice => !!d)
    const big = dice.filter((d) => BIG.includes(d.type)).length
    const small = dice.filter((d) => SMALL.includes(d.type)).length
    const fit: Partial<Record<GenreId, number>> = {
      blues: Math.min(1, big / 2),
      bebop: Math.min(1, small / 3),
      'new-age': songs.length >= 7 ? 1 : 0,
      crossover: 1,
      pop: player.inspiration < 1 ? 1 : 0.3,
    }
    // Spread over the board's spaces so priors and odds share one scale
    const spaces = Math.max(1, this.state.spaces.filter((s) => s.monsters.length > 0).length)
    for (const s of genres) {
      const prior = GENRE_PRIOR[s]
      if (prior) total += prior * this.p.priorScale * (fit[s] ?? 1) * spaces * 0.25
    }
    return total
  }

  /** Board strength with every genre valued from the audit, scaled by fit. */
  private boardStrengthMeasured(player: Player, songs: Song[], genres: GenreId[]): number {
    let total = 0
    for (const space of this.state.spaces) {
      if (space.monsters.length > 0) total += this.estimateFight(space.monsters, player, 0, [], songs)
    }
    const dice = songs.map(songDie).filter((d): d is Dice => !!d)
    const count = (types: DiceType[]) => dice.filter((d) => types.includes(d.type)).length
    const elements = new Set(dice.map((d) => d.element)).size
    const fit: Record<GenreId, number> = {
      disco: 1, gospel: 1, screamo: 1, crossover: 1, 'new-age': 1,
      blues: Math.min(1, count(BIG) / 2),
      bluegrass: Math.min(1, count(SMALL) / 2),
      opera: Math.min(1, count(['d20']) / 2),
      indie: Math.min(1, dice.filter((d) => getMaxValue(d.type) <= getTunables().indieMaxFaces).length / 3),
      bebop: Math.min(1, dice.filter(isBebopDie).length / 3),
      barbershop: elements >= 4 ? 1 : elements === 3 ? 0.5 : 0.1,
      pop: player.inspiration < 1 ? 1 : 0.3,
      'country': Math.min(1, dice.filter((d) => d.element === player.starterElement).length / 3),
      'baroque': Math.min(1, dice.filter((d) => getMaxValue(d.type) <= 8).length / 2),
      'lo-fi': 1, 'rap': 1, 'house': 1, 'orchestra': 1, 'mariachi': 1,
      'soul': player.inspiration >= getTunables().soulMin ? 1 : 0.5,
      punk: Math.min(1, count(['d4']) / 2),
      'soft-rock': Math.min(1, count(['d8', 'd12']) / 3),
      'prog-rock': 1, ska: 1, 'k-pop': 1, emo: 1, grunge: 1, dubstep: 1, 'trip-hop': 1,
      // The bot spends Inspiration down to 0 while it holds Trance, so the bonus lands
      trance: 1,
    }
    const spaces = Math.max(1, this.state.spaces.filter((s) => s.monsters.length > 0).length)
    for (const st of genres) total += GENRE_MEASURED[st] * fit[st] * this.p.priorScale * spaces * 0.25
    return total
  }

  /** The same monsters a level up (capped): what this board grows into. */
  private grownMonsters(monsters: Monster[]): Monster[] {
    const key = monsters.map((m) => m.id).join(',')
    const hit = this.grownCache.get(key)
    if (hit) return hit
    const cap = getTunables().maxMonsterLevel
    const grown = monsters.map((m) => {
      const level = Math.min(cap, m.level + 1)
      const hp = monsterSpawnHp(level)
      return { ...m, level, maxHP: hp, currentHP: hp }
    })
    this.grownCache.set(key, grown)
    return grown
  }
  private grownCache = new Map<string, Monster[]>()

  /**
   * Genre audits: from `fromRound` on, this bot buys `id` (if it is on the
   * shelf) as soon as it can afford it, before anything else in the Studio,
   * paying the real price out of its real EXP.
   */
  forcedGenre?: { id: GenreId; fromRound: number }

  private shop(): void {
    const me = this.me
    // A learner sometimes leaves the Studio for another turn, saving the EXP
    if (this.slips()) return
    if (!this.act({ type: 'OPEN_STUDIO', playerId: me.id })) return
    this.refreshedThisTurn = false
    const forced = this.forcedGenre
    if (forced && this.state.currentRound + 1 >= forced.fromRound && !me.genres.includes(forced.id)) {
      const offerIndex = this.state.genreOffers.indexOf(forced.id)
      if (offerIndex >= 0 && canAfford(me, genreCost(forced.id))) {
        // At the genre cap the first owned genre makes room
        const replaceGenreId = me.genres.length >= maxGenres() ? me.genres[0] : undefined
        this.act({ type: 'BUY_GENRE', offerIndex, ...(replaceGenreId ? { replaceGenreId } : {}) })
      }
    }
    for (let guard = 0; guard < 30; guard++) if (!this.shopStep()) break
    this.act({ type: 'CLOSE_STUDIO' })
  }

  private shopStep(): boolean {
    const me = this.me
    // Place any bought die first
    const reward = (this.state.pendingRewards[me.id] ?? []).find((r) => r.kind === 'die')
    const emptySong = me.songs.find((s) => !songDie(s))
    if (reward && emptySong) return this.act({ type: 'SLOT_DIE_REWARD', rewardId: reward.id, songId: emptySong.id, slotIndex: 0 })

    const base = this.boardStrength(me, me.songs, me.genres)
    const options: { value: number; cost: number; action: GameAction }[] = []
    const offers = this.state.elementOffers

    // New d4 into an empty song
    if (emptySong && !reward && canAfford(me, d4CostFor(me))) {
      const seen = new Set<Element>()
      offers.forEach((g, idx) => {
        if (seen.has(g)) return
        seen.add(g)
        const songs = me.songs.map((s) => (s.id === emptySong.id ? { ...s, slots: [{ dice: { id: 'x', type: 'd4' as DiceType, element: g } }] as Song['slots'] } : s))
        options.push({ value: this.boardStrength(me, songs, me.genres) - base, cost: d4CostFor(me), action: { type: 'BUY_DIE', offerIndex: idx } })
      })
    }

    // Upgrades on a matching chip
    for (const song of me.songs) {
      const die = songDie(song)
      if (!die) continue
      const cost = upgradeCostFor(me, die)
      const next = DICE_UPGRADE_PATH[die.type]
      const idx = offers.indexOf(die.element)
      if (cost === null || !next || idx === -1 || !canAfford(me, cost)) continue
      const songs = me.songs.map((s) => (s.id === song.id ? { ...s, slots: [{ dice: { ...die, type: next } }] as Song['slots'] } : s))
      options.push({ value: this.boardStrength(me, songs, me.genres) - base, cost, action: { type: 'UPGRADE_DIE', offerIndex: idx, diceId: die.id } })
    }

    // Genres (replacing the weakest one at the cap)
    this.state.genreOffers.forEach((id, offerIndex) => {
      if (me.genres.includes(id)) return
      const cost = genreCost(id)
      if (!canAfford(me, cost)) return
      if (me.genres.length < maxGenres()) {
        const songs = id === 'new-age' ? [...me.songs, { id: 'new-age-x', used: false, slots: [{ dice: null }] as Song['slots'] }] : me.songs
        options.push({ value: this.boardStrength(me, songs, [...me.genres, id]) - base, cost, action: { type: 'BUY_GENRE', offerIndex } })
      } else {
        let bestDrop: GenreId | null = null
        let bestValue = 0
        for (const drop of me.genres) {
          const genres = [...me.genres.filter((s) => s !== drop), id]
          const v = this.boardStrength(me, me.songs, genres) - base
          if (v > bestValue) {
            bestValue = v
            bestDrop = drop
          }
        }
        // Swapping throws away what the old genre cost: demand a clear gain
        if (bestDrop) options.push({ value: bestValue * 0.7, cost, action: { type: 'BUY_GENRE', offerIndex, replaceGenreId: bestDrop } })
      }
    })

    // Rank by value per EXP; a future-proof bias for big upgrades (they keep paying)
    const ranked = options
      .map((o) => ({ ...o, ratio: o.value / Math.max(1, o.cost) }))
      .filter((o) => o.ratio > this.p.buyThreshold)
      .sort((a, b) => b.ratio - a.ratio)
    // A learner sometimes buys whatever catches their eye
    if (options.length > 0 && this.slips()) return this.act(this.pickRandom(options).action)
    for (const o of ranked) if (this.act(o.action)) return true

    // Nothing good on the shelf and EXP to spend: redraw with spare Inspiration
    const cheapest = Math.min(...me.songs.map(songDie).filter((d): d is Dice => !!d).map((d) => upgradeCostFor(me, d) ?? Infinity), d4CostFor(me) + (emptySong ? 0 : 99))
    if (!this.refreshedThisTurn && this.spareInspiration(me) >= 1 + inspirationSpend() && me.exp >= Math.max(4, cheapest * 2)) {
      this.refreshedThisTurn = true
      if (this.act({ type: 'REFRESH_ELEMENT_OFFERS' })) return true
    }

    // Trance: spend leftover Inspiration on shelf redraws, so the next concert starts at 0
    if (holdsTrance(me)) {
      if (me.inspiration >= inspirationSpend() && this.act({ type: 'REFRESH_ELEMENT_OFFERS' })) return true
      return false
    }

    // Bank leftover EXP as Inspiration (it rerolls fights now and the showdown later)
    const inspCost = inspirationCostFor(me)
    const want = this.endgame() ? this.p.showdownReserve + this.p.inspirationTarget : this.p.inspirationTarget
    if (me.inspiration < want && me.exp >= inspCost) {
      // Keep enough EXP for the next upgrade if one is close
      const keep = this.endgame() ? 0 : Math.min(4, cheapest)
      if (me.exp - inspCost >= keep) return this.act({ type: 'BUY_INSPIRATION' })
    }
    return false
  }

  // ------------------------------------------------------------------
  // Final Showdown
  // ------------------------------------------------------------------

  /** Distribution of performing one element (every die of it rolls together). */
  private performanceDist(player: Player, element: Element): Dist | null {
    const dice = player.songs.map(songDie).filter((d): d is Dice => !!d && d.element === element)
    if (dice.length === 0) return null
    const allEl = hasHarmony(player.songs)
    const specs = specsOf(player)
    const fames = this.state.players.map((p) => p.fame)
    let acc: Dist | null = null
    dice.forEach((die, i) => {
      const play: PlayContext | undefined = specs.length ? {
        showdown: true, playIndex: i, lastElement: null, comboCount: 0, elementsPlayed: [], target: null,
        sharingSpace: false, trailingFame: player.fame <= Math.min(...fames), leadingFame: player.fame >= Math.max(...fames),
        inspiration: player.inspiration, starter: player.starterElement, monstersInFight: 1, used: [],
      } : undefined
      const d = this.dist(die, player.genres, { firstRoll: i === 0, advantage: i === dice.findIndex((x) => isBluegrassDie(x)), allElements: allEl }, specs, play)
      acc = acc ? convolve(acc, d) : d
    })
    return acc
  }

  /** Play the current showdown performer's verse: element choice, rerolls, finish. */
  playShowdownTurn(): void {
    this.t(() => {
      const s = this.state
      const performer = s.players.find((p) => p.id === s.showdownOrder[s.showdownPerformerIdx])!
      const resist = s.showdownResistElement
      const versesLeft = getTunables().showdownTurns - s.showdownTurn
      const options = ALL_ELEMENTS.map((g) => ({ g, d: this.performanceDist(performer, g) }))
        .filter((o): o is { g: Element; d: Dist } => !!o.d)
        .map((o) => ({ ...o, ev: mean(o.d) * (o.g === resist ? immuneFactor(performer) : 1) }))
      if (options.length === 0) {
        this.act({ type: 'FINISH_SHOWDOWN_PERFORMANCE' })
        return
      }
      // Rivals' best expected performance this verse, to judge whether ours will be the strongest
      const rivalBest = Math.max(0, ...s.players.filter((p) => p.id !== performer.id).flatMap((p) =>
        ALL_ELEMENTS.map((g) => {
          const d = this.performanceDist(p, g)
          return d ? mean(d) * (g === resist ? immuneFactor(p) : 1) : 0
        })
      ))
      if (this.p.showdownLookahead && versesLeft > 0) {
        const planned = this.planShowdown(performer, options.map((o) => o.g))
        if (planned) {
          const songId = performer.songs.find((sg) => songDie(sg)?.element === planned)!.id
          const ev = options.find((o) => o.g === planned)!.ev
          if (this.act({ type: 'PLAY_SHOWDOWN_SONG', songId })) this.rerollShowdown(performer.id, ev, versesLeft)
          this.act({ type: 'FINISH_SHOWDOWN_PERFORMANCE' })
          return
        }
      }
      const scored = options.map((o) => {
        let penalty = 0
        if (versesLeft > 0 && o.ev > 0) {
          const pStrongest = Math.min(1, Math.max(0, 0.5 + (o.ev - rivalBest) / Math.max(1, rivalBest)))
          const nextAll = Math.max(0, ...options.filter((x) => x.g !== o.g).map((x) => mean(x.d)), o.ev)
          const nextWithout = Math.max(0, ...options.filter((x) => x.g !== o.g).map((x) => mean(x.d)))
          penalty = pStrongest * (nextAll - nextWithout) * 0.6
        }
        return { ...o, score: o.ev - penalty }
      }).sort((a, b) => b.score - a.score)
      const pick = scored[0]
      const songId = performer.songs.find((sg) => songDie(sg)?.element === pick.g)!.id
      if (!this.act({ type: 'PLAY_SHOWDOWN_SONG', songId })) return

      this.rerollShowdown(performer.id, pick.ev, versesLeft)
      this.act({ type: 'FINISH_SHOWDOWN_PERFORMANCE' })
    })
  }

  /** Reroll below-par performances: Inspiration is worth nothing after the showdown. */
  private rerollShowdown(performerId: string, par: number, versesLeft: number): void {
    for (let i = 0; i < 6; i++) {
      const now = this.state
      const me = now.players.find((p) => p.id === performerId)!
      const got = now.showdownCurrentFandom
      const mySpecs = specsOf(me)
      // An encore paid per unspent Inspiration makes rerolls cost real fans
      const perInsp = mySpecs.reduce((t, sp) => t + (sp.showdownEnd?.perInspiration ?? 0), 0)
      const freeLeft = inspirationRules(mySpecs).freePerTurn > (now.showdownUndo?.freeRerollsUsed ?? 0)
      // Nimble Fingers keeps the higher result, so using it can never hurt: take it first
      const hasFree = me.genres.includes('bebop') && !now.showdownUndo?.bebopUsed &&
        me.songs.some((sg) => (now.showdownUndo?.songIds ?? []).includes(sg.id) && (songDie(sg) ? isBebopDie(songDie(sg)!) : false))
      if (hasFree && this.act({ type: 'REROLL_SHOWDOWN_SONG', bebop: true })) continue
      // The crown: once its holder has performed, beating their verse pays a bonus.
      // Keep a verse that beats it; encore one that falls short while the odds pay for the Inspiration.
      const chase = this.crownChase(me, got)
      if (chase) {
        if (got > chase.toBeat) return
        if (me.inspiration >= 1 && chase.pBeat * chase.gain > this.inspirationWorth(me) && this.act({ type: 'REROLL_SHOWDOWN_SONG' })) continue
      }
      // Spread spare Inspiration over the verses still to come
      // Trance: an encore that empties the bard's Inspiration rolls with the bonus, so spend it all
      const budget = versesLeft === 0 || holdsTrance(me) ? me.inspiration : Math.floor(me.inspiration / (versesLeft + 1)) || (me.inspiration > versesLeft ? 1 : 0)
      if (this.p.showdownStop === 'optimal') {
        const hasFreeBebop = me.genres.includes('bebop') && !now.showdownUndo?.bebopUsed
        const rerolls = budget + (freeLeft ? 1 : 0) + (hasFreeBebop ? 1 : 0)
        const dist = this.currentPerformanceDist(me)
        if (rerolls < 1 || !dist || got >= this.stopThreshold(dist, rerolls)) return
      } else if (got >= (holdsTrance(me) && me.inspiration === 1 ? par + getTunables().tranceBonus : par) * (versesLeft === 0 ? 1 : 0.85)) return
      if (freeLeft && this.act({ type: 'REROLL_SHOWDOWN_SONG' })) continue
      if (perInsp > 0 && par - got < perInsp * 2) return
      if (budget >= 1 && this.act({ type: 'REROLL_SHOWDOWN_SONG' })) continue
      return
    }
  }

  /** The distribution of the performance on the table (every die of the performed element). */
  private currentPerformanceDist(me: Player): Dist | null {
    const element = this.state.showdownCurrentElement
    return element ? this.performanceDist(me, element) : null
  }

  /**
   * Optimal stopping with `k` rerolls left: keep a roll at or above this value. With one reroll it is
   * the mean; each extra reroll raises it to E[max(X, previous)].
   */
  /**
   * Chasing the crown this verse: the crown holder's verse to beat (once they have
   * performed), the chance a fresh roll beats it, and the bonus that would add.
   * Null when this bard holds the crown or there is nothing to chase yet.
   */
  private crownChase(me: Player, got: number): { toBeat: number; pBeat: number; gain: number } | null {
    const s = this.state
    if (s.showdownCrownIds.length === 0 || s.showdownCrownIds.includes(me.id)) return null
    const crownPerfs = s.showdownTurnPerformances.filter((perf) => s.showdownCrownIds.includes(perf.playerId))
    if (crownPerfs.length === 0) return null
    const toBeat = Math.max(...crownPerfs.map((perf) => perf.fandom))
    const dist = this.currentPerformanceDist(me)
    if (!dist) return null
    let pBeat = 0
    for (const [x, p] of dist) if (x > toBeat) pBeat += p
    const { showdownCrownBeatBonus, showdownCrownTieBonus } = getTunables()
    const held = got === toBeat && got > 0 ? showdownCrownTieBonus : 0
    return { toBeat, pBeat, gain: showdownCrownBeatBonus - held }
  }

  private stopThreshold(d: Dist, k: number): number {
    let t = mean(d)
    for (let j = 2; j <= k; j++) {
      let e = 0
      for (const [x, p] of d) e += p * Math.max(x, t)
      t = e
    }
    return t
  }

  /**
   * Plan the rest of the showdown: try every sequence of elements for this
   * bard's remaining verses, assume the rivals each play their best open
   * element, and let the boss grow immune to the strongest expected
   * performance each verse. Returns the element that starts the best plan.
   */
  private planShowdown(performer: Player, mine: Element[]): Element | null {
    const s = this.state
    const verses = getTunables().showdownTurns - s.showdownTurn + 1
    const evOf = (p: Player) => {
      const m = new Map<Element, number>()
      for (const g of ALL_ELEMENTS) {
        const d = this.performanceDist(p, g)
        if (d) m.set(g, mean(d))
      }
      return m
    }
    const myEv = evOf(performer)
    // Performers still to play this verse, and everyone in later verses
    const order = s.showdownOrder
    const rivals = s.players.filter((p) => p.id !== performer.id).map((p) => ({ p, ev: evOf(p), idx: order.indexOf(p.id) }))
    const meIdx = order.indexOf(performer.id)
    const alreadyThisVerse = s.showdownTurnPerformances
    let best: { g: Element; total: number } | null = null
    const recurse = (verse: number, resist: Element | null, seq: Element[], total: number) => {
      if (verse === verses) {
        if (!best || total > best.total) best = { g: seq[0], total }
        return
      }
      for (const g of mine) {
        const ev = (myEv.get(g) ?? 0) * (g === resist ? immuneFactor(performer) : 1)
        // Strongest performance of this verse decides next verse's immunity
        let strongest = { ev, g: g as Element | null }
        if (verse === 0) {
          for (const done of alreadyThisVerse) if (done.fandom > strongest.ev) strongest = { ev: done.fandom, g: done.element }
        }
        for (const r of rivals) {
          if (verse === 0 && r.idx < meIdx) continue // already played this verse
          let rb = { ev: 0, g: null as Element | null }
          for (const [rg, rawEv] of r.ev) {
            const rev = rawEv * (rg === resist ? immuneFactor(r.p) : 1)
            if (rev > rb.ev) rb = { ev: rev, g: rg }
          }
          if (rb.ev > strongest.ev) strongest = rb
        }
        recurse(verse + 1, strongest.g, [...seq, g], total + ev)
      }
    }
    recurse(0, s.showdownResistElement, [], 0)
    return (best as { g: Element; total: number } | null)?.g ?? null
  }
}
