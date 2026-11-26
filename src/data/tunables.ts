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

  // --- Styles (see src/data/styles.ts) ---
  // KEEP IN SYNC: songStyles.md (repo root) documents every style's rule, price, tunables and simulated strength. When you change style logic, rule text, a price or a style tunable's default, or add or remove a style, update songStyles.md in the same change.
  /** Styles a bard can own at once; buying past this replaces one. */
  maxStyles: number
  /** Number of persistent style offers shown in the Studio. */
  styleOfferCount: number
  /** EXP price of each style. */
  styleCostStaccato: number
  styleCostCoda: number
  styleCostOstinato: number
  styleCostRubato: number
  styleCostVirtuoso: number
  styleCostFortissimo: number
  styleCostFermata: number
  styleCostCounterpoint: number
  styleCostTutti: number
  styleCostOverture: number
  styleCostBravo: number
  styleCostIspirato: number
  /** Fortissimo: added to every d20 roll (can crit). */
  fortissimoBonus: number
  /** Overture: added to the value of your first song each turn (can't crit). */
  overtureBonus: number
  /** Tutti: added to the value of the song for each die rolled while you hold all four elements (can't crit). */
  tuttiBonus: number
  /** Ostinato: lowest d4 face that crits (cascade dice still need a 4). */
  ostinatoCritFace: number
  /** Counterpoint: multiplier on the first immune hit each turn. */
  counterpointMultiplier: number
  /** Bravo: extra Fame per monster tamed. */
  bravoFamePerTame: number
  /** Lingering Note: smallest die (faces) whose missed song isn't spent. */
  fermataMinFaces: number
  /** Rallying Cry: largest die (faces) a refreshed song may hold. */
  staccatoMaxFaces: number
  /** Nimble Fingers: largest die (faces) the free reroll works on. */
  rubatoMaxFaces: number
  /** Master's Touch: smallest die (faces) that rolls twice. */
  virtuosoMinFaces: number
  /** Master's Touch: the largest die (faces) it rolls twice. */
  virtuosoMaxFaces: number
  /** Harmony: distinct elements the setlist must hold. */
  tuttiElements: number
  /** Ending a concert early: 0 = only moved (wounded) monsters level up, 1 = every monster left levels up. */
  retreatLevelsUpAll: number
  /** Muse's Favor: Inspiration topped up to at the start of each turn. */
  ispiratoMin: number
  /** Muse's Favor: Inspiration gained at the start of each turn (after the floor). */
  ispiratoPerTurn: number
  /** Lingering Note: Inspiration paid to keep a missed song (0 = free). */
  fermataInspirationCost: number
  /** War Drums: largest die (faces) whose crit face drops by the same amount as a d4's. */
  ostinatoMaxFaces: number
  /** Nimble Fingers: free rerolls per turn. */
  rubatoUsesPerTurn: number
  /** War Drums: extra charm per crit bonus die from a die it affects. */
  ostinatoCascadeBonus: number
  /** War Drums: bonus dice chain on this face or higher (4 = a d4's top face only). */
  ostinatoChainFace: number
  /** Crowd Favorite: only tames of monsters at this level or higher pay its Fame. */
  bravoMinLevel: number

  // --- Studio styles built from the style lab ---
  styleCostHometownHero: number
  styleCostSteadyHands: number
  styleCostStudioRegular: number
  styleCostInspiredPlay: number
  styleCostStreetPerformer: number
  styleCostChainReaction: number
  styleCostSwarmSinger: number
  styleCostJamSession: number
  /** Hometown Hero: bonus (can crit) to dice of the bard's starting element. */
  hometownHeroBonus: number
  /** Steady Hands: a die that lands below this counts as showing it. */
  steadyHandsFloor: number
  /** Street Performer: EXP gained at the start of each of the bard's turns. */
  streetPerformerExp: number
  /** Studio Regular: EXP off every upgrade. */
  studioRegularDiscount: number
  /** Inspired Play: bonus to every song while holding enough Inspiration. */
  inspiredPlayBonus: number
  inspiredPlayMin: number
  /** Chain Reaction: bonus per same-element song played in a row before this one, and its cap. */
  chainReactionBonus: number
  chainReactionCap: number
  /** Swarm Singer: bonus to every song in fights with enough monsters. */
  swarmSingerBonus: number
  swarmSingerMin: number
  /** Jam Session: bonus to every song while sharing a space with another bard. */
  jamSessionBonus: number
}

export const DEFAULT_TUNABLES: Tunables = {
  fameFinalBossThreshold: 200,
  monsterFameByLevel: [5, 10, 25, 50, 75],
  monsterExpPerLevel: 1,

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
  upgradeCostD12: 2,
  upgradeCostD20: 4,
  inspirationBaseCost: 1,
  inspirationCostStep: 0,
  inspirationSpend: 1,

  elementOfferCount: 4,
  chipsPerElementPerPlayer: 6,

  showdownTurns: 3,

  maxStyles: 2,
  styleOfferCount: 2,
  // Style defaults: changing any of these means updating songStyles.md
  styleCostStaccato: 2,
  styleCostCoda: 1,
  styleCostOstinato: 2,
  styleCostRubato: 1,
  styleCostVirtuoso: 2,
  styleCostFortissimo: 2,
  styleCostFermata: 3,
  styleCostCounterpoint: 2,
  styleCostTutti: 2,
  styleCostOverture: 2,
  styleCostBravo: 3,
  styleCostIspirato: 1,
  fortissimoBonus: 2,
  overtureBonus: 3,
  tuttiBonus: 1,
  ostinatoCritFace: 3,
  counterpointMultiplier: 1,
  bravoFamePerTame: 10,
  fermataMinFaces: 20,
  staccatoMaxFaces: 20,
  rubatoMaxFaces: 20,
  virtuosoMinFaces: 4,
  virtuosoMaxFaces: 12,
  tuttiElements: 4,
  retreatLevelsUpAll: 0,
  ispiratoMin: 1,
  ispiratoPerTurn: 1,
  fermataInspirationCost: 1,
  ostinatoMaxFaces: 20,
  rubatoUsesPerTurn: 1,
  ostinatoCascadeBonus: 0,
  ostinatoChainFace: 4,
  bravoMinLevel: 3,

  styleCostHometownHero: 1,
  styleCostSteadyHands: 1,
  styleCostStudioRegular: 3,
  styleCostInspiredPlay: 3,
  styleCostStreetPerformer: 1,
  styleCostChainReaction: 2,
  styleCostSwarmSinger: 2,
  styleCostJamSession: 3,
  hometownHeroBonus: 1,
  steadyHandsFloor: 3,
  streetPerformerExp: 1,
  studioRegularDiscount: 1,
  inspiredPlayBonus: 2,
  inspiredPlayMin: 3,
  chainReactionBonus: 2,
  chainReactionCap: 6,
  swarmSingerBonus: 1,
  swarmSingerMin: 3,
  jamSessionBonus: 2,
}

// ============================================================
// Field metadata — drives the debug panel's controls
// ============================================================

export type TunableGroup =
  | 'Progression'
  | 'Turn structure'
  | 'Board'
  | 'Monsters'
  | 'Concerts'
  | 'Economy'
  | 'Shop'
  | 'Showdown'
  | 'Styles'

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

  { key: 'maxMovesPerTurn', label: 'Moves per turn', group: 'Turn structure', min: 0, max: 16, step: 1 },
  { key: 'maxFightsPerTurn', label: 'Concerts per turn', group: 'Turn structure', min: 0, max: 10, step: 1 },
  { key: 'roundEndChipsPerElement', label: 'Round-end chips per element', group: 'Turn structure', min: 0, max: 5, step: 1, help: 'At round end every bard is dealt this many chips of each element to place.' },

  { key: 'maxTagsPerGenre', label: 'Max chips per element, per space', group: 'Board', min: 1, max: 20, step: 1, help: 'A space holds any number of chips; only same-element chips are capped.' },
  { key: 'startingTagsPerSpace', label: 'Starting chips per space', group: 'Board', min: 0, max: 10, step: 1, help: 'Applied when a new game starts.' },

  { key: 'maxMonsterLevel', label: 'Max monster level', group: 'Monsters', min: 1, max: 10, step: 1 },
  { key: 'monsterBaseHp', label: 'Base Resolve (Lv.1)', group: 'Monsters', min: 1, max: 100, step: 1, help: 'Every monster spawns from this, times its level multiplier.' },
  { key: 'monsterHpScale', label: 'Monster Resolve scale', group: 'Monsters', min: 0.1, max: 10, step: 0.1, help: 'Global multiplier on spawn Resolve. Lower = faster concerts.' },

  { key: 'vulnerabilityMultiplier', label: 'Weakness multiplier', group: 'Concerts', min: 0, max: 10, step: 0.25 },
  { key: 'resistanceMultiplier', label: 'Immunity multiplier', group: 'Concerts', min: 0, max: 10, step: 0.25 },
  { key: 'retreatLevelsUpAll', label: 'Ending early levels up untouched monsters too (1) or only moved ones (0)', group: 'Concerts', min: 0, max: 1, step: 1 },
  { key: 'maxCritCascades', label: 'Max crit cascades', group: 'Concerts', min: 1, max: 50, step: 1 },

  { key: 'startingInspiration', label: 'Starting Inspiration', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'newD4Cost', label: 'New d4 cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD8', label: 'Upgrade → d8', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'upgradeCostD12', label: 'Upgrade → d12', group: 'Economy', min: 0, max: 30, step: 1 },
  { key: 'upgradeCostD20', label: 'Upgrade → d20', group: 'Economy', min: 0, max: 40, step: 1 },
  { key: 'inspirationBaseCost', label: 'Inspiration base cost', group: 'Economy', min: 0, max: 20, step: 1 },
  { key: 'inspirationCostStep', label: 'Inspiration cost step', group: 'Economy', min: 0, max: 20, step: 1, help: 'Added per Inspiration already bought this turn (0 = always the base cost).' },
  { key: 'inspirationSpend', label: 'Inspiration per use', group: 'Economy', min: 0, max: 10, step: 1 },

  { key: 'elementOfferCount', label: 'Element chips on offer', group: 'Shop', min: 1, max: 12, step: 1 },
  { key: 'chipsPerElementPerPlayer', label: 'Bag chips per element/player', group: 'Shop', min: 1, max: 30, step: 1 },

  { key: 'showdownTurns', label: 'Showdown verses', group: 'Showdown', min: 1, max: 10, step: 1 },

  { key: 'maxStyles', label: 'Styles per bard', group: 'Styles', min: 0, max: 12, step: 1 },
  { key: 'styleOfferCount', label: 'Styles on offer', group: 'Styles', min: 0, max: 12, step: 1 },
  { key: 'styleCostStaccato', label: 'Rallying Cry cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostCoda', label: 'Extra Verse cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostOstinato', label: 'War Drums cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostRubato', label: 'Nimble Fingers cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostVirtuoso', label: 'Master\'s Touch cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostFortissimo', label: 'Dragon\'s Roar cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostFermata', label: 'Lingering Note cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostCounterpoint', label: 'Dissonance cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostTutti', label: 'Harmony cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostOverture', label: 'Fanfare cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostBravo', label: 'Crowd Favorite cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostIspirato', label: 'Muse\'s Favor cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'fortissimoBonus', label: "Dragon's Roar: d20 bonus", group: 'Styles', min: 0, max: 20, step: 1 },
  { key: 'overtureBonus', label: 'Fanfare: first-roll bonus', group: 'Styles', min: 0, max: 20, step: 1 },
  { key: 'tuttiBonus', label: 'Harmony: bonus to the song', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'ostinatoCritFace', label: 'War Drums: d4 crits from', group: 'Styles', min: 1, max: 4, step: 1 },
  { key: 'counterpointMultiplier', label: 'Dissonance: immune ×', group: 'Styles', min: 0, max: 2, step: 0.25 },
  { key: 'bravoFamePerTame', label: 'Crowd Favorite: Fame per monster won over', group: 'Styles', min: 0, max: 20, step: 1 },
  { key: 'fermataMinFaces', label: 'Lingering Note: smallest die (faces)', group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'staccatoMaxFaces', label: 'Rallying Cry: largest refreshed die (faces)', group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'rubatoMaxFaces', label: 'Nimble Fingers: largest die (faces)', group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'virtuosoMinFaces', label: "Master's Touch: smallest die (faces)", group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'virtuosoMaxFaces', label: "Master's Touch: largest die (faces)", group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'tuttiElements', label: 'Harmony: elements needed', group: 'Styles', min: 1, max: 4, step: 1 },
  { key: 'ispiratoMin', label: "Muse's Favor: Inspiration floor", group: 'Styles', min: 0, max: 5, step: 1 },
  { key: 'ispiratoPerTurn', label: "Muse's Favor: Inspiration per turn", group: 'Styles', min: 0, max: 3, step: 1 },
  { key: 'fermataInspirationCost', label: 'Lingering Note: Inspiration per use', group: 'Styles', min: 0, max: 3, step: 1 },
  { key: 'ostinatoMaxFaces', label: 'War Drums: largest die (faces)', group: 'Styles', min: 4, max: 20, step: 4 },
  { key: 'rubatoUsesPerTurn', label: 'Nimble Fingers: free encores per turn', group: 'Styles', min: 1, max: 3, step: 1 },
  { key: 'ostinatoCascadeBonus', label: 'War Drums: bonus per crit die', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'ostinatoChainFace', label: 'War Drums: bonus dice chain from', group: 'Styles', min: 2, max: 20, step: 1 },
  { key: 'bravoMinLevel', label: 'Crowd Favorite: lowest paying level', group: 'Styles', min: 1, max: 5, step: 1 },
  { key: 'styleCostHometownHero', label: 'Hometown Hero cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostSteadyHands', label: 'Steady Hands cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostStudioRegular', label: 'Studio Regular cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostInspiredPlay', label: 'Inspired Play cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostStreetPerformer', label: 'Street Performer cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostChainReaction', label: 'Chain Reaction cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostSwarmSinger', label: 'Swarm Singer cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'styleCostJamSession', label: 'Jam Session cost', group: 'Styles', min: 0, max: 30, step: 1 },
  { key: 'hometownHeroBonus', label: 'Hometown Hero: starting-element bonus', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'steadyHandsFloor', label: 'Steady Hands: lowest a die can show', group: 'Styles', min: 1, max: 12, step: 1 },
  { key: 'streetPerformerExp', label: 'Street Performer: EXP per turn', group: 'Styles', min: 0, max: 5, step: 1 },
  { key: 'studioRegularDiscount', label: 'Studio Regular: EXP off upgrades', group: 'Styles', min: 0, max: 5, step: 1 },
  { key: 'inspiredPlayBonus', label: 'Inspired Play: bonus to the song', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'inspiredPlayMin', label: 'Inspired Play: Inspiration needed', group: 'Styles', min: 1, max: 10, step: 1 },
  { key: 'chainReactionBonus', label: 'Chain Reaction: bonus per link', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'chainReactionCap', label: 'Chain Reaction: bonus cap', group: 'Styles', min: 0, max: 20, step: 1 },
  { key: 'swarmSingerBonus', label: 'Swarm Singer: bonus to the song', group: 'Styles', min: 0, max: 10, step: 1 },
  { key: 'swarmSingerMin', label: 'Swarm Singer: monsters needed', group: 'Styles', min: 2, max: 6, step: 1 },
  { key: 'jamSessionBonus', label: 'Jam Session: bonus to the song', group: 'Styles', min: 0, max: 10, step: 1 },
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
    label: `Resolve × — Lv.${i + 1}`,
    group: 'Monsters' as const,
    min: 0.1,
    max: 25,
    step: 0.25,
  })),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Concerts').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Economy').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Shop').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Showdown').map(toField),
  ...SCALAR_FIELDS.filter((f) => f.group === 'Styles').map(toField),
]

function toField(f: (typeof SCALAR_FIELDS)[number]): TunableField {
  return { path: f.key, label: f.label, group: f.group, min: f.min, max: f.max, step: f.step, help: f.help }
}

export const TUNABLE_GROUPS: TunableGroup[] = [
  'Progression',
  'Turn structure',
  'Board',
  'Monsters',
  'Concerts',
  'Economy',
  'Shop',
  'Showdown',
  'Styles',
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
