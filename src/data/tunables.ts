/**
 * Every balance number in the game, in one editable place.
 *
 * The playtest debug panel writes these; the engine reads them. Tunables live
 * inside `EngineState`, so they travel with saves and sync to every online
 * client automatically, and `applyAction` stays deterministic for a given
 * (state, action, rng) triple.
 *
 * Reading happens through the module-level "active" set rather than a threaded
 * parameter — `applyAction` scopes it to `state.tunables` around the reduce
 * (see `withTunables`), which keeps ~50 call sites free of plumbing.
 */

export interface Tunables {
  // --- Progression ---
  /** Fame any single player must reach to trigger the Final Showdown. */
  fameFinalBossThreshold: number
  /** Fame a defeated monster is worth, indexed by level 1..5. */
  monsterFameByLevel: number[]
  /** EXP a monster is worth per level (Lv N = N × this). */
  monsterExpPerLevel: number
  /** Bonus EXP for clearing every monster on a space. */
  spaceClearExpBonus: number

  // --- Turn structure ---
  maxMovesPerTurn: number
  maxFightsPerTurn: number
  /** Chips of EACH element every bard is dealt to place at round end. */
  roundEndChipsPerElement: number

  // --- Board ---
  /** Cap on chips of ONE element per space. A space's total is uncapped. */
  maxTagsPerGenre: number
  /** Chips every space carries when the game begins. */
  startingTagsPerSpace: number

  // --- Monsters ---
  maxMonsterLevel: number
  /** HP a level-1 monster spawns with, before the level multiplier. */
  monsterBaseHp: number
  /** HP multiplier by monster level 1..5, applied to the template's base HP. */
  hpMultipliers: number[]
  /** Global scale on every monster's spawn HP (1 = template value). */
  monsterHpScale: number

  // --- Combat multipliers ---
  /** Damage multiplier when a die's element matches the monster's weakness. */
  vulnerabilityMultiplier: number
  /** Damage multiplier when it matches the monster's immunity. */
  resistanceMultiplier: number
  /** Cap on chained crit re-rolls for a single die. */
  maxCritCascades: number

  // --- Economy ---
  startingInspiration: number
  newD4Cost: number
  upgradeCostD8: number
  upgradeCostD12: number
  upgradeCostD20: number
  /** First Inspiration of a turn costs this; each further one adds the step. */
  inspirationBaseCost: number
  inspirationCostStep: number
  /** Inspiration spent per reroll / travel / shop refresh. */
  inspirationSpend: number

  // --- Shop ---
  elementOfferCount: number
  chipsPerElementPerPlayer: number

  // --- Final Showdown ---
  showdownTurns: number
}

export const DEFAULT_TUNABLES: Tunables = {
  fameFinalBossThreshold: 150,
  monsterFameByLevel: [5, 10, 25, 50, 75],
  monsterExpPerLevel: 1,
  spaceClearExpBonus: 1,

  maxMovesPerTurn: 2,
  maxFightsPerTurn: 1,
  roundEndChipsPerElement: 1,

  maxTagsPerGenre: 5,
  startingTagsPerSpace: 1,

  maxMonsterLevel: 5,
  monsterBaseHp: 8,
  hpMultipliers: [1, 1.75, 3, 5, 7.5],
  monsterHpScale: 1,

  vulnerabilityMultiplier: 2,
  resistanceMultiplier: 0,
  maxCritCascades: 10,

  startingInspiration: 1,
  newD4Cost: 1,
  upgradeCostD8: 2,
  upgradeCostD12: 3,
  upgradeCostD20: 6,
  inspirationBaseCost: 1,
  inspirationCostStep: 1,
  inspirationSpend: 1,

  elementOfferCount: 4,
  chipsPerElementPerPlayer: 6,

  showdownTurns: 3,
}

// ============================================================
// Field metadata — drives the debug panel's controls
// ============================================================

export type TunableGroup =
  | 'Progression'
  | 'Turn structure'
  | 'Board'
  | 'Monsters'
  | 'Combat'
  | 'Economy'
  | 'Shop'
  | 'Showdown'

export interface TunableField {
  /** Scalar key, or `key.index` for one slot of an array tunable. */
  path: string
  label: string
  group: TunableGroup
  min: number
  max: number
  step: number
  help?: string
}

/** Numeric keys of Tunables (everything except the array-valued ones). */
type ScalarKey = Exclude<keyof Tunables, 'monsterFameByLevel' | 'hpMultipliers'>

const SCALAR_FIELDS: { key: ScalarKey; label: string; group: TunableGroup; min: number; max: number; step: number; help?: string }[] = [
  { key: 'fameFinalBossThreshold', label: 'Final Showdown fame gate', group: 'Progression', min: 1, max: 1000, step: 5, help: 'Any single player reaching this grants one final turn, then the boss.' },
  { key: 'monsterExpPerLevel', label: 'EXP per monster level', group: 'Progression', min: 0, max: 20, step: 1 },
  { key: 'spaceClearExpBonus', label: 'Space-clear EXP bonus', group: 'Progression', min: 0, max: 20, step: 1, help: 'Extra EXP for clearing every monster on a space.' },

  { key: 'maxMovesPerTurn', label: 'Moves per turn', group: 'Turn structure', min: 0, max: 16, step: 1 },
  { key: 'maxFightsPerTurn', label: 'Fights per turn', group: 'Turn structure', min: 0, max: 10, step: 1 },
  { key: 'roundEndChipsPerElement', label: 'Round-end chips per element', group: 'Turn structure', min: 0, max: 5, step: 1, help: 'At round end every bard is dealt this many chips of each element to place.' },

  { key: 'maxTagsPerGenre', label: 'Max chips per element, per space', group: 'Board', min: 1, max: 20, step: 1, help: 'A space holds any number of chips; only same-element chips are capped.' },
  { key: 'startingTagsPerSpace', label: 'Starting chips per space', group: 'Board', min: 0, max: 10, step: 1, help: 'Applied when a new game starts.' },

  { key: 'maxMonsterLevel', label: 'Max monster level', group: 'Monsters', min: 1, max: 10, step: 1 },
  { key: 'monsterBaseHp', label: 'Base HP (Lv.1)', group: 'Monsters', min: 1, max: 100, step: 1, help: 'Every monster spawns from this, times its level multiplier.' },
  { key: 'monsterHpScale', label: 'Monster HP scale', group: 'Monsters', min: 0.1, max: 10, step: 0.1, help: 'Global multiplier on spawn HP. Lower = faster fights.' },

  { key: 'vulnerabilityMultiplier', label: 'Weakness multiplier', group: 'Combat', min: 0, max: 10, step: 0.25 },
  { key: 'resistanceMultiplier', label: 'Immunity multiplier', group: 'Combat', min: 0, max: 10, step: 0.25 },
  { key: 'maxCritCascades', label: 'Max crit cascades', group: 'Combat', min: 1, max: 50, step: 1 },

  { key: 'startingInspiration', label: 'Starting Inspiration', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'newD4Cost', label: 'New d4 cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD8', label: 'Upgrade → d8', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD12', label: 'Upgrade → d12', group: 'Economy', min: 0, max: 30, step: 1 },
  { key: 'upgradeCostD20', label: 'Upgrade → d20', group: 'Economy', min: 0, max: 40, step: 1 },
  { key: 'inspirationBaseCost', label: 'Inspiration base cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'inspirationCostStep', label: 'Inspiration cost step', group: 'Economy', min: 0, max: 20, step: 1, help: 'Added per Inspiration already bought this turn.' },
  { key: 'inspirationSpend', label: 'Inspiration per use', group: 'Economy', min: 0, max: 10, step: 1 },

  { key: 'elementOfferCount', label: 'Element chips on offer', group: 'Shop', min: 1, max: 12, step: 1 },
  { key: 'chipsPerElementPerPlayer', label: 'Bag chips per element/player', group: 'Shop', min: 1, max: 30, step: 1 },

  { key: 'showdownTurns', label: 'Showdown verses', group: 'Showdown', min: 1, max: 10, step: 1 },
]

const LEVEL_COUNT = 5

export const TUNABLE_FIELDS: TunableField[] = [
  ...SCALAR_FIELDS.filter((f) => f.group === 'Progression').map(toField),
  ...Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    path: `monsterFameByLevel.${i}`,
    label: `Fame — Lv.${i + 1} monster`,
    group: 'Progression' as const,
    min: 0,
    max: 500,
    step: 1,
  })),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Turn structure').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Board').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Monsters').map(toField),
  ...Array.from({ length: LEVEL_COUNT }, (_, i) => ({
    path: `hpMultipliers.${i}`,
    label: `HP × — Lv.${i + 1}`,
    group: 'Monsters' as const,
    min: 0.1,
    max: 25,
    step: 0.25,
  })),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Combat').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Economy').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Shop').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Showdown').map(toField),
]

function toField(f: (typeof SCALAR_FIELDS)[number]): TunableField {
  return { path: f.key, label: f.label, group: f.group, min: f.min, max: f.max, step: f.step, help: f.help }
}

export const TUNABLE_GROUPS: TunableGroup[] = [
  'Progression',
  'Turn structure',
  'Board',
  'Monsters',
  'Combat',
  'Economy',
  'Shop',
  'Showdown',
]

// ============================================================
// Read / write a tunable by its field path
// ============================================================

export function readTunable(tunables: Tunables, path: string): number {
  const [key, index] = path.split('.')
  const value = (tunables as unknown as Record<string, number | number[]>)[key]
  if (Array.isArray(value)) return value[Number(index)] ?? 0
  return typeof value === 'number' ? value : 0
}

/** Immutably set one field path, clamped to its declared range. */
export function writeTunable(tunables: Tunables, path: string, raw: number): Tunables {
  const field = TUNABLE_FIELDS.find((f) => f.path === path)
  if (!field || !Number.isFinite(raw)) return tunables
  const value = Math.min(Math.max(raw, field.min), field.max)

  const [key, index] = path.split('.')
  const current = (tunables as unknown as Record<string, number | number[]>)[key]
  if (Array.isArray(current)) {
    const next = [...current]
    next[Number(index)] = value
    return { ...tunables, [key]: next }
  }
  return { ...tunables, [key]: value }
}

/**
 * Fill missing keys from defaults and clamp everything into range, so a stale
 * save or a hand-edited preset can never put the engine into a broken state.
 */
export function normalizeTunables(partial: Partial<Tunables> | null | undefined): Tunables {
  const source = (partial ?? {}) as Record<string, unknown>

  // Copy only keys the current schema knows about, so a value retired in a
  // later version (say the old `upgradeCostD6`) is dropped rather than carried
  // around forever inside every save and preset.
  const merged = { ...DEFAULT_TUNABLES } as Record<string, unknown>
  for (const key of Object.keys(DEFAULT_TUNABLES)) {
    if (typeof source[key] === 'number') merged[key] = source[key]
  }
  merged.monsterFameByLevel = fillArray(partial?.monsterFameByLevel, DEFAULT_TUNABLES.monsterFameByLevel)
  merged.hpMultipliers = fillArray(partial?.hpMultipliers, DEFAULT_TUNABLES.hpMultipliers)

  return TUNABLE_FIELDS.reduce(
    (acc, field) => writeTunable(acc, field.path, readTunable(acc, field.path)),
    merged as unknown as Tunables
  )
}

function fillArray(value: number[] | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value)) return [...fallback]
  return fallback.map((def, i) => (typeof value[i] === 'number' && Number.isFinite(value[i]) ? value[i] : def))
}

/** Field paths whose value differs from the shipped default. */
export function changedTunablePaths(tunables: Tunables): string[] {
  return TUNABLE_FIELDS.filter((f) => readTunable(tunables, f.path) !== readTunable(DEFAULT_TUNABLES, f.path)).map(
    (f) => f.path
  )
}

// ============================================================
// Active set
// ============================================================

let active: Tunables = DEFAULT_TUNABLES

/** The tunables the engine and game-logic read right now. */
export function getTunables(): Tunables {
  return active
}

/**
 * Point the engine at a tunable set. `applyAction` calls this via
 * `withTunables` for the duration of one reduce; the store also calls it when
 * mirroring authoritative state so UI reads (costs, caps) match the engine.
 */
export function setActiveTunables(tunables: Partial<Tunables> | null | undefined): void {
  active = normalizeTunables(tunables)
}

/** Run `fn` with `tunables` active, restoring the previous set afterwards. */
export function withTunables<T>(tunables: Partial<Tunables> | null | undefined, fn: () => T): T {
  const previous = active
  active = normalizeTunables(tunables)
  try {
    return fn()
  } finally {
    active = previous
  }
}
