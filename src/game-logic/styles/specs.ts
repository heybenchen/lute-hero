// KEEP IN SYNC: songStyles.md (repo root) documents every style's rule, price, tunables and simulated strength. When you change style logic, rule text, a price or a style tunable's default, or add or remove a style, update songStyles.md in the same change.
/**
 * Data-defined styles ("style specs"): a small toolkit for designing and
 * simulating new styles without writing engine code for each one.
 *
 * A spec combines:
 *  - roll modifiers, each with an optional condition (die type, element,
 *    first play, combos, target level, fame rank, showdown/fight only, …),
 *  - element-multiplier changes,
 *  - rewards on events (tame, miss, clearing a space, taking a bow, turn start,
 *    end of the showdown) — a miss can also keep the song unspent,
 *  - economy changes (die/upgrade/Inspiration prices, extra moves, spending
 *    Inspiration as EXP),
 *  - new Inspiration uses (rerolls that keep the better result or add a bonus,
 *    free rerolls each turn).
 *
 * The engine applies specs a player holds (`Player.specStyles`), and the
 * simulation bot reads the very same functions to compute its odds, so the
 * simulated play is exact. No shipped style uses this yet: it powers the
 * style lab (`scripts/style-lab.ts`).
 *
 * Shared code: relative imports only.
 */
import { Dice, DiceRoll, DiceType, Genre, Monster, Rng } from '../../types/index.js'
import { getMaxValue, rollDie } from '../dice/roller.js'
import { getTunables } from '../../data/tunables.js'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface SpecCondition {
  /** Die types this applies to. */
  dice?: DiceType[]
  /** The die's element: a specific one, or the bard's starting element. */
  element?: Genre | 'starter'
  /** Only on the first song of the fight (or the first die of a showdown verse). */
  firstPlay?: boolean
  /** Only once at least this many songs were played this fight. */
  playIndexAtLeast?: number
  /** Combo: the previous song this fight shared this die's element. */
  sameElementAsLast?: boolean
  /** Combo: the previous song this fight had a different element. */
  differentElementFromLast?: boolean
  targetLevelAtLeast?: number
  targetLevelAtMost?: number
  /** The target adores this die's element (its 2× element). */
  targetAdores?: boolean
  /** The target hasn't been charmed yet this fight. */
  targetUntouched?: boolean
  /** The target is already wounded. */
  targetWounded?: boolean
  /** Another bard stands on the fight's space. */
  sharingSpace?: boolean
  /** The bard has the least Fame at the table (ties count). */
  trailingFame?: boolean
  /** The bard has the most Fame at the table (ties count). */
  leadingFame?: boolean
  /** true: only in the showdown; false: only in fights. */
  showdown?: boolean
  /** At least this many monsters in the fight. */
  monstersAtLeast?: number
  /** At least this many monsters at the start of the fight (won-over ones still count). */
  monstersAtStartAtLeast?: number
  /** Holding at least this much Inspiration. */
  inspirationAtLeast?: number
  /** Holding at most this much Inspiration. */
  inspirationAtMost?: number
  /** The previous song this fight didn't win its monster over. */
  afterMiss?: boolean
  /** Fires at most once per turn (tracked per spec). */
  oncePerTurn?: boolean
}

export interface RollModifier {
  when?: SpecCondition
  /** Flat bonus; never crits. */
  flat?: number
  /** Bonus that can push the die onto its crit face. */
  critBonus?: number
  /** Roll twice, keep the higher (cancels with disadvantage). */
  advantage?: boolean
  /** Roll twice, keep the lower. */
  disadvantage?: boolean
  /** Crit on this many more faces below the top. */
  critFaceDelta?: number
  /** Rolls below this face count as this face. */
  floor?: number
  /** A roll at or below this face is rerolled once. */
  rerollAtMost?: number
  /** A roll at or below this face is turned to its opposite face. */
  flipAtMost?: number
  /** Each crit bonus die adds this much more. */
  cascadeBonus?: number
  /** The die can't crit. */
  noCrit?: boolean
  /** Multiply the die's total (bonuses and crits included). */
  times?: number
  /** Flat bonus when the die lands on an odd face. Never crits. */
  oddBonus?: number
  /** +this per song already spent this fight. */
  perSpentSong?: number
  /** +this per song already played this fight. */
  perPlayBonus?: number
  /** +this per consecutive earlier song of the same element. */
  perComboBonus?: number
  /** +this per distinct element already played this fight. */
  perElementPlayed?: number
  /** Cap on the per-play/combo/element bonuses. */
  bonusCap?: number
}

export interface MultiplierModifier {
  when?: SpecCondition
  /** Multiplier against monsters that adore the die's element (default 2). */
  adored?: number
  /** Multiplier against monsters unmoved by (immune to) it (default 0). */
  immune?: number
  /** Multiplier against everything else (default 1). */
  neutral?: number
}

export interface SpecReward {
  fame?: number
  exp?: number
  inspiration?: number
}

export interface EventReward {
  when?: SpecCondition
  reward: SpecReward
}

export interface MissEffect {
  when?: SpecCondition
  reward?: SpecReward
  /** The missed song is not spent. */
  keepSong?: boolean
  /** Only when the song moved its monster (dealt any charm). */
  ifCharmed?: boolean
}

export interface StyleSpec {
  id: string
  name: string
  /** Player-facing rule text. */
  rule: string
  /** Design theme, for reports. */
  theme: string
  /** Suggested Studio price. */
  cost: number
  roll?: RollModifier[]
  multiplier?: MultiplierModifier[]
  onTame?: EventReward[]
  onMiss?: MissEffect[]
  /** All monsters on the space tamed. */
  onClear?: SpecReward
  /** A fight that ends with monsters left. */
  onRetreat?: SpecReward
  onTurnStart?: EventReward[]
  /** Extra fandom when the showdown ends: flat, plus per unspent Inspiration. */
  showdownEnd?: { flat?: number; perInspiration?: number }
  economy?: {
    /** Change to the price of a new d4. */
    d4Cost?: number
    /** Change to upgrade prices (optionally only for the starting element). */
    upgradeCost?: number
    upgradeStarterOnly?: boolean
    /** Change to the price of buying Inspiration. */
    inspirationCost?: number
    /** Extra moves per turn. */
    moves?: number
    /** Each Inspiration can stand in for this much EXP in the Studio. */
    inspirationAsExp?: number
  }
  inspiration?: {
    /** An Inspiration reroll keeps whichever result charms more. */
    rerollKeepBetter?: boolean
    /** An Inspiration reroll adds this to each die. */
    rerollBonus?: number
    /** This many Inspiration rerolls per turn cost nothing. */
    freeRerollsPerTurn?: number
  }
}

/** Everything a spec condition can look at for one die of one play. */
export interface PlayContext {
  showdown: boolean
  /** Songs already played this fight (dice already rolled this verse). */
  playIndex: number
  lastElement: Genre | null
  /** Consecutive earlier songs of the same element as this die. */
  comboCount: number
  elementsPlayed: Genre[]
  target: Monster | null
  sharingSpace: boolean
  trailingFame: boolean
  leadingFame: boolean
  inspiration: number
  starter: Genre
  monstersInFight: number
  /** Monsters the fight started with, including any already won over (defaults to monstersInFight). */
  monstersAtStart?: number
  /** Once-per-turn spec ids already fired. */
  used: string[]
  /** Songs already spent this fight. */
  spentSongs?: number
  /** The previous song this fight didn't win its monster over. */
  lastPlayMissed?: boolean
}

/** Generic roll options: the built-in styles and specs both reduce to these. */
export interface GenericRollOptions {
  advantage?: boolean
  disadvantage?: boolean
  critBonus?: number
  critFace?: number
  flat?: number
  rerollAtMost?: number
  flipAtMost?: number
  floor?: number
  cascadeBonus?: number
  noCrit?: boolean
  times?: number
  /** Added when the die's face (after floor) is odd. Never crits. */
  oddBonus?: number
  maxCascades: number
  /** Bonus dice chain on this face or higher (default: the die's top face). */
  cascadeFace?: number
}

// ------------------------------------------------------------------
// Conditions and modifiers
// ------------------------------------------------------------------

export function conditionHolds(c: SpecCondition | undefined, die: Dice, ctx: PlayContext, specId: string): boolean {
  if (!c) return true
  if (c.dice && !c.dice.includes(die.type)) return false
  if (c.element && die.genre !== (c.element === 'starter' ? ctx.starter : c.element)) return false
  if (c.firstPlay !== undefined && (ctx.playIndex === 0) !== c.firstPlay) return false
  if (c.playIndexAtLeast !== undefined && ctx.playIndex < c.playIndexAtLeast) return false
  if (c.sameElementAsLast && ctx.lastElement !== die.genre) return false
  if (c.differentElementFromLast && (ctx.lastElement === null || ctx.lastElement === die.genre)) return false
  if (c.targetLevelAtLeast !== undefined && (!ctx.target || ctx.target.level < c.targetLevelAtLeast)) return false
  if (c.targetLevelAtMost !== undefined && (!ctx.target || ctx.target.level > c.targetLevelAtMost)) return false
  if (c.targetAdores && (!ctx.target || ctx.target.vulnerability !== die.genre)) return false
  if (c.targetUntouched && (!ctx.target || ctx.target.currentHP < ctx.target.maxHP)) return false
  if (c.targetWounded && (!ctx.target || ctx.target.currentHP >= ctx.target.maxHP)) return false
  if (c.sharingSpace && !ctx.sharingSpace) return false
  if (c.trailingFame && !ctx.trailingFame) return false
  if (c.leadingFame && !ctx.leadingFame) return false
  if (c.showdown !== undefined && c.showdown !== ctx.showdown) return false
  if (c.monstersAtLeast !== undefined && ctx.monstersInFight < c.monstersAtLeast) return false
  if (c.inspirationAtMost !== undefined && ctx.inspiration > c.inspirationAtMost) return false
  if (c.afterMiss && !ctx.lastPlayMissed) return false
  if (c.monstersAtStartAtLeast !== undefined && (ctx.monstersAtStart ?? ctx.monstersInFight) < c.monstersAtStartAtLeast) return false
  if (c.inspirationAtLeast !== undefined && ctx.inspiration < c.inspirationAtLeast) return false
  if (c.oncePerTurn && ctx.used.includes(specId)) return false
  return true
}

/**
 * Fold every applicable roll modifier of the bard's specs into generic roll
 * options on top of `base` (the built-in styles' options). Returns which
 * once-per-turn specs fired.
 */
export function applySpecRollModifiers(
  specs: StyleSpec[],
  die: Dice,
  ctx: PlayContext,
  base: GenericRollOptions
): { opts: GenericRollOptions; fired: string[]; applied: string[] } {
  const opts: GenericRollOptions = { ...base }
  const fired: string[] = []
  const applied: string[] = []
  for (const spec of specs) {
    for (const mod of spec.roll ?? []) {
      if (!conditionHolds(mod.when, die, ctx, spec.id)) continue
      if (mod.when?.oncePerTurn) fired.push(spec.id)
      let flat = mod.flat ?? 0
      let scaled = 0
      if (mod.perPlayBonus) scaled += mod.perPlayBonus * ctx.playIndex
      if (mod.perComboBonus) scaled += mod.perComboBonus * ctx.comboCount
      if (mod.perElementPlayed) scaled += mod.perElementPlayed * ctx.elementsPlayed.length
      if (mod.perSpentSong) scaled += mod.perSpentSong * (ctx.spentSongs ?? 0)
      if (mod.bonusCap !== undefined) scaled = Math.min(scaled, mod.bonusCap)
      flat += scaled
      const changes = !!(flat || mod.critBonus || mod.advantage || mod.disadvantage || mod.critFaceDelta || mod.floor ||
        mod.rerollAtMost || mod.flipAtMost || mod.cascadeBonus || mod.noCrit || mod.oddBonus || (mod.times && mod.times !== 1))
      if (changes && !applied.includes(spec.id)) applied.push(spec.id)
      if (flat) opts.flat = (opts.flat ?? 0) + flat
      if (mod.critBonus) opts.critBonus = (opts.critBonus ?? 0) + mod.critBonus
      if (mod.advantage) opts.advantage = true
      if (mod.disadvantage) opts.disadvantage = true
      if (mod.critFaceDelta) opts.critFace = (opts.critFace ?? getMaxValue(die.type)) - mod.critFaceDelta
      if (mod.floor) opts.floor = Math.max(opts.floor ?? 0, mod.floor)
      if (mod.rerollAtMost) opts.rerollAtMost = Math.max(opts.rerollAtMost ?? 0, mod.rerollAtMost)
      if (mod.flipAtMost) opts.flipAtMost = Math.max(opts.flipAtMost ?? 0, mod.flipAtMost)
      if (mod.cascadeBonus) opts.cascadeBonus = (opts.cascadeBonus ?? 0) + mod.cascadeBonus
      if (mod.noCrit) opts.noCrit = true
      if (mod.times) opts.times = (opts.times ?? 1) * mod.times
      if (mod.oddBonus) opts.oddBonus = (opts.oddBonus ?? 0) + mod.oddBonus
    }
  }
  return { opts, fired: [...new Set(fired)], applied }
}

/** The element multiplier for one die against one monster, after spec changes. */
export function specMultiplier(specs: StyleSpec[], die: Dice, monster: Monster, ctx: PlayContext, base: number): number {
  let mult = base
  for (const spec of specs) {
    for (const mod of spec.multiplier ?? []) {
      if (!conditionHolds(mod.when, die, { ...ctx, target: monster }, spec.id)) continue
      if (monster.vulnerability === die.genre && mod.adored !== undefined) mult = Math.max(mult, mod.adored)
      else if (monster.resistance === die.genre && mod.immune !== undefined) mult = Math.max(mult, mod.immune)
      else if (monster.vulnerability !== die.genre && monster.resistance !== die.genre && mod.neutral !== undefined) mult = mod.neutral
    }
  }
  return mult
}

// ------------------------------------------------------------------
// The generic roll (mirrored exactly by src/sim/odds.ts)
// ------------------------------------------------------------------

/** Effective crit face (never below 2, so a crit can't chain forever). */
export function effectiveCritFace(type: DiceType, opts: GenericRollOptions): number {
  return Math.max(2, Math.min(getMaxValue(type), opts.critFace ?? getMaxValue(type)))
}

/**
 * Roll one die under generic options:
 * advantage/disadvantage → one reroll of a low face → flip a low face →
 * floor → crit check (with crit bonus) → crit cascade (plain rolls; each
 * bonus die +cascadeBonus) → flat bonus → ×times.
 */
export function rollWithOptions(die: Dice, opts: GenericRollOptions, rng: Rng): DiceRoll {
  const n = getMaxValue(die.type)
  let v = rollDie(die.type, rng)
  if (opts.advantage !== opts.disadvantage && (opts.advantage || opts.disadvantage)) {
    const second = rollDie(die.type, rng)
    v = opts.advantage ? Math.max(v, second) : Math.min(v, second)
  }
  if (opts.rerollAtMost && v <= opts.rerollAtMost) v = rollDie(die.type, rng)
  if (opts.flipAtMost && v <= opts.flipAtMost) v = n + 1 - v
  if (opts.floor && v < opts.floor) v = Math.min(n, opts.floor)
  const critBonus = opts.critBonus ?? 0
  const isCrit = !opts.noCrit && v + critBonus >= effectiveCritFace(die.type, opts)
  const cascadeRolls: number[] = []
  if (isCrit) {
    let r = rollDie(die.type, rng)
    cascadeRolls.push(r)
    const chainFace = Math.max(2, Math.min(n, opts.cascadeFace ?? n))
    while (r >= chainFace && cascadeRolls.length < opts.maxCascades) {
      r = rollDie(die.type, rng)
      cascadeRolls.push(r)
    }
  }
  const cascade = cascadeRolls.reduce((s, x) => s + x, 0) + cascadeRolls.length * (opts.cascadeBonus ?? 0)
  const flat = (opts.flat ?? 0) + (opts.oddBonus && v % 2 === 1 ? opts.oddBonus : 0)
  const pre = v + critBonus + flat + cascade
  const extra = opts.times && opts.times !== 1 ? Math.round(pre * (opts.times - 1)) : 0
  const bonus = critBonus + flat + extra
  return {
    diceId: die.id,
    value: v,
    isCrit,
    critBonus: cascade,
    cascadeRolls,
    ...(bonus !== 0 ? { bonus } : {}),
  }
}

// ------------------------------------------------------------------
// Rewards and economy
// ------------------------------------------------------------------

export function addRewards(a: SpecReward, b: SpecReward | undefined): SpecReward {
  if (!b) return a
  return {
    fame: (a.fame ?? 0) + (b.fame ?? 0),
    exp: (a.exp ?? 0) + (b.exp ?? 0),
    inspiration: (a.inspiration ?? 0) + (b.inspiration ?? 0),
  }
}

export function economyDelta(specs: StyleSpec[], key: 'd4Cost' | 'inspirationCost' | 'moves' | 'inspirationAsExp'): number {
  return specs.reduce((s, spec) => s + (spec.economy?.[key] ?? 0), 0)
}

export function upgradeDelta(specs: StyleSpec[], die: Dice, starter: Genre): number {
  return specs.reduce((s, spec) => {
    const e = spec.economy
    if (!e?.upgradeCost) return s
    if (e.upgradeStarterOnly && die.genre !== starter) return s
    return s + e.upgradeCost
  }, 0)
}

export function inspirationRules(specs: StyleSpec[]) {
  return {
    keepBetter: specs.some((s) => s.inspiration?.rerollKeepBetter),
    bonus: specs.reduce((t, s) => t + (s.inspiration?.rerollBonus ?? 0), 0),
    freePerTurn: specs.reduce((t, s) => t + (s.inspiration?.freeRerollsPerTurn ?? 0), 0),
  }
}

/** Max cascades from the active tunables, for building generic options. */
export function cascadeCap(): number {
  return getTunables().maxCritCascades
}
