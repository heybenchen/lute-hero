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
 *  - Shopping: every option (new d4, upgrade, style, Inspiration) is scored by
 *    how much it raises the bard's expected Fame per fight against the monsters
 *    actually on the board, per EXP spent. Styles that change rolls are scored
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
import { Dice, DiceType, Genre, Monster, Player, Rng, Song, StyleId } from '../types/index.js'
import { getGenreMultiplier } from '../game-logic/combat/damageCalculator.js'
import { monsterSpawnHp } from '../game-logic/combat/monsterSpawner.js'
import { calculateMonsterExp, calculateMonsterFameValue } from '../game-logic/fame/calculator.js'
import { getValidMoves } from '../game-logic/board/graphBuilder.js'
import { StyleContext, bravoFameFor, builtinRollOptions, elementCount, rubatoUsesLeft, staccatoCanRefresh } from '../game-logic/styles/styleEffects.js'
import { getMaxValue } from '../game-logic/dice/roller.js'
import { getTunables, withTunables } from '../data/tunables.js'
import { inspirationSpend } from '../data/draftCards.js'
import { canAfford, d4CostFor, inspirationCostFor, movesFor, upgradeCostFor } from '../engine/economy.js'
import { specsOf, specsForStyles } from '../data/styleSpecs.js'
import { PlayContext, SpecReward, StyleSpec, applySpecRollModifiers, conditionHolds, inspirationRules, specMultiplier } from '../game-logic/styles/specs.js'
import { styleCost, maxStyles } from '../data/styles.js'
import { DICE_UPGRADE_PATH } from '../data/startingData.js'
import { ALL_GENRES } from '../data/genreTheme.js'
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
  /** Scale on the audit-derived worth of styles the odds can't see. */
  priorScale: number
  /** Plan showdown verses ahead (vs the greedy-with-penalty pick). */
  showdownLookahead: boolean
  /** Rollouts per top fight candidate (0 = pure heuristic). */
  fightRollouts: number
  /** How many top-scoring candidates the rollouts compare. */
  rolloutCandidates: number
  /**
   * How styles are valued when shopping: 'odds' runs roll-changing styles
   * through the exact odds (plus audit priors for the rest); 'measured' uses
   * the smart-bot style audit for every style, scaled by fit with the dice.
   */
  styleValuation: 'odds' | 'measured'
  /**
   * When to stop rerolling a showdown performance: 'par' (reroll while below the
   * expected performance) or 'optimal' (optimal stopping on the exact distribution:
   * reroll when the roll is below the value of rerolling with the rerolls left).
   */
  showdownStop: 'par' | 'optimal'
  /** Inspiration to keep stocked by buying it with leftover EXP (before the endgame reserve). */
  inspirationTarget: number
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
  styleValuation: 'odds',
  showdownStop: 'par',
  inspirationTarget: 2,
}

/**
 * Fame-per-turn worth of styles whose effect the odds can't see, from the
 * style audit (fame share over the baseline × typical Fame per turn), before
 * scaling by how well they fit the bard's dice.
 */
/**
 * Fame per turn each style adds under smart play, from the smart-bot style
 * audit (scripts/style-audit.ts: final Fame share over the no-style baseline
 * × ~32 Fame per turn). Used by the 'measured' style valuation.
 */
const STYLE_MEASURED: Record<StyleId, number> = {
  bravo: 5.8, fermata: 4.8, staccato: 3.5, tutti: 2.6, fortissimo: 1.9, overture: 1.9,
  coda: 1.6, counterpoint: 1.6, virtuoso: 1.0, ostinato: 1.0, rubato: 0.3, ispirato: 0,
  // Studio styles from the style lab: approximate, from their style-lab win rates
  'hometown-hero': 2.3, 'steady-hands': 2.0, 'studio-regular': 2.4, 'inspired-play': 2.4,
  'street-performer': 2.0, 'chain-reaction': 2.4, 'swarm-singer': 1.9, 'jam-session': 2.4,
}

const STYLE_PRIOR: Partial<Record<StyleId, number>> = {
  staccato: 3.2,
  fermata: 3.5,
  bravo: 0, // computed from expected tames
  rubato: 1.2,
  coda: 1.0,
  counterpoint: 0.4,
  ispirato: 0.6,
  // Economy the odds can't see: cheaper upgrades keep paying all game
  'studio-regular': 1.2,
  // An EXP a turn is worth the bot's EXP weight in Fame the odds can't see
  'street-performer': 2.0,
}

/** Style reach checks, following the tunable die-size limits. */
const isVirtuosoDie = (d: Dice) => getMaxValue(d.type) >= getTunables().virtuosoMinFaces && getMaxValue(d.type) <= getTunables().virtuosoMaxFaces
const isFermataDie = (d: Dice) => getMaxValue(d.type) >= getTunables().fermataMinFaces
const isRubatoDie = (d: Dice) => getMaxValue(d.type) <= getTunables().rubatoMaxFaces
const hasHarmony = (songs: Song[]) => elementCount(songs) >= getTunables().tuttiElements

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
    const result = applyAction(this.state, action, this.ctx)
    if (!result.ok) return false
    this.state = result.state
    return true
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
   * same generic options the engine rolls with (built-in styles, then any
   * data-defined styles for the given play).
   */
  private dist(
    die: Dice,
    styles: StyleId[],
    opts: { firstRoll: boolean; advantage: boolean; allElements: boolean },
    specs: StyleSpec[] = [],
    play?: PlayContext
  ): Dist {
    const ctx: StyleContext = {
      styles,
      used: opts.advantage ? [] : ['virtuoso'],
      firstRoll: opts.firstRoll,
      allElements: opts.allElements,
      elementCount: opts.allElements ? 99 : 0,
    }
    let roll = builtinRollOptions(die, ctx, true, [])
    if (specs.length && play) roll = applySpecRollModifiers(specs, die, play, roll).opts
    return rollDist(die.type, roll)
  }

  /** What data-defined style conditions see for a play at `target` (mirrors the engine). */
  private playCtx(fighter: Player, target: Monster, die: Dice | null): PlayContext {
    const combat = this.state.combat
    const log = combat.playLog ?? []
    let combo = 0
    for (let i = log.length - 1; i >= 0 && log[i] === die?.genre; i--) combo++
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
      starter: fighter.starterGenre,
      monstersInFight: (combat.isActive ? combat.monsters : [target]).filter((m) => m.currentHP > 0).length,
      used: combat.specFired ?? [],
    }
  }

  /** A typical play context when estimating fights ahead of time. */
  private neutralCtx(player: Player, target: Monster, specs: StyleSpec[] = specsOf(player), monstersInFight = 2, sharingSpace = false): PlayContext {
    const fames = this.state.players.map((p) => p.fame)
    return {
      showdown: false, playIndex: 1, lastElement: null, comboCount: 0, elementsPlayed: [], target,
      sharingSpace, trailingFame: player.fame <= Math.min(...fames), leadingFame: player.fame >= Math.max(...fames),
      inspiration: player.inspiration, starter: player.starterGenre, monstersInFight,
      // Plan without once-per-turn effects: they help one die a fight, not every one
      used: specs.map((sp) => sp.id),
    }
  }

  /** Fame-equivalent value of a data-defined style reward. */
  private rewardValue(r: SpecReward | undefined): number {
    if (!r) return 0
    return (r.fame ?? 0) + this.p.expWeight * (r.exp ?? 0) + this.p.inspirationValue * (r.inspiration ?? 0)
  }

  private multiplier(die: Dice, m: Monster, counterpoint: boolean, specs: StyleSpec[] = [], play?: PlayContext): number {
    let mult = getGenreMultiplier(die.genre, m)
    if (specs.length && play) mult = specMultiplier(specs, die, m, play, mult)
    if (mult === 0 && counterpoint && m.resistance === die.genre) return getTunables().counterpointMultiplier
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
    return Math.max(0, player.inspiration - (this.endgame() ? this.p.showdownReserve : 0))
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

      // Rallying Cry: bring back the spent song worth the most against what's left
      if (combat.rallyReady && fighter.styles.includes('staccato') && !combat.stylesUsed.includes('staccato')) {
        const spent = fighter.songs.filter((s) => combat.spentSongIds.includes(s.id) && songDie(s) && staccatoCanRefresh(s))
        if (spent.length > 0) {
          const best = spent
            .map((s) => ({ s, v: Math.max(...targets.map((m) => this.playValue(s, m, fighter, alive).score)) }))
            .sort((a, b) => b.v - a.v)[0]
          if (this.act({ type: 'RALLY_SONG', songId: best.s.id })) continue
        }
      }

      const pick = this.bestCandidate(fighter, alive, targets)
      if (!pick) break
      const hpBefore = pick.monster.currentHP
      const ok = pick.featuredFrom
        ? this.act({ type: 'PLAY_FEATURED_SONG', guestPlayerId: pick.featuredFrom, songId: pick.song.id, targetMonsterId: pick.monster.id })
        : this.act({ type: 'PLAY_SONG', songId: pick.song.id, targetMonsterId: pick.monster.id })
      if (!ok) break
      if (!pick.featuredFrom) this.considerReroll(pick, hpBefore)
    }

    this.act({ type: 'END_COMBAT', spreadGenre: this.spreadChoice(this.me) })
  }

  private guestsAt(spaceId: number, fighterId: string): Player[] {
    return this.state.players.filter((p) => p.id !== fighterId && p.position === spaceId)
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
          const mult = getGenreMultiplier(die.genre, m)
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
    const styles = fighter.styles
    const used = new Set(combat.stylesUsed)
    const allEl = hasHarmony(fighter.songs)
    const ms = alive.map((m) => ({ m, hp: m.currentHP, touched: m.currentHP < m.maxHP }))
    let rubatoLeft = rubatoUsesLeft(combat.stylesUsed)
    const canPayLingering = fighter.inspiration >= getTunables().fermataInspirationCost
    const ready = new Set(fighter.songs.filter((s) => songDie(s) && !combat.spentSongIds.includes(s.id)).map((s) => s.id))
    let firstRoll = combat.songsUsed.length === 0
    const bravo = (level: number) => (styles.includes('bravo') ? bravoFameFor(level) : 0)
    const specs = specsOf(fighter)
    let value = 0
    let lockedTargetId = combat.lockedTargetMonsterId
    const play = (song: Song, target: (typeof ms)[number]) => {
      const die = songDie(song)!
      const counter = styles.includes('counterpoint') && !used.has('counterpoint')
      let mult = getGenreMultiplier(die.genre, target.m)
      if (mult === 0 && counter && target.m.resistance === die.genre) {
        mult = getTunables().counterpointMultiplier
        used.add('counterpoint')
      }
      const adv = styles.includes('virtuoso') && !used.has('virtuoso') && isVirtuosoDie(die)
      if (adv) used.add('virtuoso')
      const d = this.dist(die, styles, { firstRoll, advantage: adv, allElements: allEl }, specs, specs.length ? this.playCtx(fighter, target.m, die) : undefined)
      firstRoll = false
      let dmg = Math.floor(sample(d, rng) * mult)
      if (dmg < target.hp && styles.includes('rubato') && rubatoLeft > 0 && isRubatoDie(die)) {
        // Nimble Fingers keeps the higher of the two rolls
        rubatoLeft--
        dmg = Math.max(dmg, Math.floor(sample(d, rng) * mult))
      }
      if (dmg > 0) target.touched = true
      if (dmg >= target.hp) {
        lockedTargetId = null
        target.hp = 0
        value += calculateMonsterFameValue(target.m.level) + bravo(target.m.level)
        return
      }
      if (dmg > 0) lockedTargetId = target.m.id
      target.hp -= dmg
      if (styles.includes('fermata') && !used.has('fermata') && isFermataDie(die) && canPayLingering) used.add('fermata')
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
        const d = this.dist(die, styles, { firstRoll, advantage: styles.includes('virtuoso') && !used.has('virtuoso'), allElements: allEl })
        for (const x of live) {
          if (lockedTargetId && x.m.id !== lockedTargetId) continue
          const mult = getGenreMultiplier(die.genre, x.m)
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
    const used = combat.stylesUsed
    const has = (id: StyleId) => fighter.styles.includes(id)
    const avail = (id: StyleId) => has(id) && !used.includes(id)
    const counterpoint = avail('counterpoint')
    const specs = specsOf(fighter)
    const play = specs.length ? this.playCtx(fighter, m, die) : undefined
    const mult = this.multiplier(die, m, counterpoint, specs, play)
    if (mult <= 0) return { score: -Infinity, pk: 0, dmgPossible: false }

    const d = this.dist(die, fighter.styles, {
      firstRoll: combat.songsUsed.length === 0,
      advantage: avail('virtuoso'),
      allElements: hasHarmony(fighter.songs),
    }, specs, play)
    let pk = killChance(d, mult, m.currentHP)
    const untouched = m.currentHP >= m.maxHP
    let worth = this.monsterWorth(m, untouched)
    // Data-defined styles: tame rewards, miss rewards, misses that keep the song
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
    const freeReroll = has('rubato') && rubatoUsesLeft(used) > 0 && isRubatoDie(die)
    if (freeReroll) pk = 1 - (1 - pk) ** 2
    let inspirationSpend = 0
    if (this.spareInspiration(fighter) >= 1 && pk * worth > this.p.inspirationValue * 1.5) {
      inspirationSpend = (1 - pk) * this.p.inspirationValue
      pk = 1 - (1 - pk) ** 2
    }

    const lingeringCost = getTunables().fermataInspirationCost
    const lingering = avail('fermata') && isFermataDie(die) && fighter.inspiration >= lingeringCost
    const totalWorth = alive.reduce((s, x) => s + this.monsterWorth(x, x.currentHP >= x.maxHP), 0)
    const totalHp = alive.reduce((s, x) => s + x.currentHP, 0)
    const unitAll = totalWorth / Math.max(1, totalHp)
    const unitHere = worth / Math.max(1, m.currentHP)
    const missCost = specKeeps ? 0 : lingering ? lingeringCost * this.p.inspirationValue : this.p.songCost * mean(d) * unitAll
    const chip = Math.min(expectedChipOnMiss(d, mult, m.currentHP), m.currentHP - 1) * unitHere * this.p.chipCredit
    // A miss on an untouched monster still wounds it: its EXP is paid even on a retreat
    const woundExp = untouched ? this.p.expWeight * calculateMonsterExp(m.level) * 0.5 : 0
    const bravo = has('bravo') ? bravoFameFor(m.level) : 0
    const score = pk * (worth + bravo) + (1 - pk) * (chip + woundExp + missReward - missCost) - inspirationSpend
    return { score, pk, dmgPossible: expectedDamage(d, mult) > 0 }
  }

  /** After a miss (the song is spent and the target stands): reroll if it pays. */
  private considerReroll(pick: Candidate, hpBefore: number): void {
    for (let i = 0; i < 4; i++) {
      const combat = this.state.combat
      const target = combat.monsters.find((m) => m.id === pick.monster.id)
      const lastId = combat.lastPlayedSongId
      if (!target || target.currentHP <= 0 || !lastId || !combat.spentSongIds.includes(lastId)) return
      const fighter = this.me
      const die = songDie(pick.song)!
      const mult = this.multiplier(die, { ...target, currentHP: hpBefore }, false) || getGenreMultiplier(die.genre, target)
      const d = this.dist(die, fighter.styles, { firstRoll: false, advantage: false, allElements: hasHarmony(fighter.songs) })
      const pk = killChance(d, mult, hpBefore)
      const worth = this.monsterWorth(target, false) + (fighter.styles.includes('bravo') ? bravoFameFor(target.level) : 0)
      const canFree = fighter.styles.includes('rubato') && rubatoUsesLeft(combat.stylesUsed) > 0 && isRubatoDie(die)
      if (canFree && pk > 0.05 && this.act({ type: 'REROLL_SONG', rubato: true })) continue
      const freeLeft = inspirationRules(specsOf(fighter)).freePerTurn > combat.freeRerollsUsed
      if (freeLeft && pk > 0.05 && this.act({ type: 'REROLL_SONG' })) continue
      if (this.spareInspiration(fighter) >= 1 && pk * worth > this.p.inspirationValue && this.act({ type: 'REROLL_SONG' })) continue
      return
    }
  }

  /** Spread the element this bard's dice hit hardest, so new monsters near it adore its songs. */
  private spreadChoice(player: Player): Genre {
    const weight = new Map<Genre, number>()
    for (const song of player.songs) {
      const die = songDie(song)
      if (die) weight.set(die.genre, (weight.get(die.genre) ?? 0) + mean(this.dist(die, player.styles, { firstRoll: false, advantage: false, allElements: false })))
    }
    let best: Genre = player.starterGenre
    for (const [g, w] of weight) if (w > (weight.get(best) ?? 0)) best = g
    return best
  }

  /**
   * Expected value of fighting these monsters with this setlist: for each
   * monster, the best single song's tame chance (a tame returns the die, so
   * the same song can chain), with chip-assisted kills and wound EXP for the
   * rest. Used for moving and for valuing purchases.
   */
  estimateFight(monsters: Monster[], player: Player, guests = 0, styles: StyleId[] = player.styles, songs: Song[] = player.songs): number {
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
      const specs = specsForStyles(styles, player.specStyles)
      const play = specs.length ? this.neutralCtx(player, m, specs, monsters.length, guests > 0) : undefined
      for (const die of dice) {
        const mult = this.multiplier(die, m, false, specs, play)
        if (mult <= 0) continue
        hits = true
        const d = this.dist(die, styles, { firstRoll: false, advantage: styles.includes('virtuoso'), allElements: allEl }, specs, play)
        let pk = killChance(d, mult, m.currentHP)
        if (styles.includes('rubato') && isRubatoDie(die)) pk = 1 - (1 - pk) ** (1 + Math.min(1, getTunables().rubatoUsesPerTurn / 2))
        if (styles.includes('fermata') && isFermataDie(die)) pk = 1 - (1 - pk) ** 1.6
        best = Math.max(best, pk)
        chipSum += expectedDamage(d, mult, m.currentHP)
      }
      if (!hits) continue
      const chipKill = chipSum >= m.currentHP ? 0.55 : chipSum / m.currentHP * 0.3
      const pTame = best + (1 - best) * chipKill
      tames += pTame
      if (styles.includes('bravo')) total += pTame * bravoFameFor(m.level)
      total += pTame * calculateMonsterFameValue(m.level) + this.p.expWeight * calculateMonsterExp(m.level) * 0.9
    }
    if (styles.includes('staccato')) total += Math.min(1, tames) * (STYLE_PRIOR.staccato ?? 0)
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
    let best = me.position
    let bestScore = valueAt(me.position)
    for (const id of reach.keys()) {
      const v = valueAt(id)
      if (v > bestScore + 0.01) {
        best = id
        bestScore = v
      }
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
  private boardStrength(player: Player, songs: Song[], styles: StyleId[]): number {
    if (this.p.styleValuation === 'measured') return this.boardStrengthMeasured(player, songs, styles)
    let total = 0
    const fw = this.p.futureWeight
    for (const space of this.state.spaces) {
      if (space.monsters.length === 0) continue
      total += (1 - fw) * this.estimateFight(space.monsters, player, 0, styles, songs)
      if (fw > 0) total += fw * this.estimateFight(this.grownMonsters(space.monsters), player, 0, styles, songs)
    }
    // Styles the odds can't see, scaled to how well they fit the dice
    const dice = songs.map(songDie).filter((d): d is Dice => !!d)
    const big = dice.filter((d) => BIG.includes(d.type)).length
    const small = dice.filter((d) => SMALL.includes(d.type)).length
    const fit: Partial<Record<StyleId, number>> = {
      fermata: Math.min(1, big / 2),
      rubato: Math.min(1, small / 3),
      coda: songs.length >= 7 ? 1 : 0,
      counterpoint: 1,
      ispirato: player.inspiration < 1 ? 1 : 0.3,
    }
    // Spread over the board's spaces so priors and odds share one scale
    const spaces = Math.max(1, this.state.spaces.filter((s) => s.monsters.length > 0).length)
    for (const s of styles) {
      const prior = STYLE_PRIOR[s]
      if (prior) total += prior * this.p.priorScale * (fit[s] ?? 1) * spaces * 0.25
    }
    return total
  }

  /** Board strength with every style valued from the audit, scaled by fit. */
  private boardStrengthMeasured(player: Player, songs: Song[], styles: StyleId[]): number {
    let total = 0
    for (const space of this.state.spaces) {
      if (space.monsters.length > 0) total += this.estimateFight(space.monsters, player, 0, [], songs)
    }
    const dice = songs.map(songDie).filter((d): d is Dice => !!d)
    const count = (types: DiceType[]) => dice.filter((d) => types.includes(d.type)).length
    const elements = new Set(dice.map((d) => d.genre)).size
    const fit: Record<StyleId, number> = {
      bravo: 1, staccato: 1, overture: 1, counterpoint: 1, coda: 1,
      fermata: Math.min(1, count(BIG) / 2),
      virtuoso: Math.min(1, count(BIG) / 2),
      fortissimo: Math.min(1, count(['d20']) / 2),
      ostinato: Math.min(1, dice.filter((d) => getMaxValue(d.type) <= getTunables().ostinatoMaxFaces).length / 3),
      rubato: Math.min(1, dice.filter(isRubatoDie).length / 3),
      tutti: elements >= 4 ? 1 : elements === 3 ? 0.5 : 0.1,
      ispirato: player.inspiration < 1 ? 1 : 0.3,
      'hometown-hero': Math.min(1, dice.filter((d) => d.genre === player.starterGenre).length / 3),
      'steady-hands': Math.min(1, dice.filter((d) => getMaxValue(d.type) <= 8).length / 2),
      'studio-regular': 1, 'street-performer': 1, 'chain-reaction': 1, 'swarm-singer': 1, 'jam-session': 1,
      'inspired-play': player.inspiration >= getTunables().inspiredPlayMin ? 1 : 0.5,
    }
    const spaces = Math.max(1, this.state.spaces.filter((s) => s.monsters.length > 0).length)
    for (const st of styles) total += STYLE_MEASURED[st] * fit[st] * this.p.priorScale * spaces * 0.25
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
   * Style audits: from `fromRound` on, this bot buys `id` (if it is on the
   * shelf) as soon as it can afford it, before anything else in the Studio,
   * paying the real price out of its real EXP.
   */
  forcedStyle?: { id: StyleId; fromRound: number }

  private shop(): void {
    const me = this.me
    if (!this.act({ type: 'OPEN_STUDIO', playerId: me.id })) return
    this.refreshedThisTurn = false
    const forced = this.forcedStyle
    if (forced && this.state.currentRound + 1 >= forced.fromRound && !me.styles.includes(forced.id)) {
      const offerIndex = this.state.styleOffers.indexOf(forced.id)
      if (offerIndex >= 0 && canAfford(me, styleCost(forced.id))) {
        // At the style cap the first owned style makes room
        const replaceStyleId = me.styles.length >= maxStyles() ? me.styles[0] : undefined
        this.act({ type: 'BUY_STYLE', offerIndex, ...(replaceStyleId ? { replaceStyleId } : {}) })
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

    const base = this.boardStrength(me, me.songs, me.styles)
    const options: { value: number; cost: number; action: GameAction }[] = []
    const offers = this.state.elementOffers

    // New d4 into an empty song
    if (emptySong && !reward && canAfford(me, d4CostFor(me))) {
      const seen = new Set<Genre>()
      offers.forEach((g, idx) => {
        if (seen.has(g)) return
        seen.add(g)
        const songs = me.songs.map((s) => (s.id === emptySong.id ? { ...s, slots: [{ dice: { id: 'x', type: 'd4' as DiceType, genre: g } }] as Song['slots'] } : s))
        options.push({ value: this.boardStrength(me, songs, me.styles) - base, cost: d4CostFor(me), action: { type: 'BUY_DIE', offerIndex: idx } })
      })
    }

    // Upgrades on a matching chip
    for (const song of me.songs) {
      const die = songDie(song)
      if (!die) continue
      const cost = upgradeCostFor(me, die)
      const next = DICE_UPGRADE_PATH[die.type]
      const idx = offers.indexOf(die.genre)
      if (cost === null || !next || idx === -1 || !canAfford(me, cost)) continue
      const songs = me.songs.map((s) => (s.id === song.id ? { ...s, slots: [{ dice: { ...die, type: next } }] as Song['slots'] } : s))
      options.push({ value: this.boardStrength(me, songs, me.styles) - base, cost, action: { type: 'UPGRADE_DIE', offerIndex: idx, diceId: die.id } })
    }

    // Styles (replacing the weakest one at the cap)
    this.state.styleOffers.forEach((id, offerIndex) => {
      if (me.styles.includes(id)) return
      const cost = styleCost(id)
      if (!canAfford(me, cost)) return
      if (me.styles.length < maxStyles()) {
        const songs = id === 'coda' ? [...me.songs, { id: 'coda-x', used: false, slots: [{ dice: null }] as Song['slots'] }] : me.songs
        options.push({ value: this.boardStrength(me, songs, [...me.styles, id]) - base, cost, action: { type: 'BUY_STYLE', offerIndex } })
      } else {
        let bestDrop: StyleId | null = null
        let bestValue = 0
        for (const drop of me.styles) {
          const styles = [...me.styles.filter((s) => s !== drop), id]
          const v = this.boardStrength(me, me.songs, styles) - base
          if (v > bestValue) {
            bestValue = v
            bestDrop = drop
          }
        }
        // Swapping throws away what the old style cost: demand a clear gain
        if (bestDrop) options.push({ value: bestValue * 0.7, cost, action: { type: 'BUY_STYLE', offerIndex, replaceStyleId: bestDrop } })
      }
    })

    // Rank by value per EXP; a future-proof bias for big upgrades (they keep paying)
    const ranked = options
      .map((o) => ({ ...o, ratio: o.value / Math.max(1, o.cost) }))
      .filter((o) => o.ratio > this.p.buyThreshold)
      .sort((a, b) => b.ratio - a.ratio)
    for (const o of ranked) if (this.act(o.action)) return true

    // Nothing good on the shelf and EXP to spend: redraw with spare Inspiration
    const cheapest = Math.min(...me.songs.map(songDie).filter((d): d is Dice => !!d).map((d) => upgradeCostFor(me, d) ?? Infinity), d4CostFor(me) + (emptySong ? 0 : 99))
    if (!this.refreshedThisTurn && this.spareInspiration(me) >= 1 + inspirationSpend() && me.exp >= Math.max(4, cheapest * 2)) {
      this.refreshedThisTurn = true
      if (this.act({ type: 'REFRESH_ELEMENT_OFFERS' })) return true
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
  private performanceDist(player: Player, genre: Genre): Dist | null {
    const dice = player.songs.map(songDie).filter((d): d is Dice => !!d && d.genre === genre)
    if (dice.length === 0) return null
    const allEl = hasHarmony(player.songs)
    const specs = specsOf(player)
    const fames = this.state.players.map((p) => p.fame)
    let acc: Dist | null = null
    dice.forEach((die, i) => {
      const play: PlayContext | undefined = specs.length ? {
        showdown: true, playIndex: i, lastElement: null, comboCount: 0, elementsPlayed: [], target: null,
        sharingSpace: false, trailingFame: player.fame <= Math.min(...fames), leadingFame: player.fame >= Math.max(...fames),
        inspiration: player.inspiration, starter: player.starterGenre, monstersInFight: 1, used: [],
      } : undefined
      const d = this.dist(die, player.styles, { firstRoll: i === 0, advantage: i === dice.findIndex((x) => isVirtuosoDie(x)), allElements: allEl }, specs, play)
      acc = acc ? convolve(acc, d) : d
    })
    return acc
  }

  /** Play the current showdown performer's verse: element choice, rerolls, finish. */
  playShowdownTurn(): void {
    this.t(() => {
      const s = this.state
      const performer = s.players.find((p) => p.id === s.showdownOrder[s.showdownPerformerIdx])!
      const resist = s.showdownResistGenre
      const versesLeft = getTunables().showdownTurns - s.showdownTurn
      const options = ALL_GENRES.map((g) => ({ g, d: this.performanceDist(performer, g) }))
        .filter((o): o is { g: Genre; d: Dist } => !!o.d)
        .map((o) => ({ ...o, ev: o.g === resist ? 0 : mean(o.d) }))
      if (options.length === 0) {
        this.act({ type: 'FINISH_SHOWDOWN_PERFORMANCE' })
        return
      }
      // Rivals' best expected performance this verse, to judge whether ours will be the strongest
      const rivalBest = Math.max(0, ...s.players.filter((p) => p.id !== performer.id).flatMap((p) =>
        ALL_GENRES.filter((g) => g !== resist).map((g) => {
          const d = this.performanceDist(p, g)
          return d ? mean(d) : 0
        })
      ))
      if (this.p.showdownLookahead && versesLeft > 0) {
        const planned = this.planShowdown(performer, options.map((o) => o.g))
        if (planned) {
          const songId = performer.songs.find((sg) => songDie(sg)?.genre === planned)!.id
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
      const songId = performer.songs.find((sg) => songDie(sg)?.genre === pick.g)!.id
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
      const hasFree = me.styles.includes('rubato') && !now.showdownUndo?.rubatoUsed &&
        me.songs.some((sg) => (now.showdownUndo?.songIds ?? []).includes(sg.id) && (songDie(sg) ? isRubatoDie(songDie(sg)!) : false))
      if (hasFree && this.act({ type: 'REROLL_SHOWDOWN_SONG', rubato: true })) continue
      // Spread spare Inspiration over the verses still to come
      const budget = versesLeft === 0 ? me.inspiration : Math.floor(me.inspiration / (versesLeft + 1)) || (me.inspiration > versesLeft ? 1 : 0)
      if (this.p.showdownStop === 'optimal') {
        const hasFreeRubato = me.styles.includes('rubato') && !now.showdownUndo?.rubatoUsed
        const rerolls = budget + (freeLeft ? 1 : 0) + (hasFreeRubato ? 1 : 0)
        const dist = this.currentPerformanceDist(me)
        if (rerolls < 1 || !dist || got >= this.stopThreshold(dist, rerolls)) return
      } else if (got >= par * (versesLeft === 0 ? 1 : 0.85)) return
      if (freeLeft && this.act({ type: 'REROLL_SHOWDOWN_SONG' })) continue
      if (perInsp > 0 && par - got < perInsp * 2) return
      if (budget >= 1 && this.act({ type: 'REROLL_SHOWDOWN_SONG' })) continue
      return
    }
  }

  /** The distribution of the performance on the table (every die of the performed element). */
  private currentPerformanceDist(me: Player): Dist | null {
    const genre = this.state.showdownCurrentGenre
    return genre ? this.performanceDist(me, genre) : null
  }

  /**
   * Optimal stopping with `k` rerolls left: keep a roll at or above this value. With one reroll it is
   * the mean; each extra reroll raises it to E[max(X, previous)].
   */
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
  private planShowdown(performer: Player, mine: Genre[]): Genre | null {
    const s = this.state
    const verses = getTunables().showdownTurns - s.showdownTurn + 1
    const evOf = (p: Player) => {
      const m = new Map<Genre, number>()
      for (const g of ALL_GENRES) {
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
    let best: { g: Genre; total: number } | null = null
    const recurse = (verse: number, resist: Genre | null, seq: Genre[], total: number) => {
      if (verse === verses) {
        if (!best || total > best.total) best = { g: seq[0], total }
        return
      }
      for (const g of mine) {
        const ev = g === resist ? 0 : myEv.get(g) ?? 0
        // Strongest performance of this verse decides next verse's immunity
        let strongest = { ev, g: g as Genre | null }
        if (verse === 0) {
          for (const done of alreadyThisVerse) if (done.fandom > strongest.ev) strongest = { ev: done.fandom, g: done.genre }
        }
        for (const r of rivals) {
          if (verse === 0 && r.idx < meIdx) continue // already played this verse
          let rb = { ev: 0, g: null as Genre | null }
          for (const [rg, rev] of r.ev) if (rg !== resist && rev > rb.ev) rb = { ev: rev, g: rg }
          if (rb.ev > strongest.ev) strongest = rb
        }
        recurse(verse + 1, strongest.g, [...seq, g], total + ev)
      }
    }
    recurse(0, s.showdownResistGenre, [], 0)
    return (best as { g: Genre; total: number } | null)?.g ?? null
  }
}
